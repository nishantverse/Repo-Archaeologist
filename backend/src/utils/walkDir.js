import fs from 'fs'

/**
 * Async generator that recursively walks a directory tree.
 * Yields absolute file paths, skipping any entry whose name is in ignoreList.
 *
 * @param {string} dir - Absolute path to the directory to walk
 * @param {string[]} ignoreList - Directory/file names to skip
 * @yields {string} Absolute file path
 */
export async function* walkDir(dir, ignoreList) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (ignoreList.includes(entry.name)) {
      continue
    }

    const fullPath = `${dir}/${entry.name}`

    if (entry.isDirectory()) {
      yield* walkDir(fullPath, ignoreList)
    } else if (entry.isFile()) {
      yield fullPath
    }
  }
}
