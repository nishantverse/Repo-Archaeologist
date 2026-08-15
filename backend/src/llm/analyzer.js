import fs from 'fs'
import path from 'path'
import Groq from 'groq-sdk'
import { LLM_MODEL, LLM_TOKEN_BUDGET, FALLBACK_FLOWS, IGNORE_LIST } from '../constants.js'
import { walkDir } from '../utils/walkDir.js'

// Source file extensions worth reading for code context
const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.rb', '.php',
  '.json', '.yaml', '.yml', '.toml', '.env.example',
  '.md',
])

// Files that give maximum signal, read these first
const HIGH_PRIORITY_NAMES = new Set([
  'package.json', 'README.md', 'readme.md',
  'index.js', 'index.ts', 'main.py', 'app.py',
  'server.js', 'server.ts', 'app.js', 'app.ts',
  'docker-compose.yml', 'Dockerfile',
  '.env.example',
])

const SYSTEM_PROMPT = `You are an expert software engineer doing a codebase onboarding review.
You will be given the actual source files from a repository.
Based on what you read:
1. Infer the end-to-end data flow as a short array of component names (e.g. ["Browser", "React App", "REST API", "Database"]).
2. Write a 3-4 sentence human onboarding summary: what the project does, how it is structured, and the key things a new engineer needs to know.
3. List 2-3 essential architectural constraints or conventions an AI coding agent must follow when working in this repo.

YOU MUST respond with ONLY a raw JSON object. No explanation, no markdown fences, no text before or after the JSON.
Example of the exact format required:
{"flow":["Browser","React App","REST API"],"humanSummary":"This is a React app built with Vite. It uses Tailwind for styling.","constraints":["Always use TypeScript","Follow ESM import style"]}`

/**
 * Collects source files from targetPath, sorted so high-priority files come first,
 * then packs as many as fit within the token budget.
 *
 * @param {string} targetPath
 * @param {number} tokenBudget  - rough token limit (1 token ≈ 4 chars)
 * @returns {Promise<string>}   - formatted multi-file context string
 */
async function buildCodeContext(targetPath, tokenBudget) {
  const charBudget = tokenBudget * 4

  // Collect all candidate files
  const allFiles = []
  for await (const filePath of walkDir(targetPath, IGNORE_LIST)) {
    const ext = path.extname(filePath).toLowerCase()
    const name = path.basename(filePath)
    if (CODE_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(name)) {
      allFiles.push(filePath)
    }
  }

  // Sort: high-priority names first, then by file size ascending (small files pack better)
  const stats = await Promise.all(
    allFiles.map(async (f) => {
      try {
        const s = await fs.promises.stat(f)
        return { path: f, size: s.size }
      } catch {
        return { path: f, size: Infinity }
      }
    })
  )

  stats.sort((a, b) => {
    const aHigh = HIGH_PRIORITY_NAMES.has(path.basename(a.path)) ? 0 : 1
    const bHigh = HIGH_PRIORITY_NAMES.has(path.basename(b.path)) ? 0 : 1
    if (aHigh !== bHigh) return aHigh - bHigh
    return a.size - b.size
  })

  // Pack files until budget is exhausted
  const chunks = []
  let usedChars = 0

  for (const { path: filePath } of stats) {
    if (usedChars >= charBudget) break

    let content
    try {
      content = await fs.promises.readFile(filePath, 'utf8')
    } catch {
      continue // skip binary or unreadable files
    }

    const relPath = path.relative(targetPath, filePath)
    const header = `\n\n### ${relPath}\n\`\`\`\n`
    const footer = '\n```'
    const block = header + content + footer

    if (usedChars + block.length > charBudget) {
      // Try to fit a truncated version
      const available = charBudget - usedChars - header.length - footer.length - 40
      if (available < 200) break
      const truncated = header + content.slice(0, available) + '\n... (truncated)' + footer
      chunks.push(truncated)
      usedChars += truncated.length
      break
    }

    chunks.push(block)
    usedChars += block.length
  }

  const approxTokens = Math.round(usedChars / 4)
  const fileCount = chunks.length
  return `Repository: ${path.basename(targetPath)}
Files included: ${fileCount} (≈${approxTokens} tokens)
${chunks.join('')}`
}

/**
 * Generates deterministic fallback output when no LLM is available.
 */
function generateFallback({ entrypoint }) {
  const fw = entrypoint.framework
  const flow = FALLBACK_FLOWS[fw] ?? FALLBACK_FLOWS['Unknown']

  const humanSummary = `This is a ${fw} application with ${entrypoint.dependencies.length} declared dependencies. Review the entrypoint at ${entrypoint.entrypoint ?? 'the project root'} to understand the startup sequence.`

  const constraints = [
    `Follow the ${fw} conventions for project structure and routing.`,
    'Avoid modifying files in the ignore list (node_modules, dist, .git).',
    'Preserve existing API contracts when refactoring.',
  ]

  return { flow, humanSummary, constraints, fallbackUsed: true }
}

