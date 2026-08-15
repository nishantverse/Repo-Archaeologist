# Design Document

## Overview

Repo Archaeologist is a Node.js CLI package structured as a pipeline: the CLI orchestrates the heuristics engine, pipes results into the LLM synthesis layer, writes output artifacts (terminal + steering file), and optionally starts an ephemeral Express server. The architecture is intentionally flat and dependency-light — no build step, no configuration files, pure ESM modules.

---

## Architecture

```
npx repo-archaeologist [path] [--ui]
         │
         ▼
   bin/index.js  (CLI orchestrator)
         │
         ├──► src/heuristics/entrypoint.js  →─┐
         ├──► src/heuristics/techDebt.js    →─┤  AnalysisPayload
         ├──► src/heuristics/deps.js        →─┘
         │                                      │
         ▼                                      ▼
   src/llm/analyzer.js  (Groq or fallback)
         │
         ├──► src/output/terminal.js   (boxen rendering)
         ├──► src/output/steeringFile.js (write .kiro/steering/archaeology.md)
         └──► src/server/uiServer.js   (optional: Express server with /api/analysis)
```

### Key Design Decisions

1. **Pure ESM (`"type": "module"`)** — all imports use ES module syntax for compatibility with modern Node.js without a transpile step.
2. **Pipeline over classes** — each heuristics module exports a single async function returning a plain object. Composition happens in `bin/index.js`, not inside modules. This keeps each module independently testable.
3. **No config files** — the tool is zero-config by design. All defaults are hard-coded constants exported from `src/constants.js`.
4. **Token budget enforcement** — the LLM input is constructed by a dedicated builder function that trims lists to stay under 500 tokens before making the API call.
5. **Graceful degradation** — every external call (Groq API, git subprocess) is wrapped in try/catch and falls back to a deterministic value, ensuring the CLI always exits successfully with some output.

---

## Module Specifications

### `bin/index.js` — CLI Orchestrator

**Responsibilities:**
- Parse `process.argv` for `[path]` and `--ui` flag
- Resolve the target path to an absolute directory
- Validate the path exists
- Call all three heuristics modules in parallel (`Promise.all`)
- Pipe results to `LLMAnalyzer`
- Call `terminalOutput` and `steeringFileWriter` with the AnalysisPayload
- Conditionally start `uiServer`

**Exit codes:**
- `0` — success
- `1` — invalid path or unrecoverable error

```js
// Pseudocode flow
const args = parseArgs(process.argv.slice(2))
const targetPath = resolve(args.path ?? '.')
validateDirectory(targetPath)                         // exits with code 1 on failure

const [entrypoint, techDebt, deps] = await Promise.all([
  detectEntrypoint(targetPath),
  detectTechDebt(targetPath),
  scanDependencies(targetPath),
])

const llmResult = await analyzeLLM({ entrypoint, techDebt, deps })

const payload = { entrypoint, techDebt, deps, ...llmResult }

renderTerminal(payload)
await writeSteeringFile(targetPath, payload)

if (args.ui) {
  await startUIServer(payload)
}
```

---

### `src/constants.js` — Shared Constants

```js
export const IGNORE_LIST = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor']

export const FALLBACK_FILES = [
  'index.ts', 'server.ts', 'server.js', 'main.py', 'app.js', 'src/App.tsx'
]

export const FRAMEWORK_MAP = {
  express: 'Express',
  next: 'Next.js',
  '@nestjs/core': 'NestJS',
  fastapi: 'FastAPI',
  react: 'React',
  vue: 'Vue',
  nuxt: 'Nuxt',
  svelte: 'Svelte',
}

export const MEGAFILE_THRESHOLD = 500  // lines

export const LLM_MODEL = 'llama-3.2-1b-preview'
export const LLM_TOKEN_BUDGET = 500

export const FALLBACK_FLOWS = {
  'Express':  ['Client', 'Express API', 'Database'],
  'Next.js':  ['Browser', 'Next.js SSR', 'API Routes', 'Database'],
  'NestJS':   ['Client', 'NestJS Controller', 'NestJS Service', 'Database'],
  'FastAPI':  ['Client', 'FastAPI Router', 'Pydantic Model', 'Database'],
  'React':    ['Browser', 'React App', 'REST API', 'Database'],
  'Unknown':  ['Client', 'Application Server', 'Database'],
}
```

