import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { IGNORE_LIST, MEGAFILE_THRESHOLD } from '../constants.js'
import { walkDir } from '../utils/walkDir.js'

/**
 * Wraps child_process.execFile in a Promise.
 * Resolves with stdout string, rejects on non-zero exit or error.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<string>}
 */
function execFileAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 * Looks up when a TODO was first introduced in git history.
 * Falls back to the file's mtime if git is unavailable or produces no output.
 *
 * @param {string} targetPath - Root of the repository
 * @param {string} file - Absolute path to the file
 * @returns {Promise<string>} ISO date string
 */
async function getGitAge(targetPath, file) {
  try {
    const stdout = await execFileAsync('git', [
      '-C', targetPath,
      'log',
      '-S', 'TODO',
      '--diff-filter=A',
      '--format=%ai',
      '--',
      file,
    ])
    const firstLine = stdout.trim().split('\n')[0]
    if (firstLine) {
      return firstLine
    }
  } catch {
    // fall through to stat fallback
  }

  // Fallback: file modification time
  const stat = await fs.promises.stat(file)
  return stat.mtime.toISOString()
}

/**
 * Detects tech debt in a repository:
 *   - MegaFiles: source files with more than MEGAFILE_THRESHOLD lines
 *   - TODOs: lines containing `// TODO` or `# TODO`, annotated with git age
 *
 * @param {string} targetPath - Absolute path to the repository root
 * @returns {Promise<{ megaFiles: Array<{path: string, lines: number}>, todos: Array<{file: string, line: number, text: string, age: string}> }>}
 */
export async function detectTechDebt(targetPath) {
  // 4.1 Determine scan root
  let scanRoot = targetPath
  try {
    await fs.promises.access(path.join(targetPath, 'src'))
    scanRoot = path.join(targetPath, 'src')
  } catch {
    // no src directory — scan from targetPath
  }

  const megaFiles = []
  const todos = []

  // 4.1 Walk the scan root, respecting IGNORE_LIST
  for await (const file of walkDir(scanRoot, IGNORE_LIST)) {
    let content
    try {
      content = await fs.promises.readFile(file, 'utf8')
    } catch {
      // skip unreadable files (e.g. binaries)
      continue
    }

    const lines = content.split('\n')

    // 4.2 MegaFile detection
    if (lines.length > MEGAFILE_THRESHOLD) {
      megaFiles.push({
        path: path.relative(targetPath, file),
        lines: lines.length,
      })
    }

    // 4.3 TODO comment detection
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('// TODO') || line.includes('# TODO')) {
        todos.push({
          file: path.relative(targetPath, file),
          line: i + 1,           // 1-indexed line number
          text: line.trim(),
          age: null,             // filled in below
        })
      }
    }
  }

  // 4.4 Git age lookup — done after walking to avoid nested async generators
  for (const todo of todos) {
    const absoluteFile = path.join(targetPath, todo.file)
    todo.age = await getGitAge(targetPath, absoluteFile)
  }

  // 4.5 Return results
  return { megaFiles, todos }
}
