import boxen from 'boxen'

/**
 * Renders the analysis payload as a styled terminal box.
 * @param {Object} payload
 * @param {Object} payload.entrypoint   - { entrypoint, framework, dependencies, scripts }
 * @param {Object} payload.techDebt     - { megaFiles, todos }
 * @param {Object} payload.deps         - { declared, dead }
 * @param {string[]} payload.flow
 * @param {string} payload.humanSummary
 * @param {string[]} payload.constraints
 * @param {boolean} payload.fallbackUsed
 */
export function renderTerminal(payload) {
  const { entrypoint, techDebt, deps, flow, humanSummary, constraints, fallbackUsed } = payload

  const lines = []

  // ── Fallback warning ────────────────────────────────────────────────────────
  if (fallbackUsed) {
    const provider = (process.env.LLM_PROVIDER || 'groq').toUpperCase()
    lines.push(`⚠  LLM unavailable (${provider}) — using deterministic fallback`)
    lines.push('')
  }

  // ── Stack section ───────────────────────────────────────────────────────────
  const ep = entrypoint.entrypoint ?? 'unknown'
  const fw = entrypoint.framework ?? 'Unknown'
  lines.push(`Framework: ${fw}  |  Entrypoint: ${ep}`)
  lines.push('')

  // ── Flow section ────────────────────────────────────────────────────────────
  lines.push(`Data Flow: ${flow.join(' → ')}`)
  lines.push('')

  // ── Onboarding summary ──────────────────────────────────────────────────────
  lines.push('ONBOARDING SUMMARY')
  lines.push(humanSummary)
  lines.push('')

  // ── Tech debt section ───────────────────────────────────────────────────────
  lines.push('TECH DEBT')

  const hasMegaFiles = techDebt.megaFiles.length > 0
  const hasTodos = techDebt.todos.length > 0

  if (!hasMegaFiles && !hasTodos) {
    // Both empty — single combined message
    lines.push('✓ No tech debt detected')
  } else if (!hasMegaFiles && hasTodos) {
    // No mega files, but there are TODOs
    lines.push('✓ No oversized files detected')
    for (const todo of techDebt.todos) {
      lines.push(`• ${todo.file}:${todo.line} — TODO (age: ${todo.age ?? 'unknown'})`)
    }
  } else if (hasMegaFiles && !hasTodos) {
    // Mega files, but no TODOs
    for (const mf of techDebt.megaFiles) {
      lines.push(`• ${mf.path} (${mf.lines} lines)`)
    }
    lines.push('✓ No TODO comments found')
  } else {
    // Both non-empty
    for (const mf of techDebt.megaFiles) {
      lines.push(`• ${mf.path} (${mf.lines} lines)`)
    }
    for (const todo of techDebt.todos) {
      lines.push(`• ${todo.file}:${todo.line} — TODO (age: ${todo.age ?? 'unknown'})`)
    }
  }

  lines.push('')

  // ── Dead dependencies section ───────────────────────────────────────────────
  lines.push('DEAD DEPENDENCIES')
  if (deps.dead.length > 0) {
    lines.push(deps.dead.join(', '))
  } else {
    lines.push('✓ All dependencies are in use')
  }
  lines.push('')

  // ── Architectural constraints section ───────────────────────────────────────
  lines.push('ARCHITECTURAL CONSTRAINTS')
  constraints.forEach((constraint, i) => {
    lines.push(`${i + 1}. ${constraint}`)
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  const content = lines.join('\n')
  console.log(boxen(content, {
    title: 'REPO ARCHAEOLOGIST',
    borderStyle: 'double',
    padding: 1,
  }))
}
