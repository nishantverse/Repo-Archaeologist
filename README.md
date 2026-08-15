# Repo Archaeologist

Scan any local repo and instantly get an architecture overview, tech debt report, and AI-generated onboarding summary — in your terminal and as a visual dashboard.

## Setup

```bash
cd backend
npm install
npm link
```

Then add your Groq API key (free at [console.groq.com](https://console.groq.com)):

```bash
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here
```

## Usage

**Terminal report only:**

```bash
repo-archaeologist /path/to/any/repo
```

**Terminal report + visual dashboard:**

```bash
repo-archaeologist /path/to/any/repo --ui
```

Open the URL printed in the output (http://localhost:5173) — that's your dashboard.

`Ctrl+C` shuts everything down.

## What you get

- Framework & entrypoint detection
- End-to-end architecture flow diagram
- Tech debt signals (oversized files, stale TODOs, dead dependencies)
- LLM-generated onboarding summary (via Groq or local Ollama)
- A `.kiro/steering/archaeology.md` file written into the scanned repo for AI agent context
- A visual dashboard when using `--ui`

## Project structure

```
backend/    CLI tool + API server (Node.js, Express, Groq SDK)
frontend/   Dashboard UI (React, Vite, Tailwind CSS)
```

See each folder's README for detailed docs.
