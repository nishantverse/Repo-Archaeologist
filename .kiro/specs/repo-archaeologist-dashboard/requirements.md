# Requirements Document

## Introduction

Repo Archaeologist is a developer onboarding and context pre-processor tool. The frontend dashboard
presents the results of a repository scan — entrypoint, inferred tech stack, architectural flow,
tech debt signals, a plain-English summary, and a Kiro Steering export — so that a new developer can
orient themselves in an unfamiliar codebase within seconds. A mock API layer (MSW, in-process) serves
realistic scan data locally, keeping the frontend completely standalone while a separate CLI heuristics
engine is developed in parallel.

---

## Glossary

- **Dashboard**: The single-page React application that visualises repository scan results.
- **Mock_API**: The Mock Service Worker (MSW) browser service-worker handler that intercepts
  `GET /api/data` and returns static scan data without a real backend.
- **Scan_Data**: The JSON object returned by the Mock_API describing a single repository scan.
- **Header**: The top section of the Dashboard showing repository identity and scan metadata.
- **Tokens_Saved_Badge**: A visual indicator in the Header displaying the `tokensSavedPercentage` value.
- **Entrypoint_Card**: A Dashboard card showing the scan entrypoint file and inferred technology stack.
- **Flow_Diagram**: A visual pipeline component rendering the ordered `flow` array as a sequential
  chain of labelled nodes.
- **Tech_Debt_Panel**: A Dashboard section listing `techDebt` items with severity colouring and type
  badges.
- **Debt_Item**: A single entry in the `techDebt` array containing `type`, `severity`, `file`, and
  `details` fields.
- **Human_Summary_Card**: A Dashboard card rendering the `humanSummary` plain-text field.
- **Steering_Panel**: A Dashboard panel displaying the `kiroSteering` markdown string and providing a
  copy-to-clipboard action.
- **Severity**: One of three ordered values — `high`, `medium`, or `low` — indicating the urgency of
  a Debt_Item.
- **Copy_Button**: A button inside the Steering_Panel that writes the steering markdown to the system
  clipboard.

---

## Requirements

### Requirement 1: Mock API Layer

**User Story:** As a frontend developer, I want a local mock API that returns realistic scan data at
`GET /api/data`, so that I can develop and demo the Dashboard without a real backend.

#### Acceptance Criteria

1. THE Mock_API SHALL intercept `GET /api/data` requests made by the Dashboard and return a
   Scan_Data JSON object containing all fields listed in criterion 5, where each field is present
   and non-null.
2. THE Mock_API SHALL respond with HTTP status 200 and `Content-Type: application/json`.
3. WHEN the Dashboard is loaded in a browser, THE Mock_API SHALL be active — defined as the
   service worker being fully registered and capable of intercepting network requests — before the
   first `GET /api/data` fetch is issued.
4. THE Mock_API SHALL operate entirely in-browser (via MSW service-worker) so that no network
   request for `GET /api/data` reaches an external server.
5. THE Mock_API SHALL return the following fields in the Scan_Data response: `repoName` (string),
   `scannedAt` (ISO 8601 date-time string), `tokensSavedPercentage` (number between 0 and 100
   inclusive), `entrypoint` (string), `inferredStack` (string), `flow` (array of strings),
   `techDebt` (array of objects with `type`, `severity`, `file`, and `details` string fields),
   `humanSummary` (string), and `kiroSteering` (string).
6. IF the Mock_API service worker fails to register on Dashboard load, THEN the Dashboard SHALL
   display an error message indicating that mock data is unavailable and no data fetch shall be
   attempted.

---

### Requirement 2: Data Fetching and Type Safety

**User Story:** As a developer, I want the Dashboard to fetch and type-check scan data at startup,
so that downstream components always receive well-shaped data.

#### Acceptance Criteria

1. WHEN the Dashboard mounts, THE Dashboard SHALL issue exactly one `GET /api/data` request to the
   Mock_API.
2. WHEN a successful response is received, THE Dashboard SHALL parse the response body into a typed
   `ScanData` TypeScript interface before passing it to any child component.
3. IF the fetch request fails, returns a non-200 status, or the response body does not conform to
   the `ScanData` interface, THEN THE Dashboard SHALL display an error message containing a
   human-readable description of the failure, SHALL dismiss the loading indicator, and SHALL NOT
   render any scan-result sections.
4. WHILE data is being fetched, THE Dashboard SHALL display a loading indicator, and SHALL dismiss
   the loading indicator once the fetch completes with either a successful parse or an error
   condition.
5. WHEN the response body is successfully parsed into the `ScanData` interface, THE Dashboard SHALL
   pass the typed data to child components within the same render cycle in which the parse
   completes.

