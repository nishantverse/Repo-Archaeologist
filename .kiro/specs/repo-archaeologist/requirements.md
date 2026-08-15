# Requirements Document

## Introduction

Repo Archaeologist is a zero-config CLI tool and backend engine that performs deterministic heuristic scans on a local repository, synthesizes findings using a micro-LLM layer (with graceful fallback), and outputs structured onboarding artifacts. The tool helps developers who are new to a codebase quickly understand its stack, architecture, data flow, and known technical debt — with no manual configuration required.

The tool provides:
- A CLI entrypoint (`npx repo-archaeologist [path] [--ui]`) for terminal use
- A heuristics engine that scans for entrypoints, tech debt, and dead dependencies
- An LLM synthesis layer (Groq-backed, with deterministic fallback)
- Styled terminal output using Boxen
- A generated Kiro steering file (`.kiro/steering/archaeology.md`) written into the scanned repo
- An optional ephemeral Express server (`--ui` flag) exposing analysis data over HTTP for frontend consumption

## Glossary

- **CLI**: Command-Line Interface; the `bin/index.js` executable invoked as `npx repo-archaeologist`
- **Scanner**: The heuristics engine (`src/heuristics/`) that performs deterministic, zero-token analysis of a repository
- **EntrypointDetector**: The module (`src/heuristics/entrypoint.js`) that identifies stack entrypoints and framework
- **TechDebtDetector**: The module (`src/heuristics/techDebt.js`) that identifies large files and TODO comments
- **DependencyScanner**: The module (`src/heuristics/deps.js`) that identifies dead (unused) npm dependencies
- **LLMAnalyzer**: The synthesis module (`src/llm/analyzer.js`) that calls the Groq API or generates fallback output
- **AnalysisPayload**: The structured JSON object combining all scanner and LLM outputs
- **SteeringFileWriter**: The module responsible for writing `.kiro/steering/archaeology.md` into the target repository
- **UIServer**: The ephemeral Express server spawned when `--ui` flag is passed
- **TargetRepository**: The local repository directory being scanned, defaulting to the current working directory
- **MegaFile**: Any source file exceeding 500 lines of code
- **DeadDependency**: An npm package listed in `package.json` `dependencies` that has zero `import` or `require` occurrences in the codebase

---

## Requirements

### Requirement 1: CLI Entrypoint and Path Resolution

**User Story:** As a developer, I want to run `npx repo-archaeologist [path]` from my terminal so that I can analyze any repository without installing or configuring the tool.

#### Acceptance Criteria

1. THE CLI SHALL accept an optional positional argument `path` specifying the target directory to scan.
2. WHEN no `path` argument is provided, THE CLI SHALL use the current working directory as the TargetRepository path.
3. WHEN a `path` argument is provided, THE CLI SHALL resolve it to an absolute path before passing it to the Scanner.
4. WHEN the resolved path does not exist or is not a directory, THE CLI SHALL print a descriptive error message and exit with a non-zero exit code.
5. THE CLI SHALL accept an optional `--ui` flag that activates the UIServer after analysis completes.
6. THE CLI SHALL be executable via `npx repo-archaeologist` without requiring a global installation.

---

### Requirement 2: Ignored Folder Enforcement

**User Story:** As a developer, I want the Scanner to skip irrelevant folders so that analysis is fast and not polluted by build artifacts or dependencies.

#### Acceptance Criteria

