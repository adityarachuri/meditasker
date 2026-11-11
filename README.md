# MediTasker

A demo project management suite for healthcare teams, built with React,
TypeScript, and Vite. It's a **frontend-only** showcase: there is no backend,
database, or real user data — everything runs in the browser against mocked
services.

> **Status:** personal/portfolio project, not production software. The
> quality gate (lint, type-check, test, security-audit, build) is green — see
> [Known Issues](#known-issues) for the couple of things worth knowing about
> before you treat this as more than a demo.

## Table of contents

- [What this is](#what-this-is)
- [Core features](#core-features)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Testing](#testing)
- [Known issues](#known-issues)
- [Security](#security)
- [Changelog](#changelog)
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
- **Project & task management**, each with two view modes:
  - **Enterprise** — a virtualized, paginated table (or card) view over the
    simulated large dataset, with infinite scroll.
  - **Manage** — a search/filter/bulk-edit view backed by live app state,
    for actually creating, editing, and bulk-updating projects and tasks.
- **Advanced search** — per-field filters (status, priority, assignee, dates,
  etc.) with saved searches and recent-search history.
- **Bulk operations** — multi-select with bulk status/priority/tag updates,
  archiving, and deletion.
- **Data export/import** — JSON/CSV export and import, available from the
  Reports page.
- **Calendar** — unified view of tasks/meetings/milestones across multiple
  view modes.
- **Reporting** — PDF export (via jsPDF) and multi-format data export.
- **Collapsible sidebar** — preference persists across reloads.
- **Notifications** — switches to a virtualized list once the history grows
  past a handful of entries.

## Technology stack

**Core:** React 18, TypeScript 5, Vite 8
**UI:** Tailwind CSS, Lucide icons
**State:** Zustand, React Context, Immer
**Data:** TanStack React Query, TanStack Virtual, a custom in-memory database
service with indexing/virtualization for large mock datasets
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

## Architecture

For how the pieces fit together — state management, the two parallel mock
data layers, services, and testing strategy — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Testing

```bash
npm run test
npm run test:coverage
```

Tests use Jest + React Testing Library against jsdom. As of the latest
`npm run production-readiness` run: **25 suites / 292 tests, all passing**,
with statement coverage around 45% — concentrated in the services, hooks,
store, and context layers (several are at or near 100%), since that's where
the actual business logic and the highest-value bugs live. Most presentational
components are intentionally lower-priority for coverage; see
`docs/evidence/production-readiness/latest.md` for the current numbers.

## Known issues

Documented here deliberately, rather than overstating the project's current
state:

- **Dependency vulnerabilities:** `npm audit --audit-level=high` passes (0
  high/critical). There are still ~14 low/moderate advisories, all in
  dev-only build tooling (`@typescript-eslint/*`'s `minimatch`, mostly) with
  no fix available yet that doesn't force a breaking change; tracked for a
  future dependency bump.
- **Large main chunk:** the production build emits one ~1.2MB JS chunk
  (Vite warns about this at build time). Code-splitting via dynamic
  `import()` would improve this; not done yet since this is a demo app
  without a real deploy/CDN story.
- **Demo auth is not real security.** Login accepts a fixed password for any
  listed demo account and stores a mock token in `localStorage`. This is
  intentional for a demo and should never be used as-is for real
  authentication.
- **No real backend.** The "Enterprise (1M+ records)" view is simulated: it's
  actually seeded with 50 users / 25 projects / 100 tasks
  (`src/components/Performance/DataInitializer.tsx`), not a live database.

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, branching, and PR
expectations. Please also read the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE). All data in `src/data/mockData.ts` and the demo
accounts are fictitious and provided for demonstration purposes only.
