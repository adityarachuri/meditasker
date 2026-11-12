# meditasker — IP & Licensing Governance

**Repository-specific application of the [LEOS Software Licensing & Intellectual Property Governance Guide](../Software%20Licensing%20&%20Intellectual%20Property%20Governance%20Guide.md)**

| Attribute | Details |
|---|---|
| Repository | [github.com/adityarachuri/meditasker](https://github.com/adityarachuri/meditasker) |
| Platform | GitHub |
| Visibility | Private |
| Description | Project and task management suite for a healthcare-insurance context, with an in-memory indexed data service and role-based accounts |
| Primary language | TypeScript |
| Current license | **MIT** (already declared) |
| Governing framework | LumenStack Engineering Operating System (LEOS) |
| Related repositories | CompliHealth (shares the healthcare-insurance domain) |

---

## 1. Ownership

Original work. No employer, client or third-party ownership claims are known to apply.

## 2. Material inventory

| Material | Present in this repo | Notes |
|---|---|---|
| Application source code | Yes | MIT-licensed |
| In-memory indexed data service | Yes | Code is covered by MIT; any data held or logged by it is not automatically covered |
| Role-based account model | Yes | Authorization logic is code; actual account/user data is not covered by MIT |
| Documentation | Likely | Covered by MIT unless stated otherwise |
| Branding ("meditasker" name) | Product name | Keep outside the MIT grant |

## 3. MIT license — scope and what it does *not* cover

Keeping MIT here is reasonable for a task/project-management reference implementation. As with CompliHealth, clarify in the README/`COPYRIGHT.md` that MIT covers the source code only, not:

- Any real user, account, task, or healthcare-insurance-context data processed by the in-memory data service.
- The "meditasker" product name, if used as a brand.

## 4. Shared domain with CompliHealth

Both repositories operate in the same healthcare-insurance context and may share conceptual models or even code patterns. Per §25.1 of the master guide, do not assume shared code is identically licensed or commonly owned by default:

- If any component is genuinely shared (copied or extracted) between `meditasker` and `CompliHealth`, record which repository is the original source and confirm the MIT license in both is independently applicable to that component.
- If the two projects diverge in licensing intent in the future, resolve this explicitly rather than by inference.

**Finding (2026-11-11).** `public/sw.js` carried leftover, un-rebranded
strings from this same codebase's prior identity — a push-notification
title of `'Softique Health Insure'` and an IndexedDB database name of
`'HealthInsureOffline'` (git history: `f1fd59e` "Start repository" →
`6f5612e` "Rebrand application to MediTasker", both authored by the
repository owner). This confirms common, single-author origin rather than
copied CompliHealth or third-party code, so no ownership conflict — but the
rebrand commit missed these three strings. Fixed by renaming them to
`MediTasker` / `MediTaskerOffline`.
- No component has otherwise been identified in this repo as copied or
  extracted from `CompliHealth`. This item stays open until both
  repositories are reviewed side by side — not possible from this
  repository alone.

## 5. Third-party dependency notes

- Run an npm dependency scan (direct + transitive) per §7.1 of the master guide.
- Review the in-memory data service's dependencies specifically — in-memory/indexing libraries sometimes carry non-permissive or dual licenses; confirm compatibility with MIT.
- Generate an SBOM before any public release, per §8 of the master guide.

**Done (2026-11-11).** See
[docs/evidence/licensing/latest.md](evidence/licensing/latest.md): a
license-checker scan of all 596 direct + transitive dependencies found no
copyleft licenses — every license present (MIT, ISC, Apache-2.0, BSD,
MPL-2.0, Python-2.0, CC-BY-4.0, BlueOak-1.0.0) is permissive or a
permissive-option dual license, and compatible with this project's MIT
license. The in-memory data service (`databaseService.ts`) uses no
third-party in-memory/indexing library — it's hand-rolled on native
`Map`/`Set` — so it carries no additional license exposure. A CycloneDX
SBOM was generated alongside the scan. Re-run before each public release.

## 6. Privacy considerations

Role-based accounts and task data in a healthcare-insurance context may include identifiable personal information about users (names, roles, assigned work) even without clinical data:

- Confirm all fixtures/test data are synthetic.
- Review what the in-memory data service retains and for how long, from a data-minimization standpoint, not just a licensing one.
- Apply §18 of the master guide if real user data is ever introduced.

**Done (2026-11-11).** `src/data/mockData.ts` was checked directly: all
~25 user records use fictitious names paired with a `@meditasker.com`
domain (e.g. `sarah.johnson@meditasker.com`), not real addresses. The
in-memory data service (`databaseService.ts`) holds data only for the
lifetime of the browser session/tab — it is an in-process `Map`/`Set`
store rebuilt from `loadUsers`/`loadProjects`/`loadTasks` on load, with no
persistence layer, so there is nothing to retain beyond that session from a
data-minimization standpoint today. §18 of the master guide remains the
trigger if real user data is ever introduced.

## 7. Pre-release checklist

- [x] MIT license scope note added (code vs. data, accounts, branding). — [README.md](../README.md#license), [COPYRIGHT.md](../COPYRIGHT.md)
- [x] In-memory data service dependencies checked for license compatibility with MIT. — §5
- [x] All seed/test data confirmed synthetic. — §6
- [x] Dependency license scan and SBOM generated. — §5, [docs/evidence/licensing/latest.md](evidence/licensing/latest.md)
- [ ] Shared components with `CompliHealth` have a verified, independent ownership/licensing record. — §4 (needs a side-by-side review of both repos; not resolvable from this repo alone)
- [ ] Privacy review completed if real account/task data is ever introduced. — conditional; stays open until real data is introduced
