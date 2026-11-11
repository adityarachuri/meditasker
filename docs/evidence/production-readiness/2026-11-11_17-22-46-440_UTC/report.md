# Production Readiness Evidence

- runId: 2026-11-11_17-22-46-440_UTC
- generatedAt: 2026-11-11T17:22:46.440Z
- branch: main
- commit: 4acdb8a
- overallStatus: fail
- reportDirectory: docs/evidence/production-readiness/2026-11-11_17-22-46-440_UTC
- retentionPolicy: keep latest 20 runs
- prunedRuns: 0

## Command Evidence

### lint

- command: npm run lint
- status: pass
- exitCode: 0
- startedAt: 2026-11-11T17:22:46.452Z
- endedAt: 2026-11-11T17:22:57.174Z
- durationMs: 10722
- logFile: lint.log

### type-check

- command: npm run type-check
- status: pass
- exitCode: 0
- startedAt: 2026-11-11T17:22:57.176Z
- endedAt: 2026-11-11T17:23:17.261Z
- durationMs: 20085
- logFile: type-check.log

### test

- command: npm run test:coverage
- status: pass
- exitCode: 0
- startedAt: 2026-11-11T17:23:17.263Z
- endedAt: 2026-11-11T17:23:51.130Z
- durationMs: 33867
- logFile: test.log

### security-audit

- command: npm audit --audit-level=high
- status: fail
- exitCode: 1
- startedAt: 2026-11-11T17:23:51.132Z
- endedAt: 2026-11-11T17:25:43.868Z
- durationMs: 112736
- logFile: security-audit.log

## Checklist Mapping

| Step | Status | Evidence |
| --- | --- | --- |
| 1. code-quality | pass | lint + type-check |
| 2. testing | pass | test:coverage |
| 3. security | fail | npm audit |
| 4. build | fail | production build |
