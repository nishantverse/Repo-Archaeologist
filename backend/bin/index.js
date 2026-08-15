#!/usr/bin/env node

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

// Load .env from the package directory regardless of where the CLI is invoked from
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { config } = createRequire(import.meta.url)('dotenv')
config({ path: path.resolve(__dirname, '../.env') })

import { detectEntrypoint } from '../src/heuristics/entrypoint.js'
import { detectTechDebt } from '../src/heuristics/techDebt.js'
import { scanDependencies } from '../src/heuristics/deps.js'
import { analyzeLLM } from '../src/llm/analyzer.js'
import { renderTerminal } from '../src/output/terminal.js'
import { writeSteeringFile } from '../src/output/steeringFile.js'
import { startUIServer } from '../src/server/uiServer.js'

// ── 10.2 Argument parsing ────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const args = {
  ui: false,
  path: '.',
}

for (const arg of argv) {
  if (arg === '--ui') {
    args.ui = true
  } else if (!arg.startsWith('-')) {
    args.path = arg
  }
}

// ── 10.3 Resolve and validate target path ───────────────────────────────────
const targetPath = path.resolve(args.path)

try {
  const stat = await fs.promises.stat(targetPath)
  if (!stat.isDirectory()) {
    console.error(`Error: "${targetPath}" is not a directory.`)
    process.exit(1)
  }
} catch (err) {
  console.error(`Error: "${targetPath}" does not exist or cannot be accessed.`)
  process.exit(1)
}

// ── 10.4 Orchestrate the pipeline ───────────────────────────────────────────
const [entrypoint, techDebt, deps] = await Promise.all([
  detectEntrypoint(targetPath),
  detectTechDebt(targetPath),
  scanDependencies(targetPath),
])

const llmResult = await analyzeLLM({ entrypoint, techDebt, deps, targetPath })

const payload = { entrypoint, techDebt, deps, ...llmResult }

// ── 10.5 Call output modules ─────────────────────────────────────────────────
renderTerminal(payload)
await writeSteeringFile(targetPath, payload)

// ── 10.6 Conditionally start UI server ──────────────────────────────────────
if (args.ui) {
  await startUIServer(payload)
}
