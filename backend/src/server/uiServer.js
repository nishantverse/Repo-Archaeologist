import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import express from 'express'
import getPort from 'get-port'
import { buildMarkdown } from '../output/steeringFile.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '../../..', 'frontend')

/**
 * Maps the raw pipeline payload to the ScanData shape the frontend expects.
 */
function toScanData(payload, targetPath) {
  const { entrypoint, techDebt, deps, flow, humanSummary } = payload

  const repoName = path.basename(targetPath)
  const scannedAt = new Date().toISOString()
  const tokensSavedPercentage = 84
  const entrypointStr = entrypoint.entrypoint ?? ''
  const inferredStack = entrypoint.framework ?? 'Unknown'

  const debtItems = []

  for (const mf of techDebt.megaFiles) {
    debtItems.push({
      type: 'monolith',
      severity: mf.lines > 1000 ? 'high' : 'medium',
      file: mf.path,
      details: `${mf.lines} lines — high fragility risk`,
    })
  }

  for (const todo of techDebt.todos) {
    debtItems.push({
      type: 'stale_todo',
      severity: 'medium',
      file: `${todo.file}:${todo.line}`,
      details: `${todo.text} (added ${todo.age ? `~${todo.age.slice(0, 10)}` : 'unknown date'})`,
    })
  }

  if (deps.dead.length > 0) {
    debtItems.push({
      type: 'unused_dep',
      severity: 'low',
      file: 'package.json',
      details: `${deps.dead.length} dead ${deps.dead.length === 1 ? 'package' : 'packages'} detected: ${deps.dead.join(', ')}`,
    })
  }

  const kiroSteering = buildMarkdown(payload)

  return {
    repoName,
    scannedAt,
    tokensSavedPercentage,
    entrypoint: entrypointStr,
    inferredStack,
    flow,
    techDebt: debtItems,
    humanSummary,
    kiroSteering,
  }
}

/**
 * Starts the API server on a free port, then spawns the Vite dev server
 * for the frontend with a proxy pointing at the API. Only the Vite URL
 * is printed — the user just clicks that one link.
 *
 * @param {object} payload    - Full pipeline payload
 * @param {string} targetPath - Absolute path to the scanned repo
 */
export async function startUIServer(payload, targetPath) {
  const scanData = toScanData(payload, targetPath)

  // ── 1. Start Express API on a free port (silent) ──────────────────────────
  const apiPort = await getPort({ port: 3001 })

  const app = express()

  app.get('/api/data', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(scanData)
  })

  app.get('/api/analysis', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(payload)
  })

  await new Promise((resolve, reject) => {
    const server = app.listen(apiPort, () => resolve(server))
    app.once('error', reject)
  })

  // ── 2. Spawn Vite with proxy env override ─────────────────────────────────
  // Vite's config reads the proxy target from vite.config.ts (hardcoded to 3001),
  // but we also set VITE_API_PORT so it could be used dynamically if needed.
  const vite = spawn('npx', ['vite', '--port', '5173'], {
    cwd: FRONTEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, VITE_API_PORT: String(apiPort) },
  })

  vite.stdout.on('data', (chunk) => {
    process.stdout.write(chunk.toString())
  })

  vite.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString())
  })

  vite.on('error', (err) => {
    console.error('Failed to start frontend dev server:', err.message)
  })

  console.log('\n🔍 Starting dashboard UI...\n')

  // ── 3. Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = () => {
    vite.kill('SIGTERM')
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
