import fs from 'fs'
import path from 'path'
import { IGNORE_LIST } from '../constants.js'
import { walkDir } from '../utils/walkDir.js'

/**
 * Escapes special regex characters in a string so it can be safely used
 * inside a RegExp constructor.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Source file extensions to scan for import/require usage. */
const SOURCE_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'])

/**
 * Scans a repository for declared npm dependencies and identifies any that are
 * never imported or required by source files ("dead" dependencies).
 *
 * Algorithm:
 *  1. Parse `<targetPath>/package.json` → extract `dependencies` keys.
 *  2. Walk all non-ignored source files and test each file's content against
 *     import/require patterns for every declared package.
 *  3. Packages with zero matches across all files are considered dead.
 *
 * @param {string} targetPath - Absolute path to the repository root
 * @returns {Promise<{ declared: string[], dead: string[] }>}
 */
export async function scanDependencies(targetPath) {
  // 5.1 Parse package.json; return early if absent
  let declared = []
  try {
    const raw = await fs.promises.readFile(path.join(targetPath, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw)
    declared = Object.keys(pkg.dependencies ?? {})
  } catch {
    return { declared: [], dead: [] }
  }

  if (declared.length === 0) {
    return { declared, dead: [] }
  }

  // 5.2 Walk source files and track which packages are used
  const usedPackages = new Set()

  // Pre-build RegExp patterns for each package once (avoids re-compiling per file).
  // importRe  matches:  from 'pkg'  or  from 'pkg/subpath'  or  import 'pkg/subpath'
  // requireRe matches:  require('pkg')  or  require('pkg/subpath')
  const patterns = declared.map(pkg => ({
    pkg,
    importRe: new RegExp("['\"]" + escapeRegex(pkg) + "(?:[/'\"]|$)"),
    requireRe: new RegExp("require\\(['\"]" + escapeRegex(pkg) + "(?:[/'\"]|$)"),
  }))

  for await (const file of walkDir(targetPath, IGNORE_LIST)) {
    const ext = path.extname(file)
    if (!SOURCE_EXTENSIONS.has(ext)) {
      continue
    }

    let content
    try {
      content = await fs.promises.readFile(file, 'utf8')
    } catch {
      continue
    }

    for (const { pkg, importRe, requireRe } of patterns) {
      if (usedPackages.has(pkg)) {
        // Already confirmed used — skip further checks for this package
        continue
      }
      if (importRe.test(content) || requireRe.test(content)) {
        usedPackages.add(pkg)
      }
    }
  }

  // 5.3 Dead list: declared packages not found in any source file
  const dead = declared.filter(pkg => !usedPackages.has(pkg))

  // 5.4 Return result
  return { declared, dead }
}
