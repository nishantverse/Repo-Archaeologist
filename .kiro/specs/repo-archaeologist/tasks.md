# Implementation Tasks

## Overview

Tasks are ordered sequentially. Each task maps directly to one or more requirements. Complete them in order — later tasks depend on earlier ones.

---

## Task 1: Initialize the Package

**Requirements:** R1 (CLI Entrypoint)

### Steps

- [x] 1.1 Create `/home/nishant/kiro-hackathon/backend/` directory structure:
  ```
  bin/
  src/heuristics/
  src/llm/
  src/output/
  src/server/
  src/utils/
  ```
- [x] 1.2 Create `package.json` with:
  - `"name": "repo-archaeologist"`
  - `"type": "module"` (pure ESM)
  - `"bin": { "repo-archaeologist": "./bin/index.js" }`
  - Node.js engine requirement: `">=18"`
  - Dependencies: `boxen`, `groq-sdk`, `express`, `get-port`
- [x] 1.3 Create `src/constants.js` exporting:
  - `IGNORE_LIST` array
  - `FALLBACK_FILES` array
  - `FRAMEWORK_MAP` object
  - `MEGAFILE_THRESHOLD` (500)
  - `LLM_MODEL` (`'llama-3.2-1b-preview'`)
  - `LLM_TOKEN_BUDGET` (500)
  - `FALLBACK_FLOWS` object with entries for Express, Next.js, NestJS, FastAPI, React, Unknown
- [x] 1.4 Run `npm install` in the package directory to install all dependencies

---

## Task 2: Implement the Directory Walker Utility

**Requirements:** R2 (Ignored Folder Enforcement), R4 (MegaFile Detection), R5 (TODO Detection), R6 (Dead Dependency Detection)

### Steps

- [x] 2.1 Create `src/utils/walkDir.js` implementing `async function* walkDir(dir, ignoreList)`:
  - Use `fs.promises.readdir` with `{ withFileTypes: true }` for each directory
  - Skip any entry whose `name` is in `ignoreList`
  - Yield absolute file paths for files
  - Recurse into subdirectories
- [x] 2.2 Write a manual smoke test by calling `walkDir` on the repo-archaeologist package directory itself and logging 5 paths to verify ignore list works

---

## Task 3: Implement Entrypoint & Stack Detector

**Requirements:** R3 (Entrypoint and Stack Detection)

### Steps

- [x] 3.1 Create `src/heuristics/entrypoint.js` exporting `async function detectEntrypoint(targetPath)`:
  - Attempt `fs.promises.readFile('<targetPath>/package.json', 'utf8')` in a try/catch
  - Parse JSON; extract `main`, `scripts.start`, `scripts.dev`, `dependencies`
  - Return first non-null/non-empty value from `[main, scripts.start, scripts.dev]` as `entrypoint`
  - Iterate `FRAMEWORK_MAP` keys against `Object.keys(dependencies)`; return first match as `framework`
- [x] 3.2 Implement fallback file detection:
    - If `dead` non-empty: comma-joined list
    - If empty: `✓ All dependencies are in use`
  - **Constraints section:** numbered list of constraints

- [x] 7.3 If `payload.fallbackUsed` is true, prepend:
  ```
  ⚠  No GROQ_API_KEY found — using deterministic fallback
  ```

- [x] 7.4 Wrap assembled content in `boxen(content, { title: 'REPO ARCHAEOLOGIST', borderStyle: 'double', padding: 1 })` and `console.log` the result

---
  - If `package.json` missing or `entrypoint` is still null after parsing, iterate `FALLBACK_FILES`
  - For each, call `fs.promises.access('<targetPath>/<file>')` — first success wins
- [x] 3.3 Return structured object: `{ entrypoint, framework, dependencies: string[], scripts }`
  - Default `framework` to `'Unknown'` if no match found
  - Default `dependencies` to `[]` if no `package.json`

---

## Task 4: Implement Tech Debt Detector

**Requirements:** R4 (MegaFile Detection), R5 (TODO Detection)

### Steps

- [x] 4.1 Create `src/heuristics/techDebt.js` exporting `async function detectTechDebt(targetPath)`:
  - Determine scan root: use `<targetPath>/src` if it exists, else `targetPath`
  - Use `walkDir` from Task 2 to iterate all files under scan root

- [x] 4.2 Implement MegaFile detection:
  - For each file, read content with `fs.promises.readFile(file, 'utf8')`
  - Count lines by splitting on `\n` and checking length against `MEGAFILE_THRESHOLD`
  - Push `{ path: relative(targetPath, file), lines }` to `megaFiles` array

- [x] 4.3 Implement TODO comment detection:
  - For each file, scan lines for `/\/\/ TODO/` or `/# TODO/` (use `line.includes('// TODO') || line.includes('# TODO')`)
  - Record `{ file: relative(targetPath, file), line: lineNumber, text: trimmedLine }`