---

### Requirement 3: Header Section

**User Story:** As a developer onboarding to a repository, I want to see the repository name, scan
timestamp, and tokens saved at the top of the Dashboard, so that I immediately understand what was
scanned and when.

#### Acceptance Criteria

1. THE Header SHALL display the `repoName` value.
2. THE Header SHALL display the `scannedAt` value formatted as a date and time string in the format
   "DD Month YYYY, HH:MM:SS" (e.g., "05 July 2025, 14:32:10") using the local timezone.
3. THE Header SHALL display the Tokens_Saved_Badge containing the `tokensSavedPercentage` value
   rounded to the nearest whole number and bounded between 0 and 100, followed by the label
   "tokens saved".
4. THE Tokens_Saved_Badge SHALL render with a background colour applied to the badge element and a
   text colour that differs from that background colour.
5. IF `tokensSavedPercentage` is null or unavailable, THEN THE Header SHALL display the
   Tokens_Saved_Badge with the value replaced by a placeholder indicating the data is unavailable.

---

### Requirement 4: Entrypoint and Stack Summary Card

**User Story:** As a developer, I want a card that shows me where to start reading the codebase and
what technology stack it uses, so that I can orient myself without reading the full codebase.

#### Acceptance Criteria

1. WHEN the Entrypoint_Card is rendered, THE Entrypoint_Card SHALL display the `entrypoint` value
   in a monospace font, with display truncated at 260 characters.
2. WHEN the Entrypoint_Card is rendered, THE Entrypoint_Card SHALL display the `inferredStack`
   value as a plain text label with a maximum display length of 100 characters.
3. IF the `entrypoint` value is absent or empty, THEN THE Entrypoint_Card SHALL display a
   placeholder label indicating that no entrypoint was detected.
4. IF the `inferredStack` value is absent or empty, THEN THE Entrypoint_Card SHALL display a
   placeholder label indicating that no stack was detected.
5. THE Entrypoint_Card SHALL be visually contained within a card element distinguished from
   surrounding content by a visible border or a background color distinct from the page background.

---

### Requirement 5: Architectural Flow Visualization

**User Story:** As a developer, I want a visual pipeline showing the flow of the application
architecture, so that I can understand the data and request path at a glance.

#### Acceptance Criteria

1. THE Flow_Diagram SHALL render each entry in the `flow` array as a distinct labelled node, where
   the label text matches the corresponding entry value exactly.
2. THE Flow_Diagram SHALL render nodes in the same left-to-right or top-to-bottom order as their
   position in the `flow` array, with no gaps or reordering.
3. THE Flow_Diagram SHALL visually connect each node to the immediately following node with a
   directional arrow, such that every consecutive pair of nodes has exactly one connector between
   them.
4. WHEN the `flow` array contains one or more entries, THE Flow_Diagram SHALL render all nodes and
   all connectors with no entries omitted.
5. IF the `flow` array is empty, THEN THE Flow_Diagram SHALL display a message indicating that no
   flow data is available and SHALL render no nodes or connectors.
6. IF the `flow` array contains exactly one entry, THEN THE Flow_Diagram SHALL render that single
   node with no connectors.

---

### Requirement 6: Tech Debt Panel

**User Story:** As a developer, I want a panel listing all tech debt signals with severity
indicators and type badges, so that I know which parts of the codebase to approach with caution.

#### Acceptance Criteria

1. THE Tech_Debt_Panel SHALL render one row per Debt_Item in the `techDebt` array.
2. WHEN a Debt_Item has `severity` equal to `high`, THE Tech_Debt_Panel SHALL apply a red colour
   scheme to that item's row, where the colour scheme is applied to the row's background and
   severity indicator element.
3. WHEN a Debt_Item has `severity` equal to `medium`, THE Tech_Debt_Panel SHALL apply an amber
   colour scheme to that item's row, where the colour scheme is applied to the row's background
   and severity indicator element.
4. WHEN a Debt_Item has `severity` equal to `low`, THE Tech_Debt_Panel SHALL apply a blue colour
   scheme to that item's row, where the colour scheme is applied to the row's background and
   severity indicator element.
5. IF a Debt_Item has a `severity` value other than `high`, `medium`, or `low`, THEN THE
   Tech_Debt_Panel SHALL render that item's row without a severity colour scheme applied.
6. THE Tech_Debt_Panel SHALL display a type badge containing the `type` value for each Debt_Item.
7. THE Tech_Debt_Panel SHALL display the `file` value in a monospace font style for each
   Debt_Item, visually distinct from surrounding prose text.
