export const IGNORE_LIST = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
]

export const FALLBACK_FILES = [
  'index.ts',
  'server.ts',
  'server.js',
  'main.py',
  'app.js',
  'src/App.tsx',
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

export const MEGAFILE_THRESHOLD = 500

export const LLM_MODEL = 'llama-3.3-70b-versatile'

export const LLM_TOKEN_BUDGET = 500

export const FALLBACK_FLOWS = {
  'Express':  ['Client', 'Express API', 'Database'],
  'Next.js':  ['Browser', 'Next.js SSR', 'API Routes', 'Database'],
  'NestJS':   ['Client', 'NestJS Controller', 'NestJS Service', 'Database'],
  'FastAPI':  ['Client', 'FastAPI Router', 'Pydantic Model', 'Database'],
  'React':    ['Browser', 'React App', 'REST API', 'Database'],
  'Unknown':  ['Client', 'Application Server', 'Database'],
}