---

### `src/heuristics/entrypoint.js` — Entrypoint & Stack Detector

**Exports:** `async function detectEntrypoint(targetPath): EntrypointResult`

**Return type:**
```ts
{
  entrypoint: string | null,   // e.g. "src/index.ts" or null
  framework: string,           // e.g. "Express", "Next.js", "Unknown"
  dependencies: string[],      // all dependency names from package.json
  scripts: Record<string, string>,  // start/dev scripts
}
```

**Algorithm:**
1. Attempt to read and parse `<targetPath>/package.json`.
2. Extract `main`, `scripts.start`, `scripts.dev` as candidate entrypoints (first non-null wins).
3. Infer framework by checking `dependencies` keys against `FRAMEWORK_MAP` (first match wins).
4. If no entrypoint found from `package.json`, iterate `FALLBACK_FILES` and return first existing file.
5. If no `package.json`, `dependencies` defaults to `[]`.

---

### `src/heuristics/techDebt.js` — Tech Debt Detector

**Exports:** `async function detectTechDebt(targetPath): TechDebtResult`

**Return type:**
```ts
{
  megaFiles: Array<{ path: string, lines: number }>,
  todos: Array<{ file: string, line: number, text: string, age: string | null }>,
}
```

**MegaFile Algorithm:**
1. Walk the `src` directory (or `targetPath` root if no `src` exists), respecting `IGNORE_LIST`.
2. For each file, count newline characters.
3. If count exceeds `MEGAFILE_THRESHOLD`, add to `megaFiles`.

**TODO Algorithm:**
1. Walk all non-ignored files, scan each line for `/\/\/ TODO/` or `/# TODO/`.
2. For each match, record `{ file, line, text }`.
3. Attempt git age lookup:
   - Run: `git -C <targetPath> log -S "TODO" --diff-filter=A --format="%ai" -- <file>`
   - Parse first line of stdout as ISO date string.
   - On failure (non-zero exit or no output), use `fs.stat(file).mtime.toISOString()`.

**File walking utility:** A shared `walkDir(dir, ignoreList)` async generator is used by both `techDebt.js` and `deps.js` to avoid code duplication. It can be placed in `src/utils/walkDir.js`.

---

### `src/heuristics/deps.js` — Dead Dependency Scanner

**Exports:** `async function scanDependencies(targetPath): DepsResult`

**Return type:**
```ts
{
  declared: string[],     // all deps from package.json
  dead: string[],         // deps with zero import/require occurrences
}
```

**Algorithm:**
1. Parse `<targetPath>/package.json` → extract `dependencies` keys.
2. Walk all non-ignored files with extensions `.js .ts .jsx .tsx .mjs .cjs`.
3. For each file, read content and check for:
   - `import ... from 'pkg'` or `import ... from "pkg"` (regex: `/from ['"]pkg/`)
   - `require('pkg')` or `require("pkg")` (regex: `/require\(['"]pkg/)`)
   - Also match scoped packages: `@scope/name` prefix matching.
4. Any package with zero matches across all files → push to `dead`.
5. If no `package.json` → return `{ declared: [], dead: [] }`.

**Performance note:** All files are read once and all package patterns are tested against each file's content string. This is O(files × packages) but acceptable for typical repo sizes.

---

### `src/llm/analyzer.js` — LLM Synthesis Layer

**Exports:** `async function analyzeLLM(scanResults): LLMResult`

**Return type:**
```ts
{
  flow: string[],
  humanSummary: string,
  constraints: string[],
  fallbackUsed: boolean,
}
```