/**
 * Validates and normalises the LLM JSON response.
 * Coerces string fields to single-element arrays when the model returns
 * the wrong type (common with small models), and filters out placeholder
 * values like "string" that some models echo from the schema.
 */
function normaliseResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') return null

  // Coerce flow to array and strip schema-echo placeholders
  if (typeof parsed.flow === 'string') {
    parsed.flow = parsed.flow.split(/[→,\n]/).map(s => s.trim()).filter(Boolean)
  }
  if (Array.isArray(parsed.flow)) {
    parsed.flow = parsed.flow.filter(s => s !== 'string' && s.trim().length > 0)
  }
  // If model returned an empty flow, fall back to a generic default rather than rejecting
  if (!Array.isArray(parsed.flow) || parsed.flow.length === 0) {
    parsed.flow = ['Client', 'Application', 'Database']
  }

  // Coerce constraints to array and strip schema-echo placeholders
  if (typeof parsed.constraints === 'string') {
    parsed.constraints = parsed.constraints.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  }
  if (Array.isArray(parsed.constraints)) {
    parsed.constraints = parsed.constraints.filter(s => s !== 'string' && s.trim().length > 0)
  }
  // If model returned empty constraints, use a generic default
  if (!Array.isArray(parsed.constraints) || parsed.constraints.length === 0) {
    parsed.constraints = ['Follow existing project conventions.']
  }

  if (typeof parsed.humanSummary !== 'string' || parsed.humanSummary.length === 0) return null

  return parsed
}

/**
 * Strips markdown code fences and extracts the first JSON object from a string.
 * Handles models that wrap JSON in prose or code fences.
 */
function extractJSON(text) {
  // First try: strip fences and parse directly
  const stripped = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()
  try {
    return JSON.parse(stripped)
  } catch { /* fall through */ }

  // Second try: find the first { ... } block in the response
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch { /* fall through */ }
  }

  throw new Error('Could not extract valid JSON from LLM response')
}

/**
 * Calls the Groq cloud API.
 */
async function callGroq(userMsg) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const model = process.env.GROQ_MODEL || LLM_MODEL
  const groq = new Groq({ apiKey })

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
  })

  const content = completion.choices?.[0]?.message?.content ?? ''
  const parsed = normaliseResponse(extractJSON(content))
  if (!parsed) throw new Error('LLM response missing required fields or wrong types')
  return { flow: parsed.flow, humanSummary: parsed.humanSummary, constraints: parsed.constraints, fallbackUsed: false }
}

/**
 * Calls a local Ollama instance.
 */
async function callOllama(userMsg) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')
  const model = process.env.OLLAMA_MODEL || 'llama3'

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content = data?.message?.content ?? ''
  const parsed = normaliseResponse(extractJSON(content))
  if (!parsed) throw new Error('LLM response missing required fields or wrong types')
  return { flow: parsed.flow, humanSummary: parsed.humanSummary, constraints: parsed.constraints, fallbackUsed: false }
}

/**
 * Reads the actual codebase from targetPath and sends it to the configured LLM
 * for a full architecture summary.
 *
 * Token budget is read from LLM_CONTEXT_TOKENS env var (default: 6000).
 *
 * @param {{ entrypoint: object, techDebt: object, deps: object, targetPath: string }} scanResults
 * @returns {Promise<{ flow: string[], humanSummary: string, constraints: string[], fallbackUsed: boolean }>}
 */
export async function analyzeLLM(scanResults) {
  const { entrypoint, targetPath } = scanResults
  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase()

  const canTryGroq = provider === 'groq' && !!process.env.GROQ_API_KEY
  const canTryOllama = provider === 'ollama'

  if (!canTryGroq && !canTryOllama) {
    if (provider === 'groq') {
      console.warn('Warning: LLM_PROVIDER=groq but GROQ_API_KEY is not set — using deterministic fallback.')
    }
    return generateFallback({ entrypoint })
  }

  const tokenBudget = parseInt(process.env.LLM_CONTEXT_TOKENS || '6000', 10)

  console.log(`  → Reading codebase for LLM context (budget: ~${tokenBudget} tokens)...`)
  const userMsg = await buildCodeContext(targetPath, tokenBudget)

  try {
    if (provider === 'ollama') {
      return await callOllama(userMsg)
    } else {
      return await callGroq(userMsg)
    }
  } catch (err) {
    console.warn(`Warning: LLM synthesis failed (${provider}), using deterministic fallback. ${err.message}`)
    return generateFallback({ entrypoint })
  }
}
