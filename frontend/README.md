# Repo Archaeologist — Frontend

A neobrutalist dashboard that visualises the output of the `repo-archaeologist` CLI tool. Shows entrypoint detection, architecture flow, tech debt signals, an LLM-generated onboarding summary, and the generated Kiro steering file — all in one page.

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- Vitest + Testing Library for tests
- oxlint for linting

## Quick start

The frontend is automatically started by the backend when you use the `--ui` flag:

```bash
cd backend
repo-archaeologist /path/to/any/repo --ui
# → Scans the repo, starts the API, spawns the frontend
# → Open http://localhost:5173
```

That's it — one command, one URL.

## Standalone dev (without the backend CLI)

If you want to work on the frontend UI in isolation:

```bash
cd frontend
npm install
npm run dev
```

By default this uses mock data. To connect to a running backend:

1. Start the backend: `repo-archaeologist /some/repo --ui` (or just the API: the backend listens on port 3001)
2. The Vite proxy in `vite.config.ts` forwards `/api/*` to `http://localhost:3001`
3. In `src/data/api.ts`, ensure `USE_MOCK = false`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |
| `npm run test` | Run vitest (single pass) |

## Architecture

```
src/
  App.tsx                  Root — renders Dashboard
  main.tsx                 Vite entry point
  index.css                Tailwind imports

  components/
    Dashboard.tsx          Main layout — handles loading/error/success states
    Header.tsx             Repo name, scan timestamp, tokens-saved badge
    EntrypointCard.tsx     Detected entrypoint file + inferred stack
    HumanSummaryCard.tsx   LLM-generated onboarding summary
    FlowDiagram.tsx        Architecture flow as connected nodes (→)
    TechDebtPanel.tsx      Debt items color-coded by severity
    SteeringPanel.tsx      Raw Kiro steering file + copy-to-clipboard
    LoadingIndicator.tsx   Spinner during fetch
    ErrorMessage.tsx       Error state display

  data/
    api.ts                 Fetch layer — calls /api/data, validates response
    mock-data.ts           Hardcoded ScanData for offline UI dev

  hooks/
    useScanData.ts         React hook — loading → success | error state machine

  types/
    scan-data.ts           ScanData + DebtItem interfaces + runtime validators

  utils/
    format.ts              Date formatting, text truncation, percentage display
```

## Data contract

The frontend expects a `ScanData` object from `GET /api/data`:

```ts
interface ScanData {
  repoName: string
  scannedAt: string           // ISO 8601
  tokensSavedPercentage: number
  entrypoint: string
  inferredStack: string
  flow: string[]
  techDebt: DebtItem[]
  humanSummary: string
  kiroSteering: string        // raw markdown
}

interface DebtItem {
  type: string                // "monolith" | "stale_todo" | "unused_dep"
  severity: string            // "high" | "medium" | "low"
  file: string
  details: string
}
```

The backend's `toScanData()` transform (in `backend/src/server/uiServer.js`) maps the raw pipeline payload into this shape.

## Design

The UI uses a neobrutalist aesthetic:
- Thick black borders (`border-4 border-black`)
- Hard drop shadows (`shadow-[8px_8px_0px_0px_#000]`)
- Bold color blocks per section (yellow header, cyan entrypoint, pink summary, violet flow, orange debt, emerald steering)
- All-caps headings, monospace code paths, chunky badges

Fully responsive — collapses to single column on mobile, 2-column grid on desktop.