8. THE Tech_Debt_Panel SHALL display the `details` text for each Debt_Item.
9. IF a Debt_Item is missing one or more of the `file`, `type`, or `details` fields, THEN THE
   Tech_Debt_Panel SHALL render that item's row with the missing field replaced by a placeholder
   indicating the value is unavailable.
10. IF the `techDebt` array is empty, THEN THE Tech_Debt_Panel SHALL display the message "No tech
    debt signals detected".

---

### Requirement 7: Human Summary Card

**User Story:** As a developer, I want a plain-English summary card, so that I can read a concise
paragraph about where to start and what to avoid without interpreting raw data.

#### Acceptance Criteria

1. THE Human_Summary_Card SHALL display the full `humanSummary` string as readable paragraph text
   with a minimum font size of 14px and a line height of at least 1.4.
2. THE Human_Summary_Card SHALL be visually contained within a card element with a distinct border
   or background that is visually differentiated from the surrounding page background.
3. THE Human_Summary_Card SHALL preserve whitespace and line breaks present in the `humanSummary`
   value such that a newline character in the source string renders as a visible line break in the
   displayed text.
4. IF the `humanSummary` value is an empty string or absent, THEN the Human_Summary_Card SHALL
   display a placeholder message indicating that no summary is available.
5. THE Human_Summary_Card SHALL truncate `humanSummary` values exceeding 2000 characters at the
   2000-character boundary and display an indicator that the content has been truncated.

---

### Requirement 8: Kiro Steering Export Panel

**User Story:** As a developer using Kiro, I want to copy the generated steering markdown to my
clipboard in one click, so that I can paste it directly into my Kiro project steering files.

#### Acceptance Criteria

1. THE Steering_Panel SHALL display the full `kiroSteering` string in a scrollable, monospace code
   block with a maximum visible height of 400px before scrolling activates.
2. THE Steering_Panel SHALL render a Copy_Button labelled "Copy to Clipboard".
3. WHEN the Copy_Button is clicked, THE Steering_Panel SHALL write the `kiroSteering` string to
   the system clipboard using the Clipboard API.
4. WHEN the clipboard write succeeds, THE Steering_Panel SHALL replace the Copy_Button label with
   a confirmation message (e.g., "Copied!") for exactly 2 seconds before reverting to the "Copy
   to Clipboard" label.
5. IF the `kiroSteering` string is empty or undefined, THEN THE Steering_Panel SHALL disable the
   Copy_Button.
6. IF the Clipboard API is unavailable or the clipboard write fails, THEN THE Steering_Panel SHALL
   display an inline error message indicating that the copy failed, and the Copy_Button label
   SHALL revert to "Copy to Clipboard".

---

### Requirement 9: Responsive Layout

**User Story:** As a developer, I want the Dashboard to be usable on both desktop and laptop screen
sizes, so that I can view scan results on my primary work machine regardless of viewport width.

#### Acceptance Criteria

1. THE Dashboard SHALL display all sections without horizontal overflow on viewports of 768 px
   width or greater, where each section's content is fully visible without requiring horizontal
   scrolling.
2. THE Dashboard SHALL apply a single-column layout on viewports narrower than 768 px, where all
   cards are stacked vertically in full-width rows.
3. THE Dashboard SHALL apply a multi-column layout on viewports 768 px wide or wider where the
   Entrypoint_Card and Human_Summary_Card are displayed side-by-side in the same row, each
   occupying no less than 40% and no more than 60% of the available row width.
4. WHEN the viewport width changes from below 768 px to 768 px or above, THE Dashboard SHALL
   switch from single-column layout to multi-column layout without requiring a page reload.
5. IF the viewport width changes from 768 px or above to below 768 px, THEN THE Dashboard SHALL
   switch from multi-column layout to single-column layout without requiring a page reload.

---

### Requirement 10: Visual Design System

**User Story:** As a developer, I want the Dashboard to use a consistent dark-themed design system,
so that it matches the tool-oriented aesthetic of developer utilities.

#### Acceptance Criteria

1. THE Dashboard SHALL apply a dark background colour to the page root using Tailwind's `bg-gray-900`
   or darker utility class, and SHALL apply `bg-gray-800` or an equivalent darker-than-root
   Tailwind utility class to card and panel surfaces.
2. THE Dashboard SHALL apply a typographic hierarchy using Tailwind utility classes exclusively,
   where section titles use `text-lg` or larger, labels use `text-sm`, and body text uses
   `text-base`, with no size class used for more than one tier.
3. THE Dashboard SHALL use Tailwind CSS utility classes exclusively for all layout and styling,
   with no custom CSS files introduced beyond the existing `index.css` entry point and no inline
   `style` attributes or `style` props applied to any element.
