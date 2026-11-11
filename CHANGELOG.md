# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.2.0 — 2026-11-11

### Added

- A "Manage" view on the Projects and Tasks pages, alongside the existing
  "Enterprise" (big-data, virtualized/paginated) view — backed by live app
  state, with advanced search, per-field filters, and bulk operations
  (multi-select status/priority/tag updates, archiving, deletion).
- Infinite-scroll card view for the Enterprise Projects/Tasks pages.
- A Data Export/Import panel on the Reports page (JSON/CSV).
- A collapsible sidebar, with the preference persisted across reloads.
- Notification list switches to a virtualized render once the history grows
  past a handful of entries.
- App settings (theme, font size, sidebar state, etc.) now persist to
  `localStorage` instead of resetting on every reload.
- Comprehensive test coverage for the services, hooks, store, and context
  layers (database service, paginated-data hook, global store, app/auth
  context, API client, etc.) — overall statement coverage raised from ~20%
  to ~45%.

### Fixed

- Search filters typed into `usePaginatedData` were written to a ref but
  never reached the actual service/API calls — search silently did nothing.
- `useGlobalStore`'s Map/Set state mutations threw at runtime (Immer's
  MapSet plugin was never enabled).
- Multi-day calendar events were only indexed by their start date, so they
  disappeared from every other day they spanned.
- `AuthContext`'s `login`/`logout` had unstable function identity, causing
  an infinite render loop in `LoginForm`; it now delegates to the
  already-tested `authService` instead of duplicating its logic inline.
- `Header` rendered its session-manager slot twice (duplicate prop
  declaration + duplicate render).
- A duplicated "Copyright and Disclaimer" block in `LoginForm` was rendered
  twice.
- Removed several files that were fully built but never imported anywhere
  (`AdvancedSearch`, `BulkOperations`, `DataExportImport`, `VirtualizedList`,
  a duplicate `useAuth`/`useLocalStorage`/`useInfiniteScroll`/
  `useVirtualization`, and `authService`) by wiring each into a real,
  working feature instead of deleting it — see Added above.

### Changed

- Upgraded Vite 5 → 8 and `@vitejs/plugin-react` to clear a high-severity
  dependency advisory; removed the unused `workbox-webpack-plugin`
  dependency (it pulled in the other high-severity advisory and was never
  referenced in code).
- `VirtualizedList` now renders via `@tanstack/react-virtual` internally
  instead of `react-window` (same external API).

### Security

- `npm audit --audit-level=high` now passes clean (down from 35 findings,
  including 2 high-severity, to 14 low/moderate — all in dev-only build
  tooling).
