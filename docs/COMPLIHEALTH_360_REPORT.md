# CompliHealth 360° Report — MediTasker

**Audit type:** Full 360° product engineering audit, benchmarked against modern enterprise software engineering standards
**Repository:** [meditasker](https://github.com/adityarachuri/meditasker)
**Commit audited:** `60f3290` (2026-11-12)
**Branch:** `main` · 65 commits · 0 tags · v0.2.0
**Auditor:** Claude Code (automated multi-agent audit)

> **Context for scoring.** MediTasker is explicitly a frontend-only portfolio/demo project ("not production software," per its own README). This audit scores it against *enterprise* engineering norms anyway, as requested, but every score separates genuine engineering gaps from reasonable, disclosed demo-scope trade-offs (no backend, simulated auth, no real users). A demo project intentionally omitting a backend is not penalized for "not having a backend" — it *is* penalized for things like missing accessibility guardrails, no release pipeline, or a live service worker with a real spec-violation bug, which are gaps regardless of project scope.

> **Revision note (post-review).** The first version of this report scored several dimensions on *effort and intent* — "disclosed as a known issue," "well-documented," "internally consistent" — rather than strictly on *outcome against an enterprise bar*. That inflated the composite. This version recalibrates: a split-brain data model is an architecture defect whether or not it's disclosed in a markdown file; a good README is not "enterprise documentation" just because it's honest; test breadth across unit tests doesn't offset zero E2E coverage on a modal-and-bulk-edit-heavy UI. It also adds one finding the first pass missed entirely: unescaped CSV export is a real formula-injection vector (§4). Scores below are materially lower as a result — this is the same evidence, judged against what a real enterprise architecture/security/release review would actually require, not what's reasonable for a solo portfolio project.

---

## 1. Methodology

Scoring follows a weighted-category model consistent with public benchmarking methodologies for software/product evaluation (e.g., G2's research scoring methodology, which blends satisfaction signal with product capability breadth, and general software-benchmarking practice of composing a single health index from independently-scored dimensions — see References).

Ten dimensions were audited, each scored 0–100 by independent evidence-gathering passes (static analysis, targeted code reading, dependency/security scanning, and CI/config inspection) and combined into a weighted composite. Weights reflect what materially drives risk and velocity in an enterprise product engineering context: Security and the core engineering triad (Architecture, Code Quality, Testing) are weighted heaviest; DX/Docs, Dependencies, Performance, and Accessibility are weighted moderately; Observability closes the set.

| Dimension | Weight |
| --- | --- |
| Security Posture | 15% |
| Architecture & Design | 12% |
| Code Quality & Maintainability | 12% |
| Testing & QA | 12% |
| DevOps / CI-CD / Release Engineering | 10% |
| Dependency & Supply Chain Health | 8% |
| Documentation & Developer Experience | 8% |
| Performance & Scalability | 8% |
| Accessibility (a11y) | 8% |
| Observability & Operational Readiness | 7% |

Grade bands: **A** 90–100 (industry-leading) · **B** 80–89 (enterprise-ready) · **C+** 70–79 (solid, gaps to close) · **C** 60–69 (developing/demo-grade) · **D** 50–59 (at-risk) · **F** <50 (not production-ready).

---

## 2. Executive summary

| | |
| --- | --- |
| **Composite score** | **45.0 / 100** |
| **Grade** | **F — Not Production-Ready** |
| **Dependency vulnerabilities (critical/high)** | 0 (confirmed via `npm audit`, as of commit `60f3290`) — point-in-time only, see §3.6 |
| **Test suites** | 52 test files, but **zero E2E/integration coverage** of the actual user flows |
| **Critical findings** | 2 (live service-worker spec violation, CSV formula-injection — see §4) |

Judged honestly against what an enterprise architecture/security/release review actually requires — not against what's reasonable for a solo portfolio project — MediTasker is **at-risk**: no dimension clears a "B" when effort and intent are backed out and only outcomes are scored. The things that look good on the surface (a long README, a passing CI job, 0 `npm audit` hits) are necessary but nowhere near sufficient. There is no E2E testing, no release pipeline, no error tracking, near-zero accessibility, a dual-source-of-truth data model with no reconciliation, and a shipped data-export feature with an unescaped formula-injection path. None of this is disqualified by "it's a demo" — a demo doesn't need a backend, but it can still have broken accessibility, a buggy service worker, and an injectable export feature, and this one does.

### Scorecard

| Dimension | Score | Grade | Weight | Weighted |
| --- | --- | --- | --- | --- |
| Documentation & Developer Experience | 62 | C | 8% | 4.96 |
| Code Quality & Maintainability | 58 | D | 12% | 6.96 |
| Testing & QA | 55 | D | 12% | 6.60 |
| Performance & Scalability | 52 | D | 8% | 4.16 |
| Architecture & Design | 48 | F | 12% | 5.76 |
| Dependency & Supply Chain Health | 45 | F | 8% | 3.60 |
| Security Posture | 40 | F | 15% | 6.00 |
| DevOps / CI-CD / Release Engineering | 30 | F | 10% | 3.00 |
| Accessibility (a11y) | 30 | F | 8% | 2.40 |
| Observability & Operational Readiness | 22 | F | 7% | 1.54 |
| **Composite** | **45.0** | **F** | 100% | **44.98** |

```
Code Quality        [#############################                  ] 58
Documentation       [###############################                ] 62
Testing & QA         [###########################▌                  ] 55
Performance          [##########################                    ] 52
Architecture         [########################                      ] 48
Dependencies         [######################▌                       ] 45
Security             [####################                          ] 40
DevOps/CI-CD         [###############                               ] 30
Accessibility        [###############                               ] 30
Observability        [###########                                    ] 22
                     0        20        40        60        80       100
```

Only one dimension (Documentation, at 62) clears a "C." Three more (Code Quality, Testing, Performance) clear "D." The remaining six — including Security, the heaviest-weighted dimension — are outright "F." Nothing reaches a genuine enterprise "pass" bar (≥70) once scored on outcomes rather than effort, and the composite itself lands in "F" territory.

---

## 3. Dimension-by-dimension findings

### 3.1 Security Posture — 40/100 (F)
**Strengths**
- `SECURITY.md` has a real private-disclosure process and scopes out known demo-auth limitations from genuinely reportable classes.
- Zero `dangerouslySetInnerHTML`, `eval(`, or raw `innerHTML =` anywhere in `src/`.
- `public/_headers` ships a real CSP, HSTS preload, `X-Frame-Options: DENY`, and a locked-down `Permissions-Policy`.
- Session storage defaults to `sessionStorage`, with idle-timeout tracking (`src/services/sessionService.ts`).

**Gaps — and why this is an F, not a D**
- **Unescaped CSV export = formula injection (verified, CWE-1236).** `src/components/Advanced/DataExportImport.tsx:216-259` builds the CSV export by string-concatenating `project.name`/`task.title` straight into the row (`` `"${project.name}"` ``) with no quote-doubling and no neutralization of a leading `=`, `+`, `-`, or `@`. Both fields are user-editable via `ProjectModal`/`TaskModal`. A project named `=HYPERLINK("http://evil.example","x")` round-trips straight into a working formula the moment anyone opens the exported file in Excel/Sheets. The code's own comment (`// Simple CSV conversion - in production, use a proper CSV library`, line 217) admits it isn't production-grade — and it shipped anyway.
- DOMPurify in the bundle is a transitive dependency only — zero direct `import` in `src/`. There is **no sanitization/output-encoding layer anywhere in the app**, despite the app importing and exporting arbitrary user-authored text (names, titles, descriptions).
- No SAST/CodeQL, no secret-scanning, no dependency SCA beyond a basic `npm audit` gate — a real AppSec review has nothing automated to catch the class of bug above.
- `authService.ts` hardcodes one shared password for every account with no rate-limiting/lockout seam at all — fine as a demo stub, but it means the "auth" layer has zero actual security properties to evaluate, not weak ones.
- A CSP and clean session-storage default do not offset a live, exploitable-within-the-app's-own-trust-model injection bug. A security review scores on the worst finding that's actually reachable, not on the average of good and bad controls.

**Rationale:** good headers and a sound disclosure process are table stakes, not differentiators. A shipped, unescaped, user-reachable formula-injection sink in a core feature (export) is the kind of finding that fails a real security review outright.

### 3.2 Architecture & Design — 48/100 (F)
**Strengths**
- `docs/ARCHITECTURE.md` accurately describes the codebase — the documented "two data layers" split is respected consistently in the components sampled, so at least the design is honestly represented.
- Clean layering: context → Zustand → services → hooks is a reasonable separation for a frontend-only app.
- `immer`'s `enableMapSet()` is correctly called at module load, showing real awareness of an easy-to-miss gotcha.

**Gaps — and why "disclosed" doesn't rescue the score**
- **Two independently-mutable sources of truth for the same entities is a design defect, full stop.** Documenting it in `docs/ARCHITECTURE.md` doesn't make it not a defect — it makes it a *known* defect. A real architecture review doesn't give credit for writing down "we have split-brain state and no reconciliation layer"; it sends the design back. Editing a project in "Manage" view and expecting "Enterprise" view to reflect it is a reasonable user expectation that this architecture cannot meet, and nothing in the codebase addresses that — there's no sync, no single source of truth, no event bus between the two stores.
- `src/services/api.ts` — a fully-built React Query client and typed endpoint layer — is wired into **zero components**. That's not "a seam for later," it's dead integration code shipping in every user's bundle today, adding weight and maintenance surface for nothing.
- No router library at all; tab state is a `useState` + `switch`. That's a legitimate choice at small scale, but it also means no deep-linking, no URL-driven state, no route-based code-splitting — which is a direct contributor to the single 1.2MB bundle (§3.8), not an independent issue.
- `React.StrictMode` is deliberately disabled, which actively suppresses the dev-time signal that would catch non-idempotent effects — the opposite of what an enterprise codebase would do to catch exactly the kind of bug this dual-data-layer design is prone to.

**Rationale:** a coherent-looking layering diagram doesn't offset a core state-management decision that a real review would reject. Score reflects the decision's actual risk, not the quality of its documentation.

### 3.3 Code Quality & Maintainability — 58/100 (D)
**Strengths**
- Zero `any` usage across all of `src/`; `strict`, `noUnusedLocals`, `noUnusedParameters` are enforced, not just declared.
- No TODO/FIXME/HACK comments and no dead/commented-out code found in sampled files.
- Consistent singleton pattern for services, consistent factory-style test fixtures.

**Gaps — necessary, not sufficient**
- Clean typing and no stray `any` is a baseline expectation on any TypeScript codebase in 2026, not a point of distinction — it should not be pulling this score up as far as the first pass let it.
- Status/priority color-mapping logic is duplicated near-verbatim across at least 6 files (`ProjectCard.tsx`, `ProjectModal.tsx`, `TaskCard.tsx`, `TaskModal.tsx`, `CalendarEventCard.tsx`, `EnterpriseMonitoring.tsx`) instead of one shared utility — exactly the kind of drift-prone duplication that produces inconsistent UI behavior over time.
- `App.tsx` is 587 lines and mixes root composition, tab routing, page-title lookup, and locally-defined helper components in one file. No `max-lines`/complexity lint rule exists to catch this or prevent it from growing further.
- 24 files use raw `console.log/warn/error` as the only logging mechanism — there is no logging abstraction anywhere, which also means there is no way to turn it off in a real deployment (ties into §3.10).
- The CSV export/import code (§3.1, §4) and the service-worker bug (§4) are also code-quality failures, not just security/ops ones: both shipped with a comment admitting the implementation was a placeholder ("Simple CSV conversion - in production, use a proper CSV library"; "Your existing fetch handling logic here"). Shipping code with an explicit comment saying it isn't done is a process failure a code-quality score has to reflect.

### 3.4 Testing & QA — 55/100 (D)
**Strengths**
- 52 test files span nearly every component/service/hook/store/context directory.
- Test quality on the service layer is substantive: `databaseService.test.ts` uses proper builder/factory fixtures and explicitly resets singleton state in `beforeEach`.
- A feature-flag-off variant is explicitly tested, showing some attention beyond the happy path.

**Gaps — the absence that actually matters**
- **Zero E2E/integration coverage of any real user flow.** Not "limited" — zero. Nothing exercises "open a project, edit it in Manage view, switch to Enterprise view, confirm the data" (which, per §3.2, would actually fail), nothing exercises the CSV export/import round-trip (which, per §3.1, is actively broken), nothing exercises a modal end-to-end. For a UI this stateful and interaction-heavy, unit tests on isolated services are necessary scaffolding, not QA — they cannot catch either of the two confirmed bugs in this report, and they didn't.
- The checked-in `coverage/coverage-summary.json` is stale — it reflects a partial run of one file, not the current suite — meaning the one "evidence" artifact a reviewer would reach for is actively misleading rather than just incomplete.
- No accessibility testing (axe/jest-axe) in the suite at all, consistent with §3.9's finding that accessibility wasn't engineered into the components in the first place.
- No mutation testing, no contract/API tests, no visual regression — none of which is exotic for an "enterprise" bar in 2026.
- Test *breadth* across files was the headline metric in the first pass; it's the wrong metric. A QA function is judged by what categories of real bugs it would catch, and on that measure this suite would have caught neither bug in §4.

### 3.5 DevOps / CI-CD / Release Engineering — 30/100 (F)
**Strengths**
- `.github/workflows/ci.yml` runs a real two-job gate (lint → type-check → test:coverage → build, plus `npm audit`) on every push/PR, scoped to `permissions: contents: read`.
- `npm run production-readiness` generates timestamped evidence bundles — a good habit, undermined in practice by the stale coverage artifact noted in §3.4.

**Gaps — this is a lint job with a build step, not release engineering**
- There is no deploy stage, no release stage, no environment promotion (dev/staging/prod) anywhere. `netlify.toml` exists but nothing ever invokes it — it's unused configuration, same pattern as the unused `api.ts` in §3.2.
- **Zero git tags across 65 commits.** `package.json` has sat at `0.2.0` with no version-bump discipline, no `changesets`/`release-please` automation, and a hand-maintained `CHANGELOG.md` that nothing enforces staying in sync with reality.
- Single Node version tested, no matrix, no rollback plan, no canary/blue-green story — none of which is exotic to ask of a CI/CD pipeline claiming production-readiness language ("production-readiness" is literally the npm script's name).
- Calling this "CI/CD" materially overstates it. It is a quality gate. An enterprise reviewer would score the *absence* of a release pipeline, not credit the presence of a lint step.

### 3.6 Dependency & Supply Chain Health — 45/100 (F)
**Strengths**
- `npm audit` reports 0 vulnerabilities at any severity as of this audit.
- `package-lock.json` is committed — reproducible installs.

**Gaps — "0 vulnerabilities" is not supply-chain maturity**
- `npm audit` only reflects publicly known CVEs in the current dependency snapshot at the moment it's run. There is no SBOM, no license-compliance scanning, no SCA tool beyond the stock audit command, and no automated dependency-update pipeline (no `.github/dependabot.yml`, no Renovate) — the one remediation that happened was manual and reactive, flagged by GitHub's passive alerts, not a process.
- Every single dependency in `package.json` is on a loose `^` range, and `npm outdated` shows most of them behind "Latest," several by a major version (React 18→19, `lucide-react` 0.344→1.72+, `react-window` 1.8→2.5). That's version drift accumulating with no automated pressure relieving it.
- `devDependencies` are 748 of 838 total resolved packages — a large, unaudited-by-process install graph for CI to pull on every run, with no dependency-count or install-graph budget enforced anywhere.
- A clean `npm audit` run today says nothing about tomorrow with no automation watching for it — this is a snapshot being reported as a property.

### 3.7 Documentation & Developer Experience — 62/100 (C)
**Strengths**
- README.md + `docs/ARCHITECTURE.md` are genuinely good — tech-stack table, the "two data layers" mental model stated up front, a hooks reference table, an explicit "Gotchas" section.
- An honest "Known Issues" section in the README.
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, CHANGELOG.md, SECURITY.md are all present.

**Gaps — this was the most inflated score in the first pass**
- "A good README" and "enterprise documentation" are different bars. Enterprise documentation for a product this size would include: architecture decision records (why the dual-data-layer choice was made and what was rejected), data-flow/sequence diagrams, a documented incident-response/escalation path, and docs versioned against releases. **None of that exists** — there are two markdown files, no diagrams anywhere in the repo, and no ADRs.
- CONTRIBUTING.md/CODE_OF_CONDUCT.md are standard OSS boilerplate, not organization-specific process documentation — they demonstrate template hygiene, not documented engineering process.
- No `.github/PULL_REQUEST_TEMPLATE.md` or `.github/ISSUE_TEMPLATE/` — no structured intake at all.
- `.github/CODEOWNERS` is a single catch-all line (`* @adityarachuri`) — there is no ownership model to review, just one name.
- The documentation itself documents the problems in §3.1/§3.2/§3.4/§4 (the known-issues section even names the bundle-size problem) but nothing in the docs or process prevented them from shipping. Good prose describing known defects is not the same as good developer experience.

**Rationale:** scored as "a well-written README," which is real but much narrower than "enterprise Documentation & DX," and still the strongest of the ten dimensions — just not an 88.

### 3.8 Performance & Scalability — 52/100 (D)
**Strengths**
- Virtualization is real engineering where it exists: `VirtualizedList`/`VirtualizedTable` are wrapped in `React.memo` with internal `useMemo`/`useCallback`, and `react-window`/`@tanstack/react-virtual` are applied specifically to the large-dataset views.

**Gaps — the thing every user hits first is the thing that's worst**
- The production build ships a single ~1.2MB main JS chunk with zero code-splitting, zero dynamic `import()`, anywhere in the app — confirmed, and Vite warns about it on every single build. This has been true across 65 commits and was never addressed; it's not a new regression, it's a standing, known, unfixed problem.
- `html2canvas` (199KB) loads in the shared bundle instead of behind the PDF-export feature that needs it — every user pays for it on first load whether or not they ever touch PDF export.
- There is **no measurement of real-world performance anywhere** — no Lighthouse CI, no Web Vitals tracking, no bundle-size budget enforced in CI. The only "performance monitoring" is a client-side render timer that logs to a console nobody is watching (see §3.10) — there is no evidence anyone has looked at this app's actual load performance since the warning started appearing.
- Virtualization quality in a handful of components doesn't offset a load-time experience that is actively, measurably bad and has stayed that way. "The hard part is done well" is not the same as "the product performs well" when the easy, standard part — code-splitting — was never done at all.

### 3.9 Accessibility (a11y) — 30/100 (F)
**Strengths**
- `LoginForm.tsx` correctly pairs `<label htmlFor>`/`id` and shows visible focus rings. That's it — this is the one bright spot in the entire dimension.

**Gaps — this is a near-total absence, not "a gap"**
- Only 2 of ~78 `.tsx` files in the entire codebase use `aria-*`/`role=` attributes at all. That's not uneven coverage, that's accessibility not having been engineered into the product.
- Every modal in the app (`ProjectModal`, `TaskModal`, `EventModal`) — the single most-used interactive surface, used for every create/edit action — has no `role="dialog"`, no `aria-modal`, no focus trap, and no `Escape`-to-close. A keyboard-only or screen-reader user cannot reliably use this application's core workflow.
- The icon-only password-visibility toggle has no `aria-label`; the login-error message has no `role="alert"` and never receives focus — a screen-reader user who fails to log in gets no indication why.
- No `eslint-plugin-jsx-a11y`, and `.hintrc`'s a11y checks only run manually, never in CI — there is no automated floor preventing this from getting worse.
- Context matters here: this is a *healthcare-themed* product. In the real enterprise-healthcare-software space this audit is benchmarked against, WCAG 2.1 AA conformance is frequently a contractual requirement, not a nice-to-have. Scored against that bar, this doesn't pass at all.

**Rationale:** one correctly-labeled login form does not offset the core interaction pattern of the app being unusable via keyboard or assistive technology, with no process in place to catch it.

### 3.10 Observability & Operational Readiness — 22/100 (F)
**Strengths**
- `usePerformanceMonitor` is a real render-time tracker, mechanically.
- `public/sw.js` implements real cache/background-sync/push machinery and is registered in production.

**Gaps — instrumentation theater, not observability**
- There is no logging pipeline. `console.*` calls across 24 files don't go anywhere once code leaves a developer's own browser — no log levels, no correlation IDs, no shipping destination. If this were deployed today, nobody would know anything was wrong until a user reported it.
- No error-tracking/APM tool exists (no Sentry/Datadog/LogRocket in `package.json`). This is the direct reason the bug in §4 is still in the codebase: nothing was watching for it, and nothing would have caught it in production either.
- `usePerformanceMonitor`'s "slow render" warning fires into `console.warn` — a signal with no audience. A monitor nobody is watching is not observability; it's the appearance of observability.
- No feature-flag telemetry (`featureFlags.ts` toggles are static booleans), no health-check surface.
- The one piece of genuinely sophisticated infrastructure in the whole repo (the service worker's caching/sync logic) is also the one piece confirmed to have a live, shipped, spec-violating bug — because there was no observability layer to have caught it before this audit did. That correlation is the headline of this dimension, not a footnote.

See §4 for the verified bug this gap allowed to ship undetected.

---

## 4. Critical findings (both verified)

### 4.1 CSV export is a formula-injection vector (CWE-1236)

`src/components/Advanced/DataExportImport.tsx:216-259` (`convertToCSV`) interpolates `project.name` and `task.title` directly into the CSV output — `` `"${project.name}"` `` — with:
- no escaping of embedded `"` characters (malformed output if a name contains a quote), and
- no neutralization of a leading `=`, `+`, `-`, or `@` (the standard Excel/Google Sheets formula-trigger characters).

Both fields are editable by any user through `ProjectModal`/`TaskModal`. A project named `=HYPERLINK("http://attacker.example","click")` or `=cmd|' /C calc'!A0` is written verbatim into the exported file and executes the moment someone opens it in Excel or Sheets. The function's own comment — `// Simple CSV conversion - in production, use a proper CSV library` — is a shipped admission that this was never finished. This is the kind of finding that gets a real export feature pulled from production until it's fixed.

### 4.2 Service worker registers two separate `fetch` listeners, each calling `event.respondWith()` — a spec violation in live, production-registered code.

- `public/sw.js:63` — first `fetch` listener: routes API vs. static requests through real cache-first/network-first logic and calls `event.respondWith(...)`.
- `public/sw.js:352` — a second, independent `fetch` listener ("Performance monitoring") also calls `event.respondWith(handleRequest(event.request)...)` on *every* request.
- Per the Service Worker spec, calling `respondWith()` more than once on the same fetch event is invalid; only the first call is honored, and the second listener's response resolution races it for no benefit.
- `handleRequest()` (`public/sw.js:370-373`) is itself an unfinished stub: `// Your existing fetch handling logic here` followed by `return fetch(request);` — a plain passthrough, confirming this second listener was never actually finished or wired to the real caching logic above it.
- Unrelated: the same file's push-notification title (`'Softique Health Insure'`, `public/sw.js:263`) and its IndexedDB database name (`'HealthInsureOffline'`, lines 312 and 336) are leftover branding from whatever template this service worker was adapted from — never renamed to MediTasker.

Both are registered and running in the shipped app today, not dead code. They're the two highest-value fixes in this report because they're confirmed bugs, not scoring judgment calls — and the fact that two separate, non-trivial bugs were sitting in "passing" code with a green CI badge is itself the most important finding in this audit: the quality gate measures lint/types/unit-tests/build, and none of those four things can see either bug.

---

## 5. Prioritized action items

1. **Fix the CSV export (§4.1).** Use a real CSV library (or at minimum escape embedded quotes and prefix any value starting with `=`/`+`/`-`/`@` with a `'`/tab) before this feature touches another user's spreadsheet.
2. **Fix the service worker (§4.2).** Remove the second `fetch` listener (`public/sw.js:352-368`) or merge its logging into the first listener's existing `respondWith` call; rename the leftover `'Softique Health Insure'` / `'HealthInsureOffline'` strings.
3. **Add E2E coverage for the flows that actually matter.** At minimum: create/edit/delete via a modal, the Manage↔Enterprise view consistency problem from §3.2, and the export/import round-trip. Unit-test breadth will not catch these; nothing currently does.
4. **Make modals keyboard- and screen-reader-accessible.** `role="dialog"`, `aria-modal`, focus trapping, `Escape`-to-close on `ProjectModal`/`TaskModal`/`EventModal`; `aria-label` on icon-only buttons; `role="alert"` on the login-error block. Add `eslint-plugin-jsx-a11y` to lint/CI so this can't silently regress again.
5. **Add a real logging/error-tracking pipeline.** Replace raw `console.*` with a logging abstraction and wire in an error-tracking SDK — this is the control that should have caught both bugs in §4 and didn't, because it doesn't exist.
6. **Decide what the dual-data-layer architecture actually is.** Either reconcile `AppContext` and `databaseService` into one source of truth, or formally document (and test) that they're intentionally separate read/write planes with an explicit sync contract — "disclosed but unreconciled" is not an acceptable long-term state for a real product.
7. **Turn CI into CI/CD and add release automation.** A deploy stage that invokes `netlify.toml`, plus `changesets`/`release-please` so tags and `CHANGELOG.md` stop drifting from `package.json`.
8. **Automate dependency hygiene** (`dependabot.yml`/Renovate) and **code-split the bundle** (lazy-load `html2canvas`/jsPDF, split per-tab chunks) — both long-standing, self-documented, still-unfixed issues.
9. **De-duplicate status/priority color logic** into one shared utility.

---

## 6. Benchmarking references

This audit's weighted-composite approach and category-based scoring model were informed by the following public benchmarking methodologies, as requested:

- [List of benchmarking methods and software tools — Wikipedia](https://en.wikipedia.org/wiki/List_of_benchmarking_methods_and_software_tools)
- [Software Benchmarking Methodology — Redress Compliance](https://redresscompliance.com/software-benchmarking-methodology)
- [G2 Research Scoring Methodologies](https://documentation.g2.com/docs/research-scoring-methodologies)
- [G2: Knowledge Management category](https://www.g2.com/categories/knowledge-management)
- [G2: NinjaOne reviews](https://www.g2.com/products/ninjaone/reviews)

---

*Generated by an automated multi-agent audit (Claude Code) on 2026-11-12 against commit `60f3290`. Re-running `npm run production-readiness` and re-auditing after the action items above are addressed is recommended before treating this score as current.*
