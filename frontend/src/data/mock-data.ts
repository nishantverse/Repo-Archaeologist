import type { ScanData } from '../types/scan-data';

export const MOCK_SCAN_DATA: ScanData = {
  "repoName": "expressjs/express",
  "scannedAt": "2026-08-15T10:30:00Z",
  "tokensSavedPercentage": 84,
  "entrypoint": "src/server.ts",
  "inferredStack": "Node.js / Express API",
  "flow": ["Express API", "JWT Middleware (src/middlewares/auth.ts)", "Prisma ORM", "PostgreSQL"],
  "techDebt": [
    { "type": "monolith", "severity": "high", "file": "src/controllers/billing.ts", "details": "1,420 lines — high fragility risk" },
    { "type": "stale_todo", "severity": "medium", "file": "src/routes/api.ts:44", "details": "// TODO: fix race condition in webhook (added 412 days ago)" },
    { "type": "unused_dep", "severity": "low", "file": "package.json", "details": "3 dead packages detected: 'moment', 'lodash', 'axios'" }
  ],
  "humanSummary": "Start onboarding at src/server.ts. Billing logic is heavily monolithic—avoid refactoring it directly. JWT authentication is handled in src/middlewares/auth.ts. Use native fetch instead of legacy axios.",
  "kiroSteering": "# Kiro Steering: Repository Archaeology Context\n\n## Architecture Summary\n- **Entrypoint:** `src/server.ts`\n- **Pattern:** Express REST Controller -> Prisma ORM -> PostgreSQL\n- **Auth Guard:** `src/middlewares/auth.ts`\n\n## Constraints & Fragile Zones\n- **DO NOT Refactor:** `src/controllers/billing.ts` (1,420-line legacy monolith). Extend via isolated helpers only.\n- **Dead Dependencies:** Avoid referencing `moment` or `axios`; project has transitioned to native `fetch`."
};
