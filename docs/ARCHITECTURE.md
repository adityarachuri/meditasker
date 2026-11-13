# Architecture

Technical documentation for engineers working on this codebase. For what the
app does and how to run it, see the [README](../README.md); for the "why"
behind specific decisions over time, see the [CHANGELOG](../CHANGELOG.md).

## Overview

MediTasker is a **frontend-only single-page app**: React + TypeScript,
bundled with Vite, with every "backend" behavior simulated in the browser.
There is no server, no database, and no network calls to anything other than
`localStorage`/`sessionStorage`. Understanding this codebase is mostly about
understanding which in-browser layer owns which piece of state, because
there are two parallel data stacks that look similar but serve different
purposes (see [Two data layers](#two-data-layers-read-this-first) below
— read that section first).

## Tech stack

| Concern | Choice |
| --- | --- |
| UI framework | React 18 (function components + hooks only, no class components) |
| Language | TypeScript 5, strict mode |
| Build tool | Vite 8 (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS (utility classes directly in JSX) |
| Icons | lucide-react |
| Global client state | Zustand (`src/store/globalStore.ts`) |
| App/domain state | React Context + `useReducer` (`src/context/`) |
| Async data fetching shape | TanStack React Query's `QueryClient` is configured (`src/services/api.ts`) but not yet used by any component — current data fetching goes through the custom hooks/services below instead |
| Virtualization | `react-window` (tables/lists) and `@tanstack/react-virtual` (generic virtualized list) |
| Forms | React Hook Form + Yup |
| Charts | Recharts |
| PDF export | jsPDF + jsPDF-AutoTable |
| Testing | Jest + React Testing Library + ts-jest, jsdom environment |

## Directory structure

```text
src/
  App.tsx              # Root component: providers, tab routing, feature flags, bootstrapping
  main.tsx             # Entry point: React root, exposes databaseService on window for debugging
  config/
    featureFlags.ts     # Static on/off switches read by several components
  context/
    AppContext.tsx      # Domain state: users/projects/tasks/notifications/activities/settings
    AuthContext.tsx      # Auth state: current user, token, loading/error
  store/
    globalStore.ts      # Zustand store: cross-cutting UI state (selection, filters, cache)
  services/
    api.ts               # Generic HTTP client + React Query client config (not yet wired up)
    authService.ts        # Login/logout/token-refresh simulation
    sessionService.ts      # Session lifecycle: idle timeout, storage, activity tracking
    calendarService.ts      # Calendar event CRUD + date-range indexing
    databaseService.ts       # In-memory "big data" store: indexed users/projects/tasks
  data/
    mockData.ts           # Small, fixed seed arrays used by AppContext
    mockDataGenerator.ts    # Procedural generator used to seed databaseService
  hooks/                    # Shared hooks (see Hooks section)
  components/               # Feature-organized UI; one folder per feature area
  types/                     # Shared TypeScript types (domain + calendar)
  utils/                     # Small standalone utilities
```

Tests live next to what they test, in a `__tests__/` folder per directory
(e.g. `src/services/__tests__/databaseService.test.ts`).

## Two data layers (read this first)

The app has **two independent, unsynchronized representations of
users/projects/tasks**. Neither is "the real one" — they coexist on purpose:

1. **`AppContext`** (`src/context/AppContext.tsx`) — a `useReducer` holding
   plain arrays (`state.users`, `state.projects`, `state.tasks`, ...), seeded
   once from the small fixed dataset in `src/data/mockData.ts` (a handful of
   users/projects/tasks). This is the layer that supports real CRUD:
   dispatching `ADD_TASK` / `UPDATE_PROJECT` / `DELETE_TASK` etc. actually
   mutates this state, and components like `ProjectModal`/`TaskModal` write
   through it. `state.settings` is the one slice that's persisted (synced to
   `localStorage` under the `app-settings` key via `useLocalStorage`) — see
   `AppProvider`'s effect.

2. **`databaseService`** (`src/services/databaseService.ts`) — a singleton
   with `Map`-based primary and secondary indexes (by department, role,
   project, assignee, status, ...), seeded by `DataInitializer`
   (`src/components/Performance/DataInitializer.tsx`) calling
   `mockDataGenerator.generate{Users,Projects,Tasks}(n)` on mount (currently
   50 users / 25 projects / 100 tasks — the "1M+ records" copy in the UI is
   aspirational framing for the pagination/virtualization machinery, not an
   actual record count). This layer is read-only from the UI's perspective:
   it supports paginated/filtered/cached *queries* (`getUsers`, `getTasks`,
   `searchGlobal`, ...) via `usePaginatedData`, but has no update/delete
   methods at all.

**Where this shows up in the UI:** the Projects and Tasks pages each have an
**Enterprise** view (backed by `databaseService` via
`ProjectListVirtualized`/`TaskListVirtualized` — virtualized table or
infinite-scroll cards, read-only, built for exploring a large dataset) and a
**Manage** view (backed by `AppContext` via `ProjectList`/`TaskList` — plain
cards with search, filters, and bulk edit/delete). If you're adding a feature
that needs to *persist a change*, you want `AppContext`'s dispatch, not
`databaseService`. If you're adding something that needs to *scale to a lot
of rows*, you want `databaseService` + `usePaginatedData`.

## State management

- **`AuthContext`** — `{ state: { user, token, isAuthenticated, isLoading,
  error }, login, logout, clearError }`. `login`/`logout` delegate to
  `authService`; don't duplicate that logic in a component. Consume it via
  the `useAuth` hook in `src/hooks/useAuth.ts` (a thin re-export of
  `AuthContext`'s `useAuth`, plus `useRequireAuth`/`useRequireRole` guard
  hooks) rather than importing the context directly, so the hooks layer stays
  the stable import path if the underlying context ever changes.
- **`AppContext`** — see above. Also owns `notifications` and `activities`
  (an activity-feed log that several reducer cases append to automatically,
  e.g. creating a task also prepends an `activities` entry).
- **`globalStore` (Zustand)** — cross-cutting UI state that doesn't belong to
  either domain context: multi-select (`selectedItems`, used by
  `BulkOperations`), project/task filter state, and a generic
  `cache`/`lastUpdated` `Map` pair. Uses the `immer` and
  `subscribeWithSelector` middlewares. **Important:** `enableMapSet()` from
  `immer` must stay called at module load (top of `globalStore.ts`) — the
  store's `selectedItems`/`cache`/`lastUpdated` fields are `Set`/`Map`, and
  Immer throws at runtime on any mutation of those without it.

## Services

All services in `src/services/` are exported as singletons (`export const x
= X.getInstance()`), not classes you instantiate yourself.

- **`authService`** — `login(email, password)` simulates a network delay,
  validates against a fixed in-memory user list, and on success calls
  `sessionService.startSession` and schedules a token refresh. `logout()`
  clears the refresh timer and ends the session.
- **`sessionService`** — owns the actual session lifecycle: idle-timeout
  tracking via DOM activity listeners, `configure()` to switch between
  `sessionStorage` (default) and `localStorage` (when "remember me" is set),
  and a listener registry (`addListener`) that `useSession` subscribes to.
- **`databaseService`** — see [Two data layers](#two-data-layers-read-this-first).
  Also tracks lightweight performance metrics (`getPerformanceMetrics`,
  `getHealthStatus`) purely for the `EnterpriseMonitoring` UI widget.
- **`calendarService`** — calendar event CRUD with date-range indexing: an
  event spanning multiple days is indexed under every day it touches (via
  `getDateKeysForSpan`), not just its start date, so it shows up correctly in
  every calendar view.
- **`api.ts`** — a generic `ApiClient` (retry with backoff, timeout, auth
  header injection from `sessionService`) plus typed endpoint helpers
  (`userApi`, `projectApi`, `taskApi`, `searchApi`, `analyticsApi`) and a
  configured React Query `QueryClient`. None of this currently has a real
  server to call — it's fully tested (mocked `fetch`) but not yet wired into
  any component. Treat it as the seam where a real backend would plug in.

## Hooks

| Hook | Purpose |
| --- | --- |
| `usePaginatedData<T>(type, opts)` | Pagination/search/caching over `databaseService`'s `getUsers`/`getProjects`/`getTasks` |
| `useCalendar` | Loads/filters calendar events via `calendarService` |
| `useSession` | Subscribes a component to `sessionService`'s active/expired state |
| `useAuth` | Re-exports `AuthContext`'s `useAuth`; also provides `useRequireAuth`/`useRequireRole` |
| `useDebounce` | Generic value debouncer |
| `useLocalStorage<T>(key, initial)` | `useState` backed by `localStorage`, used by `AppContext` (settings) |
| `useInfiniteScroll` | IntersectionObserver-based "load more" sentinel, used by the Enterprise card views |
| `useVirtualization` | Thin wrapper over `@tanstack/react-virtual`'s `useVirtualizer`, used internally by `VirtualizedList` |
| `usePerformanceMonitor` | Records render timings for the `EnterpriseMonitoring` widget |

## Component organization

One folder per feature area under `src/components/` (`Auth`, `Dashboard`,
`Projects`, `Tasks`, `Calendar`, `Team`, `Reports`, `Settings`,
`Notifications`, `Layout`, `Performance`, `Advanced`). `App.tsx` is the only
place that does tab-based "routing" — there's no router library; the active
tab is plain `useState` and `renderContent()` is a switch statement.

A few components are generic/reusable rather than feature-specific, and live
under `Performance/`: `VirtualizedList` (generic windowed list, backed by
`useVirtualization`) and `VirtualizedTable` (generic windowed table with its
own scroll-triggered pagination, used by the Enterprise Projects/Tasks table
view).

## Testing

Jest + React Testing Library against jsdom (`src/setupTests.ts` mocks
`IntersectionObserver`/`ResizeObserver` globally, since several hooks/
components depend on them). `ts-jest-mock-import-meta` shims Vite's
`import.meta.env` for Jest, since ts-jest's CommonJS output can't represent
`import.meta` natively — see `jest.config.js`.

Coverage is 100% (statements/branches/functions/lines) across the whole
`src/` tree and enforced via `coverageThreshold` in `jest.config.js` - a PR
that drops coverage fails `npm run test:coverage` (and CI) outright. A small
number of lines that are genuinely unreachable (e.g. a `default:` case on an
exhaustive union already covered by every real value) are marked with a
documented `/* istanbul ignore next -- reason */` rather than left to inflate
the denominator or chased with a contrived test. Run `npm run test:coverage`
and check `docs/evidence/production-readiness/latest.md` for current numbers.

## Build & deployment

`npm run build` produces a static `dist/` via Vite — no server-side
rendering, no API routes. `netlify.toml` configures the build command,
publish directory, and an SPA fallback redirect (`/*` → `/index.html`) for
whichever host serves it. `public/_headers` sets security headers (CSP,
HSTS, etc.) in the format Netlify/Cloudflare Pages read automatically.

## Gotchas worth knowing before you dig in

- **`React.StrictMode` is deliberately disabled** in `main.tsx` ("prevents
  double rendering" — a real tradeoff, not an oversight: it means effects
  that aren't idempotent won't get caught by React's double-invoke-in-dev
  behavior).
- **`databaseService` and `mockDataGenerator` are singletons** (`getInstance()`),
  so in tests, either reset their internal state between tests (see
  `databaseService.test.ts`'s `beforeEach`) or construct a fresh instance
  with `new MockDataGenerator()` where that's exposed.
- **Feature flags** (`src/config/featureFlags.ts`) gate whether
  `AdvancedSearch`/`BulkOperations`/`DataExportImport` render at all; they're
  all `true` today, but the plumbing exists if you need to turn one off.
- **The "Enterprise (1M+ records)" framing is UI copy, not reality** — see
  [Two data layers](#two-data-layers-read-this-first). Don't be
  surprised that `databaseService`'s seeded dataset is small.
