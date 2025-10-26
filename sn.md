# System Notes for Warraq

## Repository Layout
- `frontend/` – React + TypeScript front-end for the party membership dashboard. Bundled with Vite, styled via Tailwind, localized with i18next, and state-managed by Redux Toolkit.
- `backend/` – Laravel 12 API for the desktop bundle. Members CRUD and health endpoints landed in Phase 3.
- `docs/` – Planning artefacts and dev tooling:
  - Phase 1 scope (`phase-1-plan.md`), CSV guidance (`import-rules.md`), and canonical sample dataset (`sample-import.csv`).
  - Phase 2 API contract (`api-contract.md`) and example payloads under `docs/examples/` (requests, responses, errors, OpenAPI spec).
  - Phase 4 additions: REST Client smoke tests (`api-tests.http`).
- `.vscode/` – Tasks, launch config, and workspace settings to boot Laravel + Vite together.
- `ENVIRONMENT.md` – Summary of Laravel/React environment conventions (dev vs packaged).

## Front-end Highlights (`frontend/`)
- Entry point: `src/main.tsx` mounts `<App />`; routing is handled in `src/App.tsx` with React Router.
- Global state: Redux store (`src/store.ts`) combines `authSlice` and `membersSlice`. Async thunks in `membersSlice` wrap `CsvService`, which reads/writes member data via the File System Access API with a `data/members.csv` fallback.
- Authentication: `authSlice` implements a local-only credential list with session persistence stored in `localStorage`. See allowed users in `src/slices/authSlice.ts`.
- Data flow: `hooks/useMembersData.ts` triggers `getMembers` and `getMemberStats` on load and exposes a refresh pathway for dashboard widgets (`src/views/Dashboard.tsx`) and table views (`src/views/MembersTable.tsx`).
- UI composition: Shared components live under `src/components/`:
  - `components/ui/` holds primitive building blocks (cards, buttons, inputs).
  - `components/charts/` wraps Recharts visualisations used on analytics pages.
  - `components/animations/` contains Framer Motion powered helpers.
  - `TopNav.tsx` and `Sidebar.tsx` orchestrate layout + navigation; `PermissionGuard.tsx` reacts to `authSlice` permissions.
- Styling: Tailwind CSS (configured in `tailwind.config.js`) plus CSS modules under `src/styles/`. Dark mode is toggled by `ThemeContext`.
- Internationalisation: `src/i18n.ts` initialises Arabic as default; translation resources sit in `src/locales/`.
- API wiring: Phase 3 introduced `src/lib/api.ts` (axios client leveraging `VITE_API_BASE_URL`) and `src/services/members.ts` for REST calls. `.env.development` / `.env.production` both pin the base path to `/api`, and `vite.config.ts` proxies `/api` to the Laravel server during dev.
- Connectivity test: `src/components/ConnectivityTest.tsx` pings `/health` and lists members (first five rows) to confirm end-to-end connectivity; `README.md` documents how to mount/remove it during development.
- Data import/export: legacy local CSV flow still lives in `services/enhancedCsvService.ts`, while API-ready helpers (`importMembersExcel`, `exportMembersExcel`) reside in `src/services/members.ts`.
- Testing: No automated tests are configured (`npm test` exits immediately).

### Local Members Data
- Default CSV schema: see header row in `data/members.csv`. A richer sample exists in `docs/sample-import.csv`.
- `CsvService` caches parsed members in `localStorage` as `members_data`.
- Filters/search/statistics are computed client-side; see helper functions inside `membersSlice`.
- To seed demo data, populate `data/members.csv` with matching headers or extend `CsvService.importFromExcel`.

## Back-end Status (`backend/`)
- Framework: Laravel 12, PHP ≥ 8.2 with SQLite.
- Routing: `routes/api.php` serves `/health` and RESTful `/members` endpoints via `MemberController`.
- Database: Migration `2025_01_16_000001_create_members_table.php` provisions the `members` table (unique nullable `national_id`, enum `gender`/`status`, indexed `unit`/`membership_type`/`status`).
- Domain model: `App\Models\Member` defines fillable attributes and casts `dob`.
- Validation: `StoreMemberRequest` and `UpdateMemberRequest` enforce name length, enum checks, future-date guard, and uniqueness rules.
- Controller: `MemberController` implements search (name/national_id), filters, 20-per-page pagination, and CRUD responses using standard JSON envelopes.
- Storage: `database/database.sqlite` expected; ensure writable path before running `php artisan migrate`. `MemberSeeder` (50 rows) can refresh sample data quickly.
- Tooling scripts (composer/npm) unchanged; queue/log processes optional for offline build.
- Upcoming work: extend seeding (users/roles) and introduce authentication.

## Cross-Cutting Considerations
- API Contract: Front-end HTTP calls route through `src/lib/api.ts` (default base `/api`); dev proxy in `vite.config.ts` forwards to Laravel at `127.0.0.1:8000`.
- Localization: Any new strings must be added to the Arabic translation files to avoid runtime `t()` fallbacks.
- Permissions: Use `authSlice`’s `permissions` array (`read`, `write`, `delete`, `export`, `import`, `admin`) when gating UI functionality. Mirror these on the server when available.
- Data Validation: Client-side validation leverages `react-hook-form`. Align server-side validation rules to prevent divergent behaviour when the API is implemented.
- Deployment: `netlify.toml` exists for the front-end; configure Netlify build to run `npm run build`. For Laravel, plan on containerization or Laravel Forge deployment.
- Developer tooling: `.vscode/tasks.json` compound task (`Dev: Laravel + React`) and `launch.json` streamline startup; `docs/api-tests.http` enables quick REST checks via VS Code REST Client.
- Environment reference: `ENVIRONMENT.md`, `backend/.env.example`, and `frontend/.env.*` keep API base aligned at `/api`; Vite proxy handles CORS in dev (README documents Laravel CORS fallback).
- Import/export: Excel/CSV handled through `ExportImportController`; failure reports saved in `storage/app/import_failures`, downloadable via `GET /api/import-failures/{id}`; React services provide upload/download helpers.