**Groq Path (when `GROQ_API_KEY` is set):**
1. Import `Groq` from `groq-sdk`.
2. Build a compact user message from scan results, trimmed to `LLM_TOKEN_BUDGET` (rough token estimate: 1 token ≈ 4 chars).
3. Call `groq.chat.completions.create()` with `model: LLM_MODEL` and the system prompt.
4. Parse the response content as JSON.
5. Validate the presence of `flow`, `humanSummary`, `constraints` fields.
6. On any error (API failure, JSON parse error, missing fields), fall through to fallback.

**Token budget builder:**
```js
function buildUserMessage({ entrypoint, techDebt, deps }) {
  const pkgList = deps.declared.slice(0, 20).join(', ')
  const megaList = techDebt.megaFiles.slice(0, 5).map(f => f.path).join(', ')
  return `Entrypoint: ${entrypoint.entrypoint ?? 'unknown'}
Framework: ${entrypoint.framework}
Dependencies: ${pkgList}
Large files: ${megaList || 'none'}`
}
// Trim if over budget (rough check: msg.length / 4 > TOKEN_BUDGET)
```

**Fallback Path (when `GROQ_API_KEY` is absent or API fails):**
```js
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
```

---

### `src/output/terminal.js` — Boxen Terminal Renderer

**Exports:** `function renderTerminal(payload): void`

**Layout:**
```
╔══════════════════════════════════════╗
║        REPO ARCHAEOLOGIST            ║
╠══════════════════════════════════════╣
║  Stack:   Express (src/index.ts)     ║
║  Flow:    Client → Express API → DB  ║
╠══════════════════════════════════════╣
║  ONBOARDING SUMMARY                  ║
║  <humanSummary text>                 ║
╠══════════════════════════════════════╣
║  TECH DEBT                           ║
║  • server.js (823 lines) — MegaFile  ║
║  • src/utils.js:42 TODO (14mo ago)   ║
╠══════════════════════════════════════╣
║  DEAD DEPENDENCIES                   ║
║  • lodash, moment                    ║
╠══════════════════════════════════════╣
║  ARCHITECTURAL CONSTRAINTS           ║
║  1. Follow Express conventions...    ║
╚══════════════════════════════════════╝
```

Uses `boxen` with `title: 'REPO ARCHAEOLOGIST'`, `borderStyle: 'double'`, `padding: 1`.

When `fallbackUsed: true`, prepends a warning line:
```
⚠  No GROQ_API_KEY found — using deterministic fallback
```

**Tech debt section rendering logic (three-way conditional):**

- **Both `megaFiles` and `todos` empty** → render a single line: `✓ No tech debt detected`
- **`megaFiles` empty, `todos` non-empty** → render `✓ No oversized files detected` for the MegaFiles subsection, then list each TODO as `• <file>:<line> TODO (<age>)`
- **`megaFiles` non-empty, `todos` empty** → list each MegaFile as `• <path> (<lines> lines) — MegaFile`, then render `✓ No TODO comments found` for the TODO subsection
- **Both non-empty** → list MegaFiles, then list TODOs normally

---

### `src/output/steeringFile.js` — Kiro Steering File Writer

**Exports:** `async function writeSteeringFile(targetPath, payload): void`

**Output path:** `<targetPath>/.kiro/steering/archaeology.md`

**File format:**
```markdown
---
inclusion: auto
---

# Repository Architecture (Generated by Repo Archaeologist)

## Data Flow

Client → Express API → PostgreSQL

## Onboarding Summary

<humanSummary>

## Tech Debt

### Large Files (>500 lines)
- `server.js` — 823 lines

### Outstanding TODOs
- `src/auth.js:42` — Added ~14 months ago

## Dead Dependencies

- `lodash`
- `moment`

## Architectural Constraints

1. Follow Express conventions for project structure and routing.
2. Avoid modifying files in the ignore list.
3. Preserve existing API contracts when refactoring.

---
*Generated by repo-archaeologist on <ISO timestamp>*
```

