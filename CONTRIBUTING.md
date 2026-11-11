# Contributing to MediTasker

Thanks for considering a contribution! This is a solo-maintained demo project,
so please keep pull requests focused and be patient with review turnaround.

## Prerequisites

- Node.js 20+ and npm
- A clean clone of the repository

## Local setup

```bash
git clone https://github.com/adityarachuri/meditasker.git
cd meditasker
npm install
npm run dev
```

The app runs entirely in the browser (mock data, mock auth) — no backend or
environment variables are required for local development.

## Branching and commits

- Branch from `main`, naming branches `feature/<short-description>` or
  `fix/<short-description>`.
- Write commit messages that explain *why*, not just *what*.
- Keep pull requests scoped to a single change where possible.

## Coding standards

- TypeScript, functional React components, and the existing patterns in
  `src/` (Zustand for state, React Query for data fetching wrappers, Tailwind
  for styling).
- Run the linter and fix any new warnings/errors your change introduces:

  ```bash
  npm run lint
  ```

- Run the test suite and add/update tests for behavior you change:

  ```bash
  npm run test
  ```

  The suite is currently green (all suites passing) — please keep it that
  way: a PR that introduces a failure should fix it before merging, not
  defer it.

## Pull request checklist

- [ ] `npm run lint` passes clean (`--max-warnings 0`)
- [ ] `npm run type-check` passes clean
- [ ] `npm run test` passes clean
- [ ] Description explains the change and why it's needed
- [ ] Screenshots included for UI changes

CI (`.github/workflows/ci.yml`) runs the same lint/type-check/test/build gate
plus `npm audit --audit-level=high` on every PR, and all of it is expected to
pass — see [Known Issues](README.md#known-issues) in the README for the small
set of things that are intentionally out of scope (dev-only dependency
advisories, bundle size, demo auth).

## Opening an issue

When filing a bug, include: steps to reproduce, expected vs. actual behavior,
browser/OS, and console errors if any. For feature requests, describe the
use case, not just the desired implementation.

## Code review

A maintainer will review your PR, may request changes, and will merge once
it's ready. There's no formal SLA — this is maintained in spare time.
