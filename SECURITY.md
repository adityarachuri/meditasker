# Security Policy

## Supported Versions

MediTasker is a demo / portfolio project. There is no long-term support branch;
security fixes are applied to the `main` branch only.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Instead, use GitHub's private vulnerability reporting for this repository:

1. Go to the **Security** tab of this repository.
2. Select **Report a vulnerability**.
3. Describe the issue, including steps to reproduce, affected files, and
   potential impact.

If private reporting is not available to you, open a regular issue asking the
maintainer to open a private channel, without including exploit details.

## What to expect

- Acknowledgement of a report within a reasonable timeframe on a best-effort
  basis (this is an individually maintained project, not a funded product).
- Coordinated disclosure: please allow time for a fix before any public
  disclosure of details.
- Credit in release notes if you'd like it, once a fix ships.

## Scope notes

- This application is a **frontend-only demo**: authentication, sessions, and
  all data (users, projects, tasks) are mocked/simulated in the browser via
  `src/services` and `localStorage`. There is no real backend, database, or
  production credential store behind it.
- Because of that, classic server-side report categories (SQLi, server auth
  bypass, etc.) do not apply. Reports about the demo auth being insecure
  (hardcoded demo password, client-side-only session) are expected and
  tracked as a known limitation in the README rather than as a vulnerability.
- Reports about real issues are still very welcome: XSS via unsanitized
  rendering, dependency vulnerabilities in `package.json`, prototype
  pollution, ReDoS, or anything that could affect a project built on top of
  this codebase.

## Automated scanning

The following run on every push/PR to `main` (see `.github/workflows/`):

- **Dependabot** (`.github/dependabot.yml`) — weekly dependency-update PRs
  for npm packages and GitHub Actions, grouped by minor/patch bump.
- **CodeQL** (`codeql.yml`) — static analysis for the JS/TypeScript codebase,
  also run weekly on a schedule independent of any push.
- **Gitleaks** (`ci.yml`'s `secret-scan` job) — scans for hardcoded secrets.
- **`npm audit --audit-level=high`** (`ci.yml`'s `security-audit` job) — fails
  the build on high/critical advisories; `npm audit signatures` runs
  alongside it as an informational (non-blocking) provenance check.
- **`eslint-plugin-security`** — flags common unsafe patterns (unsafe regex,
  non-literal `fs`/`child_process` calls, etc.) as part of `npm run lint`.