- [x] 4.4 Implement git age lookup:
  - Use `child_process.execFile('git', ['-C', targetPath, 'log', '-S', 'TODO', '--diff-filter=A', '--format=%ai', '--', file])` wrapped in a Promise
  - Parse first line of stdout as age string
  - On any error or empty output, use `(await fs.promises.stat(file)).mtime.toISOString()` as fallback
  - Attach `age` field to each TODO entry

- [x] 4.5 Return `{ megaFiles, todos }`

---

## Task 5: Implement Dead Dependency Scanner

**Requirements:** R6 (Dead Dependency Detection)

### Steps

- [x] 5.1 Create `src/heuristics/deps.js` exporting `async function scanDependencies(targetPath)`:
  - Parse `package.json` to extract `dependencies` keys → `declared` array
  - If `package.json` absent, return `{ declared: [], dead: [] }`

- [x] 5.2 Implement usage scan:
  - Use `walkDir` to iterate all non-ignored files with extensions matching `['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']`
  - For each file, read content as string
  - For each package name in `declared`, test content against:
    - `new RegExp("from ['\"]" + escapeRegex(pkg))` 
    - `new RegExp("require\\(['\"]" + escapeRegex(pkg))`
  - Track a `Set` of packages that had at least one match

- [x] 5.3 Compute dead list: packages in `declared` not in the matched set → `dead` array
- [x] 5.4 Return `{ declared, dead }`

---

## Task 6: Implement LLM Synthesis Layer

**Requirements:** R7 (LLM Synthesis), R8 (Deterministic Fallback)

### Steps

- [x] 6.1 Create `src/llm/analyzer.js` exporting `async function analyzeLLM(scanResults)`:

- [x] 6.2 Implement token budget message builder:
  - Function `buildUserMessage({ entrypoint, techDebt, deps })` returning a compact string
  - Include: entrypoint path, framework, top 20 dependency names, top 5 mega-file paths
  - Add a rough token guard: if `message.length / 4 > LLM_TOKEN_BUDGET`, truncate dependency list

- [x] 6.3 Implement Groq API path:
  - Check `process.env.GROQ_API_KEY`; if absent, skip to fallback
  - Construct `Groq` client from `groq-sdk`
  - Call `groq.chat.completions.create` with:
    - `model: LLM_MODEL`
    - `messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }]`
  - Parse response content as JSON
  - Validate `flow`, `humanSummary`, `constraints` fields exist with correct types
  - On any failure (network error, JSON parse error, schema mismatch), fall through to fallback with a `console.warn`

- [x] 6.4 Implement deterministic fallback:
  - Function `generateFallback({ entrypoint })` using `FALLBACK_FLOWS` keyed by `framework`
  - Build `humanSummary` template incorporating framework name and dependency count
  - Build `constraints` as a 3-item array with framework-appropriate rules
  - Return `{ flow, humanSummary, constraints, fallbackUsed: true }`

- [x] 6.5 Return `{ flow, humanSummary, constraints, fallbackUsed }` from `analyzeLLM`

---

## Task 7: Implement Terminal Output Renderer

**Requirements:** R9 (Terminal Output with Boxen)

### Steps

- [x] 7.1 Create `src/output/terminal.js` exporting `function renderTerminal(payload)`:
  - Import `boxen` (default import)

- [x] 7.2 Build the content string in sections:
  - **Stack section:** `Framework: <framework>  |  Entrypoint: <entrypoint>`
  - **Flow section:** `Data Flow: <flow[0]> → <flow[1]> → ...`
  - **Onboarding section:** header + `humanSummary` text
  - **Tech debt section:** 
    - If `megaFiles` non-empty: list each as `• <path> (<lines> lines)` 
    - If `todos` non-empty: list each as `• <file>:<line> — TODO (age: <age>)`
    - If both empty: `✓ No tech debt detected`
  - **Dead deps section:**
    - If `dead` non-empty: comma-joined list
    - If empty: `✓ All dependencies are in use`
  - **Constraints section:** numbered list of constraints


    - If `dead` non-empty: comma-joined list
    - If empty: `✓ All dependencies are in use`
  - **Constraints section:** numbered list of constraints

- [x] 7.3 If `payload.fallbackUsed` is true, prepend:
  ```
  ⚠  No GROQ_API_KEY found — using deterministic fallback
  ```

- [x] 7.4 Wrap assembled content in `boxen(content, { title: 'REPO ARCHAEOLOGIST', borderStyle: 'double', padding: 1 })` and `console.log` the result

---- [x] 7.3 If `payload.fallbackUsed` is true, prepend:
  ```
  ⚠  No GROQ_API_KEY found — using deterministic fallback
  ```

- [x] 7.4 Wrap assembled content in `boxen(content, { title: 'REPO ARCHAEOLOGIST', borderStyle: 'double', padding: 1 })` and `console.log` the result

---

## Task 8: Implement Steering File Writer

**Requirements:** R10 (Steering File Generation)

### Steps