## Phase 1 Documentation
- `docs/phase-1-plan.md` captures agreed scope, schema, validation, stats, and backup policy for the offline MVP.
- `docs/import-rules.md` explains CSV preparation guidelines, upsert behaviour, and error-reporting expectations for admins.
- `docs/sample-import.csv` provides 12 representative rows (valid, invalid, upsert, and boolean variations) aligned with the import template.

## Phase 2 API Planning
- `docs/api-contract.md` defines conventions, endpoints (members CRUD, import/export, stats, backup, health), validation expectations, and error semantics for the forthcoming Laravel API.
- `docs/examples/requests.json` & `responses.json` furnish example payloads aligned with the contract (valid/invalid POST, PUT, import multipart, stats, backup).
- `docs/examples/errors.json` standardises representative error envelopes (422, 404, 409, 413, 500).
- `docs/examples/openapi.yaml` provides an OpenAPI 3.1 blueprint that mirrors the contract for tooling or client generation.
- Development base URL stays `http://127.0.0.1:8000/api`; production bundle served at `/api`.

## Phase 4 Developer Experience
- `ENVIRONMENT.md` describes how Laravel/React env vars work across dev and packaged builds.
- `.vscode/tasks.json` + `launch.json` enable “Dev: Laravel + React” one-click startup and browser launch.
- `docs/api-tests.http` hosts REST Client snippets (health, members CRUD) for instant smoke checks.
- `backend/database/seeders/MemberSeeder.php` builds 50 Arabic demo members; README documents reset workflow.
- Root `README.md` consolidates prerequisites, setup, proxy/CORS notes, and troubleshooting tips.

## Phase 5 Import/Export
- `ExportImportController` exposes `POST /api/members/import`, `GET /api/members/export`, and `GET /api/import-failures/{id}`.
- `app/Imports/MembersImport` performs row trimming, normalisation (status defaults to `active`, booleans → true/false), validation, and upserts by `national_id`.
- Failures are captured via `ImportFailureReporter` and saved under `storage/app/import_failures/{id}.csv` with row metadata and error descriptions.
- `MembersExport` streams CSV/XLSX with canonical headings and boolean values mapped to `1`/`0`.
- React services (`importMembersExcel`, `exportMembersExcel`) wrap the API endpoints; see README/docs for curl and component snippets.
- `docs/import-rules.md` now documents failure reports, and `docs/import-export-tests.md` lists manual smoke tests for imports/exports.

## Phase 6 Statistics
- `StatsController@index` calculates totals, gender/unit/membership breakdowns, and age buckets using SQLite aggregates with a configurable cache (`config/stats.php`, `STATS_TTL`).
- `/api/stats` supports `?cache=0` to bypass the short-lived cache (default 30s).
- React `getStats` service and `StatsPreview` component provide quick integration tests; README notes how to embed the preview temporarily.
- `docs/stats.md` captures definitions, bucket edges, cache behaviour, and manual testing tips.

## Phase 7 Backup
- `BackupController@download` streams a ZIP from `/api/backup` containing a consistent SQLite snapshot (`vacuum into` when available, file copy fallback).
- `BackupService` manages temp workspace creation under `storage/app/backup_tmp`, snapshot generation, zipping, and cleanup.
- Configurable parameters live in `config/backup.php`; `.env` exposes `BACKUP_USE_VACUUM` and production data dir hints.
- React `downloadBackup` service plus the commented `BackupButton` snippet show how to trigger downloads from the UI.
- `docs/data-backup.md` documents backup flow, manual restore, and safety considerations; `docs/api-tests.http` includes REST Client snippets.

## Phase 8 Production Build Flow
- React production build (`npm run build:prod`) emits assets under `frontend/dist` with sourcemaps disabled and `/api` base.
- Scripts `scripts/copy_dist_to_public.(sh|ps1)` push the build into `backend/public/` while preserving `index.php`, `uploads/`, and API endpoints.
- Laravel `routes/web.php` now serves `public/index.html` for any non-API path to support SPA deep links.
- `.env.example` defaults to production-safe values; `config/backup.php`/`config/stats.php` already referenced.
- Documentation: `docs/release-checklist.md` (end-to-end release flow + smoke tests) and `docs/laravel-prod.md` (caching, permissions, logging).

## Run & Build Commands
```bash
# Front-end
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build

# Back-end
cd backend
composer install
cp .env.example .env   # adjust DB creds
php artisan key:generate
php artisan migrate
php artisan serve      # http://127.0.0.1:8000
```
- To align ports with the front-end, expose Laravel at `:5000` (e.g., `php artisan serve --host=127.0.0.1 --port=5000`) or set `VITE_API_BASE_URL` in `.env` files.

## Knowledge Gaps / TODOs
- Extend seeders to include auth users/roles once authentication lands.
- Shift Redux slices from local CSV service to REST-backed thunks once the API-driven workflow replaces the legacy CSV hooks.
- Implement stats and backup endpoints outlined in Phase 2.
- Replace hard-coded auth with Laravel Breeze/Sanctum or alternative IdP.
- Add automated testing (PHPUnit for Laravel, Vitest/RTL for React) and CI integration.
- Document environment variables (front-end `.env` for API URL, back-end `.env` for DB/mail/queue settings).

---
Maintaining this file: update sections when significant architectural changes land (new modules, API adjustments, deployment targets) so future AI agents can operate with minimal discovery time.
