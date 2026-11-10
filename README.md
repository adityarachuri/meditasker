# MediTasker

A demo project management suite for healthcare teams, built with React,
TypeScript, and Vite. It's a **frontend-only** showcase: there is no backend,
database, or real user data — everything runs in the browser against mocked
services.

> **Status:** personal/portfolio project, not production software. See
> [Known Issues](#known-issues) before relying on the test suite or build
> commands in CI.

## Table of contents

- [What this is](#what-this-is)
- [Core features](#core-features)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Known issues](#known-issues)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## What this is

MediTasker simulates an enterprise project/task management tool for
healthcare operations: dashboards, projects, tasks, calendar, reporting, and
team management, all backed by an in-memory mock database
(`src/services/databaseService.ts`) seeded with fictitious demo data
(`src/data/mockData.ts`). Login is simulated too — any of the demo accounts
listed on the login screen work with the password shown there.

**There is no real backend and no real patient/user data.** This project is
not HIPAA-compliant and should not be adapted to handle real healthcare data
without a proper backend, authentication, and data-protection layer.

## Core features

- **Dashboard & analytics** — project/task metrics, budget tracking, team
  productivity, KPIs, charts.
- **Team management** — role-based profiles, department organization,
  activity tracking.
- **Project management** — lifecycle tracking, budgets, team assignment,
  status workflows.
- **Task management** — priorities, statuses, time tracking, dependencies,
  tags.
- **Calendar** — unified view of tasks/meetings/milestones across multiple
  view modes.
- **Reporting** — PDF export (via jsPDF) and multi-format data export.
- **Search** — filtering and search across the mock dataset.

## Technology stack

**Core:** React 18, TypeScript 5, Vite 5
**UI:** Tailwind CSS, Lucide icons
**State:** Zustand, React Context, Immer
**Data:** TanStack React Query, a custom in-memory database service with
indexing/virtualization for large mock datasets
**Forms:** React Hook Form, Yup
**Charts:** Recharts
**PDF export:** jsPDF, jsPDF-AutoTable
**Testing:** Jest, React Testing Library
**Linting:** ESLint, typescript-eslint

## Getting started

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/adityarachuri/meditasker.git
cd meditasker
npm install
npm run dev
```

No environment variables or external services are required — the app is
fully self-contained.

## Available scripts

```bash
npm run dev               # start the Vite dev server
npm run build             # production build
npm run preview           # preview a production build locally
npm run lint              # run ESLint (--max-warnings 0)
npm run type-check        # tsc --noEmit over both tsconfig projects
npm run test              # run the Jest test suite
npm run test:watch
npm run test:coverage
npm run audit             # npm audit --audit-level=high
npm run production-readiness  # run lint/type-check/test/audit/build in
                               # sequence and write timestamped evidence to
                               # docs/evidence/production-readiness/
```

## Project structure

```text
src/
  components/   # feature-organized UI components (Auth, Dashboard, Projects, Tasks, Calendar, ...)
  context/      # React context providers (auth, app state)
  data/         # mock seed data and data generators
  hooks/        # shared hooks
  services/     # mock API/database/session/calendar services
  store/        # Zustand global store
  types/        # shared TypeScript types
  utils/        # utilities
```

## Testing

```bash
npm run test
```

Tests use Jest + React Testing Library against jsdom. See
[Known Issues](#known-issues) — a subset of suites currently fail due to
pre-existing drift between service mocks and the services they mock, not due
to anything related to publishing this repository.

## Known issues

Documented here deliberately, rather than overstating the project's current
state:

- **Test suite:** of 12 suites / 119 tests, 9 suites currently fail (26
  tests), mostly because test mocks for `sessionService`/`AuthContext` are
  out of sync with the real service API (e.g. a mock missing
  `getSessionInfo`), plus a couple of brittle UI-text assertions in the
  Calendar suite. Fixing these is tracked as follow-up work.
- **Lint:** `npm run lint` currently reports 223 pre-existing problems (192
  errors, 31 warnings), mostly `@typescript-eslint/no-explicit-any` and
  unused-variable findings in the `services/` and `store/` layers. Not a
  security issue, but worth cleaning up incrementally.
- **Type-check:** `npm run type-check` currently reports ~150 pre-existing
  errors — the bulk are unused imports/locals (`noUnusedLocals` /
  `noUnusedParameters` are on in `tsconfig.app.json`), plus a few real bugs
  worth fixing deliberately: a duplicate-key type in
  `src/hooks/usePaginatedData.ts`, two incompatible `User` type definitions
  (`src/context/AuthContext.tsx` vs `src/types/index.ts`), and
  `src/services/databaseService.ts` assigning possibly-`undefined` query
  results to non-optional fields.
- **Demo auth is not real security.** Login accepts a fixed password for any
  listed demo account and stores a mock token in `localStorage`. This is
  intentional for a demo and should never be used as-is for real
  authentication.

## CI/CD

`.github/workflows/ci.yml` runs a quality gate (lint, type-check, test with
coverage, build) and a separate security-audit job (`npm audit
--audit-level=high`) on every push/PR to `main`. There is no deploy stage yet
— this project isn't currently hosted anywhere. `npm run production-readiness`
runs the same checks locally and writes timestamped evidence (logs + a
markdown/JSON report) to `docs/evidence/production-readiness/`, for anyone
who wants a dated record of what currently passes/fails.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities. In short:
this is a frontend-only demo with no real backend or credentials, so the
interesting surface is dependency vulnerabilities and client-side issues
(XSS, etc.), not server-side auth/data bugs.

`public/_headers` defines a baseline security-header policy (CSP, HSTS,
`X-Frame-Options`, etc.) in the format read by static hosts like Cloudflare
Pages/Workers and Netlify — it isn't wired to a live deploy yet since none
exists, but it's ready for whichever host this ends up on.
`.hintrc` enables [webhint](https://webhint.io)'s `development` ruleset
(accessibility/performance/PWA/security/best-practices checks) for anyone
running `npx hint http://localhost:4173` against a preview build.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, branching, and PR
expectations. Please also read the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE). All data in `src/data/mockData.ts` and the demo
accounts are fictitious and provided for demonstration purposes only.