- [x] 8.1 Create `src/output/steeringFile.js` exporting `async function writeSteeringFile(targetPath, payload)`:

- [x] 8.2 Compute output path: `path.join(targetPath, '.kiro', 'steering', 'archaeology.md')`

- [x] 8.3 Build Markdown content string:
  - YAML front matter: `---\ninclusion: auto\n---\n`
  - `# Repository Architecture (Generated by Repo Archaeologist)\n`
  - `## Data Flow` section: `flow.join(' → ')`
  - `## Onboarding Summary` section: `humanSummary`
  - `## Tech Debt` section with `### Large Files` and `### Outstanding TODOs` subsections
  - `## Dead Dependencies` section: bulleted list or "None detected"
  - `## Architectural Constraints` section: numbered list
  - Footer: `*Generated by repo-archaeologist on <new Date().toISOString()>*`

- [x] 8.4 Ensure directory exists: `fs.promises.mkdir(path.dirname(outputPath), { recursive: true })`

- [x] 8.5 Write file: `fs.promises.writeFile(outputPath, content, 'utf8')`

- [x] 8.6 Wrap entire function body in try/catch — on error, `console.warn('Warning: could not write steering file:', err.message)` and return without throwing

---

## Task 9: Implement the Ephemeral UI Server

**Requirements:** R11 (UI Server)

### Steps

- [x] 9.1 Create `src/server/uiServer.js` exporting `async function startUIServer(payload)`:

- [x] 9.2 Find an available port:
  - Import `getPort` from `get-port`
  - Call `await getPort()` to get a free port

- [x] 9.3 Set up Express app:
  - `import express from 'express'`
  - Create app
  - Mount `GET /api/analysis`:
    - Set `res.setHeader('Access-Control-Allow-Origin', '*')`
    - `res.json(payload)`
  - Start server: `const server = app.listen(port)`

- [x] 9.4 Print URL: `console.log(\`\n🔍 UI Server running at: http://localhost:${port}\n\`)`

- [x] 9.5 Register graceful shutdown:
  ```js
  const shutdown = () => { server.close(() => process.exit(0)) }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  ```

---

## Task 10: Implement the CLI Orchestrator

**Requirements:** R1 (CLI), R2 (Ignore list), all other requirements (orchestration)

### Steps

- [x] 10.1 Create `bin/index.js` with shebang line: `#!/usr/bin/env node`

- [x] 10.2 Implement argument parsing (no external library needed):
  - Filter `process.argv.slice(2)` for `--ui` flag (set boolean)
  - Remaining first non-flag argument is the path (default: `'.'`)

- [x] 10.3 Resolve and validate the target path:
  - `path.resolve(rawPath)` to get absolute path
  - `fs.promises.stat(resolvedPath)` → verify `stat.isDirectory()`
  - On failure (ENOENT or not a directory): `console.error(...)` and `process.exit(1)`

- [x] 10.4 Orchestrate the pipeline:
  ```js
  const [entrypoint, techDebt, deps] = await Promise.all([
    detectEntrypoint(targetPath),
    detectTechDebt(targetPath),
    scanDependencies(targetPath),
  ])
  const llmResult = await analyzeLLM({ entrypoint, techDebt, deps })
  const payload = { entrypoint, techDebt, deps, ...llmResult }
  ```

- [x] 10.5 Call output modules:
  ```js
  renderTerminal(payload)
  await writeSteeringFile(targetPath, payload)
  ```

- [x] 10.6 Conditionally start UI server:
  ```js
  if (args.ui) {
    await startUIServer(payload)
  }
  ```

- [x] 10.7 Mark `bin/index.js` as executable: `chmod +x bin/index.js` (or set in package.json `bin` field which `npm link` handles)

---

## Task 11: Integration Smoke Test

**Requirements:** All

### Steps

- [x] 11.1 Run `npm link` (or `npm install -g .`) in the package directory to register the binary locally
- [x] 11.2 Run `repo-archaeologist .` inside the `repo-archaeologist` package directory itself and verify:
  - Boxen output is rendered in terminal
  - `flow`, `humanSummary`, and `constraints` are populated (fallback values if no API key)
  - `⚠ No GROQ_API_KEY found` notice appears when key is absent
  - `.kiro/steering/archaeology.md` is created in the target directory
- [x] 11.3 Run `repo-archaeologist . --ui` and verify:
  - Server URL is printed
  - `curl http://localhost:<port>/api/analysis` returns valid JSON payload
  - CORS header `Access-Control-Allow-Origin: *` is present in the response
- [x] 11.4 Run `repo-archaeologist /nonexistent/path` and verify exit code is `1` with an error message
- [x] 11.5 Run `repo-archaeologist` against the `frontend` directory (`/home/nishant/kiro-hackathon/frontend`) and verify:
  - React framework is detected
  - `tailwindcss` dead dependency check runs (it may or may not be flagged depending on usage)
  - No crash when `src/App.tsx` is the only source file
