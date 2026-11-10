# Production Readiness Evidence

- runId: 2026-11-10_18-13-08-752_UTC
- generatedAt: 2026-11-10T18:13:08.752Z
- branch: main
- commit: aa5cd2e
- overallStatus: fail
- reportDirectory: docs/evidence/production-readiness/2026-11-10_18-13-08-752_UTC
- retentionPolicy: keep latest 20 runs
- prunedRuns: 0

## Command Evidence

### lint

- command: npm run lint
- status: fail
- exitCode: 1
- startedAt: 2026-11-10T18:13:08.759Z
- endedAt: 2026-11-10T18:13:14.401Z
- durationMs: 5642
- logFile: lint.log

## Checklist Mapping

| Step | Status | Evidence |
| --- | --- | --- |
| 1. code-quality | fail | lint + type-check |
| 2. testing | fail | test:coverage |
| 3. security | fail | npm audit |
| 4. build | fail | production build |
