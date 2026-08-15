# Implementation Plan: Repo Archaeologist Dashboard

## Overview

Implement a single-page React dashboard that visualises repository scan data using a local mock data module. The mock module (`data/mock-data.ts`) exports typed scan data and is consumed through an API abstraction layer (`data/api.ts`) that can be toggled to call a real backend when ready. Implementation is incremental: types and utilities first, then the mock data layer, data fetching hook, individual UI components, responsive layout, and finally testing.

## Tasks

- [x] 1. Foundation — Types, utilities, and dependencies
  - [x] 1.1 Install dev dependencies (Vitest, React Testing Library, fast-check)
    - Run `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom fast-check` in `frontend/`
    - Add `"test": "vitest --run"` script to `package.json`
    - Configure Vitest in `vite.config.ts` or a new `vitest.config.ts` with jsdom environment
    - _Requirements: Design Testing Strategy_

  - [x] 1.2 Create ScanData and DebtItem TypeScript interfaces
    - Create `frontend/src/types/scan-data.ts`
    - Define `DebtItem` interface with `type`, `severity`, `file`, `details` (all strings)
    - Define `ScanData` interface with all fields per Requirement 1.5
    - Export `isScanData` type guard and `isDebtItem` helper function
    - _Requirements: 1.5, 2.2, 2.3_

  - [x] 1.3 Implement utility functions (formatScanDate, formatPercentage, truncateText)
    - Create `frontend/src/utils/format.ts`
    - `formatScanDate(iso: string): string` — converts ISO 8601 to "DD Month YYYY, HH:MM:SS" in local timezone
    - `formatPercentage(value: number | null): string` — clamps 0–100, rounds to integer, returns "N/A" for null
    - `truncateText(text: string, limit: number): string` — returns text unchanged if within limit, else truncates with "…" indicator
    - _Requirements: 3.2, 3.3, 4.1, 4.2, 7.5_

  - [x]* 1.4 Write property tests for type guard and utility functions
    - Create `frontend/src/__tests__/properties/isScanData.property.test.ts`
      - **Property 1: Type guard accepts all valid ScanData shapes**
      - **Validates: Requirements 2.2, 2.3**
    - Create `frontend/src/__tests__/properties/formatDate.property.test.ts`
      - **Property 2: Date formatting produces correct pattern**
      - **Validates: Requirements 3.2**
    - Create `frontend/src/__tests__/properties/formatPercentage.property.test.ts`
      - **Property 3: Percentage clamping and rounding**
      - **Validates: Requirements 3.3**
    - Create `frontend/src/__tests__/properties/truncateText.property.test.ts`
      - **Property 4: Text truncation preserves content within limit**
      - **Validates: Requirements 4.1, 4.2, 7.5_

- [x] 2. Mock Data Layer
  - [x] 2.1 Create mock data module
    - Create `frontend/src/data/mock-data.ts` exporting `MOCK_SCAN_DATA: ScanData` constant
    - Use the exact scan data from the user's original spec (expressjs/express repo, 84% tokens saved, etc.)
    - _Requirements: 1.1, 1.5_

  - [x] 2.2 Create API abstraction layer
    - Create `frontend/src/data/api.ts` exporting `fetchScanData(): Promise<ScanData>`
    - When `USE_MOCK` is true: return mock data after 500ms simulated delay
    - When `USE_MOCK` is false: call `fetch('/api/data')`, validate response with `isScanData`
    - Throw descriptive errors on failure (non-200 status, invalid shape)
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 3. Checkpoint — Verify mock data setup
  - Ensure the app starts without errors and `fetchScanData()` returns valid typed data.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Data Fetching — useScanData hook and Dashboard shell
  - [x] 4.1 Implement useScanData custom hook
    - Create `frontend/src/hooks/useScanData.ts`
    - Define `ScanDataState` discriminated union: `loading` | `error` | `success`
    - Call `fetchScanData()` on mount via `useEffect`, validate with `isScanData`
    - Transition: loading → success (valid data) or loading → error (failure)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Implement Dashboard component with state routing
    - Create `frontend/src/components/Dashboard.tsx`
    - Use `useScanData()` hook
    - Render `LoadingIndicator` while loading
    - Render `ErrorMessage` on error (with message prop)
    - Render all section components on success
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 4.3 Implement LoadingIndicator and ErrorMessage components
    - Create `frontend/src/components/LoadingIndicator.tsx` — spinner/skeleton with accessible label
    - Create `frontend/src/components/ErrorMessage.tsx` — centered card with error text in `text-red-400`
    - _Requirements: 2.3, 2.4_

  - [x] 4.4 Wire Dashboard into App.tsx
    - Update `App.tsx` to render `<Dashboard />`
    - Keep `main.tsx` simple — just renders `<App />` directly
    - _Requirements: 2.1_

