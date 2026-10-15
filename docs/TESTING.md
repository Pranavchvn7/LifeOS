# End-to-end testing guide (Playwright + TypeScript)

LifeOS is built to be tested: stable `data-testid` hooks, labelled controls, deterministic scoring, and no hidden
background jobs. Use this as the starting point for the Playwright framework.

## 1. Principles

- **Prefer user-facing locators** (`getByRole`, `getByLabel`, `getByText`). Fall back to `getByTestId` when the UI has
  no unique accessible name (list rows, charts, icon buttons).
- **Never share accounts between tests.** Sign up a fresh user per test file (or worker) with a unique email:
  `` `qa+${Date.now()}-${workerIndex}@example.com` `` and a password of 8+ characters. Email verification is off.
- **Autosave is debounced (~400 ms).** After a change, wait for `getByTestId('save-status')` to read
  *Saved to your account* before reloading or asserting persistence.
- **Control time with `page.clock`** (Playwright 1.45+). The app uses the browser clock, so
  `await page.clock.install({ time: new Date('2026-10-14T10:00:00') })` makes "today", streaks, reminders and the
  Sunday review prompt deterministic. A new account's program starts on the (mocked) day it is created.
- **Check `/api/auth/diagnostics`** in a pre-flight test: `database` must be `connected` and `authTablesComplete` true.

## 2. Suggested structure

```
e2e/
├─ fixtures/        # test.extend: authedPage (signs up once, reuses storageState), clock helpers
├─ pages/           # LoginPage, TodayPage, TodoPage, BoardPage, SettingsDialog, SharePage
├─ tests/
│  ├─ smoke/        # @smoke  – sign up, log a habit, add a task, board renders, log out
│  └─ regression/   # @regression – everything below
├─ data/            # data-driven inputs (habit schedules, task priorities, export formats)
└─ playwright.config.ts   # baseURL from env, trace on first retry, html + allure reporters
```

## 3. Scenario catalogue

| Area | Scenarios |
|---|---|
| Auth | sign up, sign in, wrong password message, duplicate email, log out (`logout-button`), delete account (`delete-account`) |
| Empty state | new user sees no habits and the welcome panel (`setup-add-habits`, `setup-example`); "Start from an example" loads habits |
| Habits | add / rename / remove do and don't (`add-do-input`, `add-do-button`, `remove-do`); schedule weekdays only (`schedule-toggle`, `day-Mon`, `schedule-weekdays`); unscheduled habits hidden with `hidden-habits-note`; rest day (`rest-day`) |
| Today | tick a do (`do-toggle`), mark a don't Avoided/Gave in, score (`score-percent`) = average of do's and don'ts, 80% = good day, previous/next day, one-liner, mood, journal fields |
| To-do | add with priority/due, sections Overdue / Due today / Upcoming / No date, complete, reopen, delete, clear completed, filters (`todo-filter-open/done/all`), Today panel quick-add |
| Board | Week / Month / Year tabs (`range-week` …), previous/next week, month buttons, KPI values vs seeded data, heat calendar tap opens that day, habit consistency bars, badges (`badge`, `data-earned`), past programs |
| Weekly review | appears on Sunday (and Monday catch-up) with the clock mocked; rating + text saves; shows in Journal → Weekly reviews |
| Badges | log 3 good days → "3-day streak" earned; toast on first earn |
| Reminders | enable (`reminder-enabled`), set time, grant `notifications` permission, fast-forward the clock → in-app banner `reminder-banner` |
| Programs | start a new program (`program-start-new` → `program-confirm`), snapshot appears under Board → Year → Past programs, day counter resets |
| Export | `export-xlsx`, `export-csv-daily`, … via `page.waitForEvent('download')`; parse the file and assert rows/headers; JSON backup round-trip (`export-json` → `import-json`) |
| Sharing | create link (`share-create`), open `share-url` in a **new unauthenticated context**: title, charts, no notes/journal text; "New link" invalidates the old URL (`share-missing`); revoke |
| Theme / mobile | dark mode toggle persists after reload; run the smoke suite on a mobile viewport project (bottom nav `nav-mobile-*`) |
| Security | `/share/<bad token>` shows `share-missing`; another user's data is never visible; `/` redirects to `/login` when signed out |

## 4. Data-driven ideas

- Weekday schedules: for each weekday set the clock to that date and assert which habits show.
- Task matrix: priority × due (past / today / future / none) → expected section.
- Export formats: xlsx / csv-daily / csv-habits / csv-todos → expected headers.
- Score table: (do's done, don'ts avoided) → expected % and good-day flag.

## 5. `data-testid` reference

Navigation & shell: `greeting`, `streak-badge`, `theme-toggle`, `logout-button`, `settings-open`, `settings-open-mobile`,
`save-status`, `program-range`, `nav-desktop-{today|todo|board|journal|goals}`, `nav-mobile-{…}`.

Today: `day-number`, `day-title`, `prev-day`, `next-day`, `go-today`, `score-percent`, `rest-day`, `do-list`, `do-item`
(`data-label`, `data-done`), `do-toggle`, `dont-list`, `dont-item` (`data-label`, `data-status`), `dont-avoided`,
`dont-gave-in`, `hidden-habits-note`, `one-line-input`, `mood-1…5`, `journal-grateful|win|reflection`,
`reminder-banner`, `weekly-review-card` (`data-week`), `review-rating-1…5`, `review-wins|struggles|lesson|focus`,
`setup-add-habits`, `setup-example`, `finish-open-settings`, `open-todos`, `todos-today-panel`.

To-do: `todo-view`, `todo-input`, `todo-add`, `todo-priority`, `todo-due`, `today-todo-*` (same set for the Today
panel), `todo-item` (`data-title`, `data-done`), `todo-toggle`, `todo-delete`, `todo-filter-open|done|all`,
`todo-clear-done`, `todo-empty`.

Board: `range-week|month|year`, `week-prev`, `week-next`, `month-YYYY-MM`, `board-setup`, `badges-list`, `badges-count`,
`badge` (`data-badge-id`, `data-earned`), `past-programs`, `past-program`.

Journal & goals: `journal-view`, `journal-entry`, `weekly-review-list`, `goals-view`, `add-goal-short|long`,
`goal-title`, `goal-status`, `goal-progress`.

Settings: `settings-dialog`, `settings-close`, sections `settings-{habits|reminders|program|share|export|danger}`
(each is a `<details>`; click the summary to open), habits `habit-editor-do|dont`, `habit-row-do|dont`,
`add-do-input|button`, `add-dont-input|button`, `remove-do|dont`, `schedule-toggle`, `schedule-editor`, `day-Mon…Sun`,
`schedule-weekdays|weekends|everyday`; reminders `reminder-enabled|time|weekly|permission|test`; program
`program-current|start|length|next-monday|start-new|confirm`; share `share-name|create|url|copy|regenerate|revoke`;
export `export-xlsx|csv-daily|csv-habits|csv-todos|json`, `import-json`; danger `reset-start`, `reset-confirm`,
`delete-confirm-input`, `delete-account`.

Shared page: `share-page`, `share-title`, `share-missing`.

## 6. GitHub Actions outline

```yaml
name: e2e
on: { pull_request: {}, schedule: [{ cron: "0 3 * * *" }] }
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --grep @smoke        # PRs: fast; nightly: whole suite
        env: { BASE_URL: ${{ secrets.E2E_BASE_URL }} }
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report }
```

Run the suite against the Vercel **preview URL** of each PR (or a dedicated staging project with its own Neon branch)
so tests never touch production data.