**`## Tech Debt` section conditional rendering:**

Both subsections are always emitted (the steering file is machine-readable context for an AI agent, so explicit "none" signals are more useful than omitting a subsection):

- `### Large Files (>500 lines)`: if `megaFiles` is non-empty, list each as `` - `<path>` — <lines> lines ``; if `megaFiles` is empty, write `No oversized files detected.`
- `### Outstanding TODOs`: if `todos` is non-empty, list each as `` - `<file>:<line>` — Added ~<age> ``; if `todos` is empty, write `No TODO comments found.`

**Error handling:** Wrapped in try/catch — on failure, `console.warn` and continue (non-fatal).

---

### `src/server/uiServer.js` — Ephemeral Express UI Server

**Exports:** `async function startUIServer(payload): void`

**Algorithm:**
1. Import `express` and a port-finder utility (use `get-port` or manual TCP probe).
2. Create an Express app.
3. Mount `GET /api/analysis` → `res.json(payload)`.
4. Set `Access-Control-Allow-Origin: *` header on the analysis route.
5. Start listening on the found port.
6. Print `\n🔍 UI Server running at: http://localhost:<port>\n` to stdout.
7. Register `process.on('SIGINT')` and `process.on('SIGTERM')` handlers that call `server.close()` then `process.exit(0)`.

---

## Data Flow Diagram

```
TargetRepository (filesystem)
        │
        ▼
  [IGNORE_LIST filter]
        │
   ┌────┴─────────────────────────┐
   │                              │
   ▼                              ▼
EntrypointDetector          TechDebtDetector + DepsScanner
(package.json / files)      (file walk + git subprocess)
   │                              │
   └──────────────┬───────────────┘
                  ▼
           ScanResults object
                  │
                  ▼
           LLMAnalyzer
      (Groq API or fallback)
                  │
                  ▼
           AnalysisPayload
        ┌─────────┴──────────┐
        ▼                    ▼
  terminalOutput       steeringFileWriter
  (boxen render)     (.kiro/steering/archaeology.md)
        │
        ▼ (if --ui)
    UIServer
  (GET /api/analysis)
```

---

## File & Directory Structure

```
repo-archaeologist/
├── bin/
│   └── index.js            # CLI entrypoint (executable)
├── src/
│   ├── constants.js         # Shared constants (IGNORE_LIST, FRAMEWORK_MAP, etc.)
│   ├── heuristics/
│   │   ├── entrypoint.js    # Stack & entrypoint detection
│   │   ├── techDebt.js      # MegaFile + TODO detection
│   │   └── deps.js          # Dead dependency scanner
│   ├── llm/
│   │   └── analyzer.js      # Groq LLM + fallback synthesis
│   ├── output/
│   │   ├── terminal.js      # Boxen terminal renderer
│   │   └── steeringFile.js  # .kiro/steering/archaeology.md writer
│   ├── server/
│   │   └── uiServer.js      # Ephemeral Express server
│   └── utils/
│       └── walkDir.js       # Shared async directory walker
├── package.json
└── README.md
```

---

## External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `boxen` | `^7.x` | Styled terminal boxes |
| `groq-sdk` | `^0.x` | Groq API client |
| `express` | `^4.x` | Ephemeral UI server |
| `get-port` | `^7.x` | Find available random port |

No build step required. All modules are plain ESM. Node.js ≥ 18 required (for `fs.promises`, `fetch`, native ESM).

---

## Error Handling Strategy

| Scenario | Behavior |
|----------|----------|
| Invalid target path | Print error, exit code 1 |
| `package.json` missing | Proceed with empty deps/scripts |
| `git log` fails | Fall back to `fs.stat` mtime |
| Groq API error | Fall back to deterministic values |
| Groq response malformed | Fall back to deterministic values |
| Steering file write fails | `console.warn`, continue |
| Port unavailable | Retry with next available port |