1. THE Scanner SHALL maintain a strict ignore list containing: `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `vendor`.
2. WHEN traversing the TargetRepository file tree, THE Scanner SHALL skip any directory whose name matches an entry in the ignore list.
3. THE Scanner SHALL apply the ignore list recursively at every depth level of the file tree.

---

### Requirement 3: Entrypoint and Stack Detection

**User Story:** As a developer joining a new project, I want the tool to identify the application entrypoint and infer the tech stack so that I understand what the project is and how to start it.

#### Acceptance Criteria

1. WHEN a `package.json` file exists in the TargetRepository root, THE EntrypointDetector SHALL extract the `main` field, `scripts.start` value, and `scripts.dev` value as candidate entrypoints.
2. WHEN a `package.json` file exists, THE EntrypointDetector SHALL extract the `dependencies` object for framework inference.
3. IF no `package.json` is found or the extracted fields are absent, THE EntrypointDetector SHALL check for the existence of files in this priority order: `index.ts`, `server.ts`, `server.js`, `main.py`, `app.js`, `src/App.tsx`.
4. THE EntrypointDetector SHALL infer the framework name from known dependency-to-framework mappings including at minimum: `express` → Express, `next` → Next.js, `@nestjs/core` → NestJS, `fastapi` → FastAPI, `react` → React.
5. WHEN neither `package.json` entrypoint fields nor fallback files are found, THE EntrypointDetector SHALL set entrypoint to `null` and framework to `"Unknown"`.
6. THE EntrypointDetector SHALL expose the detected entrypoint and framework name as structured output consumable by the LLMAnalyzer.

---

### Requirement 4: Tech Debt Detection — MegaFiles

**User Story:** As a developer, I want to know which source files are excessively large so that I can prioritize refactoring efforts.

#### Acceptance Criteria

1. THE TechDebtDetector SHALL scan all files within the `src` directory of the TargetRepository, or the root if no `src` directory exists, excluding directories in the ignore list.
2. WHEN a source file exceeds 500 lines of code, THE TechDebtDetector SHALL flag it as a MegaFile and record its relative path and line count.
3. THE TechDebtDetector SHALL include the list of MegaFiles in the AnalysisPayload.

---

### Requirement 5: Tech Debt Detection — TODO Comments

**User Story:** As a developer, I want to see outstanding TODO items in a codebase so that I know where work is unfinished or deferred.

#### Acceptance Criteria

1. THE TechDebtDetector SHALL scan all non-ignored source files for lines containing `// TODO` or `# TODO` (case-sensitive prefix match).
2. WHEN a TODO comment is found, THE TechDebtDetector SHALL record the file path and line number.
3. WHILE the TargetRepository is a valid Git repository, THE TechDebtDetector SHALL attempt to determine the approximate age of each TODO by running `git log -S "TODO" --diff-filter=A --format="%ai" -- <file>` and using the first result as the introduction date.
4. IF the TargetRepository is not a Git repository or the `git log` command fails for a file, THE TechDebtDetector SHALL use the file's filesystem modification timestamp as the fallback age approximation.
5. THE TechDebtDetector SHALL include the list of TODO items (with file, line, and estimated age) in the AnalysisPayload.
6. WHEN no TODO comments are found across all scanned files, THE TechDebtDetector SHALL set the `todos` array to an empty array `[]` and SHALL NOT treat this as an error condition.

---

### Requirement 6: Dead Dependency Detection

**User Story:** As a developer, I want to identify npm packages that are declared but never used so that I can remove unnecessary dependencies.

#### Acceptance Criteria

1. WHEN a `package.json` file exists in the TargetRepository root, THE DependencyScanner SHALL extract all package names from the `dependencies` field.
2. THE DependencyScanner SHALL search all non-ignored `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs` files in the TargetRepository for `import` statements and `require()` calls referencing each package name.
3. WHEN a package name from `dependencies` has zero occurrences across all scanned files, THE DependencyScanner SHALL flag it as a DeadDependency.
4. THE DependencyScanner SHALL include the list of DeadDependencies in the AnalysisPayload.
5. IF no `package.json` exists, THE DependencyScanner SHALL skip scanning and set DeadDependencies to an empty array.

---

### Requirement 7: LLM Synthesis with Groq

**User Story:** As a developer, I want the tool to produce a human-readable architectural summary and data flow diagram so that I can quickly understand how the system works end-to-end.

#### Acceptance Criteria

1. WHEN the environment variable `GROQ_API_KEY` is set, THE LLMAnalyzer SHALL call the Groq API using the model `llama-3.2-1b-preview`.
2. THE LLMAnalyzer SHALL construct an input payload containing only: detected entrypoint, package name list, route list (if detected), and MegaFile list — ensuring the total prompt remains under 500 tokens.
3. THE LLMAnalyzer SHALL use the following system prompt verbatim:
   ```
   You are an expert systems architect. Given this summary of an existing repository:
   1. Infer the end-to-end data flow (e.g. ['Client', 'Express API', 'Prisma ORM', 'PostgreSQL']).
   2. Write a 2-sentence 'Explain Like I Just Joined' human onboarding summary.
   3. Formulate 2-3 essential architectural constraints for an AI coding agent.
   Respond strictly in valid JSON matching this schema:
   { "flow": ["string", ...], "humanSummary": "string", "constraints": ["string", ...] }
   ```