- [x] 5. UI Components — Individual section components
  - [x] 5.1 Implement Header component
    - Create `frontend/src/components/Header.tsx`
    - Display `repoName`, formatted `scannedAt` (via `formatScanDate`), and Tokens_Saved_Badge
    - Badge: `formatPercentage` value + "tokens saved" label; show "N/A" when null
    - Badge styling: `bg-emerald-600 text-white text-sm px-2 py-0.5 rounded`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Implement EntrypointCard component
    - Create `frontend/src/components/EntrypointCard.tsx`
    - Display `entrypoint` in monospace (`font-mono`), truncated at 260 chars via `truncateText`
    - Display `inferredStack` as label, truncated at 100 chars
    - Show placeholders for empty/absent values
    - Card styling: `bg-gray-800 rounded-lg border border-gray-700`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.3 Implement FlowDiagram component
    - Create `frontend/src/components/FlowDiagram.tsx`
    - Render each flow entry as a labelled node in sequential order
    - Render directional arrows between consecutive nodes (N-1 connectors for N nodes)
    - Handle empty array (placeholder message) and single-entry array (one node, no connectors)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.4 Implement TechDebtPanel component
    - Create `frontend/src/components/TechDebtPanel.tsx`
    - Render one row per `DebtItem` with type badge, monospace file path, and details text
    - Apply severity colour scheme: high → red, medium → amber, low → blue, unknown → neutral
    - Show "No tech debt signals detected" for empty array
    - Handle missing fields with placeholders
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [x] 5.5 Implement HumanSummaryCard component
    - Create `frontend/src/components/HumanSummaryCard.tsx`
    - Display full `humanSummary` as paragraph text (min 14px font, line-height ≥ 1.4)
    - Preserve whitespace/line breaks (`whitespace-pre-line`)
    - Truncate at 2000 chars with indicator; show placeholder when empty
    - Card styling consistent with design system
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 5.6 Implement SteeringPanel component
    - Create `frontend/src/components/SteeringPanel.tsx`
    - Display `kiroSteering` in scrollable monospace code block (max-h-[400px] overflow-y-auto)
    - Copy_Button: writes to clipboard via `navigator.clipboard.writeText`
    - On success: label changes to "Copied!" for 2 seconds then reverts
    - On failure/unavailable: show inline error "Copy failed — clipboard unavailable"
    - Disable button when `kiroSteering` is empty
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 6. Checkpoint — Verify all components render correctly
  - Ensure all components render with mock data, ask the user if questions arise.

- [x] 7. Layout and Styling — Responsive grid and dark theme
  - [x] 7.1 Apply responsive grid layout to Dashboard
    - Wrap section components in a grid container: `grid grid-cols-1 md:grid-cols-2 gap-6`
    - EntrypointCard and HumanSummaryCard: `col-span-1` (side-by-side on md+)
    - Header, FlowDiagram, TechDebtPanel, SteeringPanel: `md:col-span-2` (full-width)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 7.2 Apply dark theme and typographic hierarchy
    - Page root: `bg-gray-900 text-gray-100 min-h-screen`
    - Cards/panels: `bg-gray-800 rounded-lg border border-gray-700`
    - Section titles: `text-lg font-semibold text-white`
    - Labels: `text-sm text-gray-400`
    - Body text: `text-base text-gray-300`
    - Tailwind-only styling — no custom CSS or inline styles
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 8. Testing
  - [x]* 8.1 Write property tests for FlowDiagram
    - Create `frontend/src/__tests__/properties/FlowDiagram.property.test.tsx`
      - **Property 5: Flow diagram renders correct number of nodes with matching labels**
      - **Validates: Requirements 5.1, 5.2, 5.4**
      - **Property 6: Flow diagram connector count equals nodes minus one**
      - **Validates: Requirements 5.3, 5.6**

  - [x]* 8.2 Write property test for TechDebtPanel
    - Create `frontend/src/__tests__/properties/TechDebtPanel.property.test.tsx`
      - **Property 7: Tech debt panel renders all items with required content**
      - **Validates: Requirements 6.1, 6.6, 6.7, 6.8**

  - [x]* 8.3 Write unit tests for Dashboard states
    - Create `frontend/src/__tests__/components/Dashboard.test.tsx`
    - Test loading state shows indicator
    - Test error state shows ErrorMessage with correct text
    - Test success state renders all section components
    - _Requirements: 2.3, 2.4_

  - [x]* 8.4 Write unit tests for Header, EntrypointCard, and HumanSummaryCard
    - Create `frontend/src/__tests__/components/Header.test.tsx`
    - Create `frontend/src/__tests__/components/EntrypointCard.test.tsx`
    - Create `frontend/src/__tests__/components/HumanSummaryCard.test.tsx`
    - Test rendering, placeholders, edge cases (null percentage, empty strings)
    - _Requirements: 3.1–3.5, 4.1–4.5, 7.1–7.5_

  - [x]* 8.5 Write unit tests for SteeringPanel clipboard behaviour
    - Create `frontend/src/__tests__/components/SteeringPanel.test.tsx`
    - Test copy success → "Copied!" label for 2s
    - Test copy failure → inline error message
    - Test disabled state when kiroSteering is empty
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x]* 8.6 Write integration test for full data flow
    - Create `frontend/src/__tests__/integration/fetchCycle.test.tsx`
    - Mock the `fetchScanData` function to return test data
    - Assert all sections render with correct values
    - _Requirements: 2.1, 2.5_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- **No MSW dependency** — mock data is a plain TypeScript module
- **Backend integration path:** flip `USE_MOCK` to `false` in `data/api.ts` when the backend API is ready
- Property tests validate universal correctness properties from the design document
- The detected programming language is TypeScript (React + Vite project)
- All styling uses Tailwind CSS utility classes exclusively — no custom CSS or inline styles

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["4.1", "4.3"] },
    { "id": 5, "tasks": ["4.2", "4.4"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["7.1", "7.2"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 9, "tasks": ["8.6"] }
  ]
}
```
