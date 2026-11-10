// Runs the project's quality gate (lint, type-check, test, security audit,
// build) in sequence and writes timestamped evidence (logs + a markdown/JSON
// report) under docs/evidence/production-readiness/. Adapted from the
// equivalent script in the PortfolioSite repo.
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DEFAULT_RETENTION_RUNS = 20

const checks = [
  { id: 'lint', command: 'npm run lint' },
  { id: 'type-check', command: 'npm run type-check' },
  { id: 'test', command: 'npm run test:coverage' },
  { id: 'security-audit', command: 'npm audit --audit-level=high' },
  { id: 'build', command: 'npm run build' },
]

function safeNow() {
  return new Date().toISOString()
}

function stampFromIso(iso) {
  return iso.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '_UTC')
}

function currentCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getRetentionRuns() {
  const raw = process.env.PRODUCTION_READINESS_RETENTION_RUNS
  const parsed = Number(raw)

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_RETENTION_RUNS
}

function runCommand(command) {
  return new Promise((resolveRun) => {
    const startedAt = safeNow()
    const startedMs = Date.now()
    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let output = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stderr.write(text)
    })

    child.on('close', (code) => {
      const endedAt = safeNow()
      const durationMs = Date.now() - startedMs
      resolveRun({
        command,
        startedAt,
        endedAt,
        durationMs,
        exitCode: code ?? 1,
        output,
      })
    })
  })
}

function toMarkdown(report, relativeReportDir) {
  const lines = []
  lines.push('# Production Readiness Evidence')
  lines.push('')
  lines.push(`- runId: ${report.runId}`)
  lines.push(`- generatedAt: ${report.generatedAt}`)
  lines.push(`- branch: ${report.git.branch}`)
  lines.push(`- commit: ${report.git.commit}`)
  lines.push(`- overallStatus: ${report.overallStatus}`)
  lines.push(`- reportDirectory: ${relativeReportDir}`)
  lines.push(`- retentionPolicy: keep latest ${report.retention.maxRuns} runs`)
  lines.push(`- prunedRuns: ${report.retention.prunedRunIds.length}`)
  lines.push('')
  lines.push('## Command Evidence')
  lines.push('')

  for (const check of report.checks) {
    lines.push(`### ${check.id}`)
    lines.push('')
    lines.push(`- command: ${check.command}`)
    lines.push(`- status: ${check.status}`)
    lines.push(`- exitCode: ${check.exitCode}`)
    lines.push(`- startedAt: ${check.startedAt}`)
    lines.push(`- endedAt: ${check.endedAt}`)
    lines.push(`- durationMs: ${check.durationMs}`)
    lines.push(`- logFile: ${check.logFile}`)
    lines.push('')
  }

  lines.push('## Checklist Mapping')
  lines.push('')
  lines.push('| Step | Status | Evidence |')
  lines.push('| --- | --- | --- |')
  lines.push(`| 1. code-quality | ${report.steps.step1} | lint + type-check |`)
  lines.push(`| 2. testing | ${report.steps.step2} | test:coverage |`)
  lines.push(`| 3. security | ${report.steps.step3} | npm audit |`)
  lines.push(`| 4. build | ${report.steps.step4} | production build |`)

  return `${lines.join('\n')}\n`
}

async function applyRetention(reportsRoot, keepRunId, maxRuns) {
  const entries = await readdir(reportsRoot, { withFileTypes: true })
  const runDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== keepRunId)
    .sort((a, b) => b.localeCompare(a))

  const keep = runDirs.slice(0, Math.max(maxRuns - 1, 0))
  const prune = runDirs.filter((name) => !keep.includes(name))

  for (const runId of prune) {
    await rm(resolve(reportsRoot, runId), { recursive: true, force: true })
  }

  return prune
}

async function main() {
  const generatedAt = safeNow()
  const runId = stampFromIso(generatedAt)
  const root = process.cwd()
  const reportsRoot = resolve(root, 'docs', 'evidence', 'production-readiness')
  const runDir = resolve(reportsRoot, runId)
  const retentionRuns = getRetentionRuns()

  await mkdir(runDir, { recursive: true })

  const results = []

  for (const check of checks) {
    console.log(`\n==> Running: ${check.command}`)
    const result = await runCommand(check.command)
    const logFileName = `${check.id}.log`
    await writeFile(resolve(runDir, logFileName), result.output, 'utf8')
    results.push({
      id: check.id,
      command: check.command,
      status: result.exitCode === 0 ? 'pass' : 'fail',
      exitCode: result.exitCode,
      startedAt: result.startedAt,
      endedAt: result.endedAt,
      durationMs: result.durationMs,
      logFile: logFileName,
    })

    if (result.exitCode !== 0) {
      console.error(`\nCheck failed: ${check.id}`)
      break
    }
  }

  const findStatus = (id) => results.find((r) => r.id === id)?.status === 'pass'
  const overallStatus = results.length === checks.length && results.every((r) => r.status === 'pass')
    ? 'pass'
    : 'fail'

  const report = {
    runId,
    generatedAt,
    overallStatus,
    git: {
      branch: currentBranch(),
      commit: currentCommit(),
    },
    checks: results,
    steps: {
      step1: findStatus('lint') && findStatus('type-check') ? 'pass' : 'fail',
      step2: findStatus('test') ? 'pass' : 'fail',
      step3: findStatus('security-audit') ? 'pass' : 'fail',
      step4: findStatus('build') ? 'pass' : 'fail',
    },
    retention: {
      maxRuns: retentionRuns,
      prunedRunIds: [],
    },
  }

  report.retention.prunedRunIds = await applyRetention(reportsRoot, runId, retentionRuns)

  const markdown = toMarkdown(report, `docs/evidence/production-readiness/${runId}`)

  await writeFile(resolve(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(resolve(runDir, 'report.md'), markdown, 'utf8')
  await writeFile(resolve(reportsRoot, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(resolve(reportsRoot, 'latest.md'), markdown, 'utf8')

  console.log(`\nEvidence written to: docs/evidence/production-readiness/${runId}`)
  if (report.retention.prunedRunIds.length > 0) {
    console.log(`Pruned old evidence runs: ${report.retention.prunedRunIds.join(', ')}`)
  }

  if (overallStatus !== 'pass') {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