4. WHEN the Groq API responds, THE LLMAnalyzer SHALL parse the JSON response and validate that it contains `flow` (array), `humanSummary` (string), and `constraints` (array) fields.
5. IF the Groq API response is not valid JSON or is missing required fields, THE LLMAnalyzer SHALL fall back to deterministic fallback values.
6. THE LLMAnalyzer SHALL include the synthesis result (from API or fallback) in the AnalysisPayload under keys `flow`, `humanSummary`, and `constraints`.

---

### Requirement 8: Deterministic Fallback when GROQ_API_KEY is Absent

**User Story:** As a developer without a Groq API key, I want the tool to still produce useful output so that I can use it in offline or restricted environments.

#### Acceptance Criteria

1. WHEN the environment variable `GROQ_API_KEY` is not set, THE LLMAnalyzer SHALL generate fallback values without making any network calls.
2. THE LLMAnalyzer SHALL derive the fallback `flow` array from the detected framework and dependency list using a predefined mapping (e.g., Express → `["Client", "Express API", "Database"]`; Next.js → `["Browser", "Next.js SSR", "API Routes", "Database"]`).
3. THE LLMAnalyzer SHALL generate the fallback `humanSummary` as a template string incorporating the detected framework name and primary dependency count.
4. THE LLMAnalyzer SHALL generate fallback `constraints` as a static list of 2-3 generic architectural rules appropriate to the detected framework.
5. THE LLMAnalyzer SHALL include a `fallbackUsed: true` flag in the AnalysisPayload when deterministic fallback is active.

---

### Requirement 9: Terminal Output with Boxen

**User Story:** As a developer running the CLI, I want to see the analysis results displayed clearly in my terminal so that I can read the findings at a glance.

#### Acceptance Criteria

1. THE CLI SHALL use the `boxen` npm package to render the terminal output.
2. THE CLI SHALL display the following sections in the terminal output: stack summary (framework + entrypoint), data flow (`flow` array), human onboarding summary (`humanSummary`), tech debt warnings (MegaFiles and TODOs), dead dependencies, and architectural constraints.
3. WHEN the fallback mode is active, THE CLI SHALL include a visible notice in the terminal output indicating that no API key was found and deterministic fallback was used.
4. WHEN `todos` is an empty array, THE CLI SHALL display `✓ No TODO comments found` in the TODO subsection of the tech debt output.
5. WHEN `megaFiles` is an empty array, THE CLI SHALL display `✓ No oversized files detected` in the MegaFiles subsection of the tech debt output.
6. WHEN both `todos` and `megaFiles` are empty arrays, THE CLI SHALL display `✓ No tech debt detected` as a single combined message instead of showing two separate subsections.
7. WHEN no dead dependencies are detected, THE CLI SHALL display a positive confirmation message in the dead dependencies section rather than an empty section.

---

### Requirement 10: Steering File Generation

**User Story:** As a developer using Kiro, I want a steering file written into the scanned repository so that the AI coding agent has architectural context automatically loaded.

#### Acceptance Criteria

1. THE SteeringFileWriter SHALL create the file `.kiro/steering/archaeology.md` within the TargetRepository directory.
2. THE SteeringFileWriter SHALL create the `.kiro/steering/` directory path if it does not already exist.
3. THE SteeringFileWriter SHALL write the full AnalysisPayload formatted as a Kiro steering Markdown document, including: data flow, human summary, tech debt warnings, dead dependencies, and architectural constraints.
4. WHEN the steering file already exists, THE SteeringFileWriter SHALL overwrite it with the latest analysis result.
5. WHEN writing the steering file fails due to a filesystem permission error, THE CLI SHALL print a warning message and continue without exiting.

---

### Requirement 11: Ephemeral UI Server (`--ui` flag)

**User Story:** As a frontend developer on the same team, I want to connect to a local HTTP endpoint exposing the analysis payload so that I can build a visual dashboard without re-running the CLI.

#### Acceptance Criteria

1. WHEN the `--ui` flag is passed, THE UIServer SHALL start an Express HTTP server on a randomly selected available port after analysis completes.
2. THE UIServer SHALL expose a `GET /api/analysis` endpoint that responds with the full AnalysisPayload as JSON.
3. WHEN the UIServer starts, THE CLI SHALL print the full server URL (e.g., `http://localhost:<port>`) to the terminal.
4. THE UIServer SHALL set appropriate CORS headers on the `/api/analysis` endpoint to allow cross-origin requests from local frontend development servers.
5. WHEN the CLI process receives a `SIGINT` or `SIGTERM` signal, THE UIServer SHALL shut down gracefully and release the port before the process exits.
6. WHEN the `--ui` flag is not passed, THE UIServer SHALL not be started.
