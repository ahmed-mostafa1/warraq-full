# Frontend Contributor Onboarding

Use this checklist to get a fully working environment before you start shipping changes to the frontend. Keep it handy so you can repeat the flow whenever you switch machines.

---

## 1. Prerequisites
- **Git**
- **Node.js 18+** (ships with npm 9+). Use `nvm` if you need multiple versions.
- **PHP 8.2+**, **Composer**, and **SQLite** (only if you intend to run the Laravel backend locally).

> ℹ️ The frontend consumes the Laravel API that lives in the same repository. You can still develop UI-only features without PHP, but you will need the backend running for any feature that hits real endpoints.

---

## 2. Clone the repository
```bash
git clone https://github.com/<owner>/warraq.git
cd warraq
```

If you already have the repo but need the latest changes:
```bash
git fetch origin
git checkout main
git pull origin main
```

---

## 3. Create a working branch
```bash
git checkout -b feature/<short-description>
```

Use focused branches (one feature or fix per branch). Never push directly to `main`.

---

## 4. Backend setup (optional but recommended)
Do this once per machine or whenever dependencies change.

```bash
cd backend
composer install
cp .env.example .env   # overwrite only if .env does not exist
php artisan key:generate

# If you need seed data:
php artisan migrate --force
php artisan db:seed    # optional

# Start the API
php artisan serve      # default: http://127.0.0.1:8000
```

> Keep this terminal running. The frontend dev server proxies API calls to the Laravel server.

---

## 5. Frontend setup
Always run these commands from `warraq/frontend`.

```bash
cd ../frontend
npm install
```

Development server:
```bash
npm run dev
```

Bare minimum environment variables are already committed (`.env.development`). If we add new ones later, copy them from `.env.example` (if provided) and ask the team before committing secrets.

---

## 6. Day-to-day workflow
1. **Sync before you code**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/<short-description>
   git rebase main   # keep history linear
   ```
2. **Develop**
   - Run `npm run dev` and point your browser to the printed Vite URL.
   - For API work, keep `php artisan serve` running.
   - Use TypeScript strictness—fix type warnings before committing.
3. **Lint & test**
   ```bash
   npm run lint          # if configured
   npm run test          # add tests when feasible
   ```
   Run `php artisan test` from `backend/` when you change shared contracts.
4. **Check git status**
   ```bash
   git status
   ```
   Stage only relevant files. Avoid committing build artefacts under `backend/public/assets`.

---

## 7. Commit & push
```bash
git add <paths>
git commit -m "frontend: concise summary of change"
git push origin feature/<short-description>
```

Follow our message style: scope (`frontend`, `backend`, or similar), colon, short summary. Reference ticket IDs when applicable (e.g., `frontend: fix age input (#123)`).

---

## 8. Open a pull request
1. Push your branch.
2. Open a PR against `main`.
3. Fill the template:
   - Problem statement
   - Solution summary
   - Screenshots / screencasts for UI work
   - Tests run (`npm run lint`, `php artisan test`, etc.)
4. Request review from the project owner.

---

## 9. Keeping your branch up to date
While your PR is open:
```bash
git fetch origin
git rebase origin/main
# Resolve conflicts, run tests, then
git push --force-with-lease
```

---

## 10. Troubleshooting
| Issue | Fix |
| --- | --- |
| Frontend fails to fetch API data | Ensure `php artisan serve` is running on `127.0.0.1:8000`, update `frontend/.env.development` if the port differs. |
| TypeScript errors after pulling | Run `npm install` again—dependencies may have changed. |
| `npm run dev` complains about missing env vars | Copy `.env.development` → `.env.local` and override values as needed. |
| SQLite locking errors | Stop other Laravel processes accessing the database, or delete `backend/database/database.sqlite` and rerun migrations (dev only). |

---

Welcome aboard! Ping the repo owner if you hit blockers, and keep this guide updated whenever the setup flow changes.***
