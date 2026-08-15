import fs from 'fs'
import path from 'path'
import { FRAMEWORK_MAP, FALLBACK_FILES } from '../constants.js'

/**
 * Detects the entrypoint file and tech stack for a target repository.
 *
 * @param {string} targetPath - Absolute path to the repository root
 * @returns {Promise<{
 *   entrypoint: string | null,
 *   framework: string,
 *   dependencies: string[],
 *   scripts: Record<string, string>,
 * }>}
 */
export async function detectEntrypoint(targetPath) {
  let entrypoint = null
  let framework = 'Unknown'
  let dependencies = []
  let scripts = {}

  // --- Task 3.1: Parse package.json ---
  try {
    const raw = await fs.promises.readFile(path.join(targetPath, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw)

    scripts = pkg.scripts ?? {}
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    dependencies = Object.keys(deps)

    // First non-null/non-empty value wins as the entrypoint
    const candidates = [pkg.main, scripts.start, scripts.dev]
    for (const candidate of candidates) {
      if (candidate && candidate.trim() !== '') {
        entrypoint = candidate.trim()
        break
      }
    }

    // Detect framework: first key in FRAMEWORK_MAP found in dependencies
    for (const [depName, frameworkName] of Object.entries(FRAMEWORK_MAP)) {
      if (dependencies.includes(depName)) {
        framework = frameworkName
        break
      }
    }
  } catch {
    // package.json missing or unreadable — fall through to file-based fallback
  }

  // --- Task 3.2: Fallback file detection ---
  if (entrypoint === null) {
    for (const file of FALLBACK_FILES) {
      try {
        await fs.promises.access(path.join(targetPath, file))
        entrypoint = file
        break
      } catch {
        // file doesn't exist, try the next one
      }
    }
  }

  // --- Task 3.3: Return structured object ---
  return { entrypoint, framework, dependencies, scripts }
}
