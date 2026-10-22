<div align="center">

# 🌱 LifeOS — Personal Growth Tracker

**A 90-day discipline and habit tracker with daily checklists, a journal, goals, and a progress board that charts your week, month, and whole program.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-life--os--lake--three.vercel.app-243f34?style=for-the-badge&logo=vercel&logoColor=white)](https://life-os-lake-three.vercel.app/)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel&logoColor=white)

[**Try it live →**](https://life-os-lake-three.vercel.app/)

</div>

-----

## 📸 Screenshots

| Today | Progress board (week) |
|:---:|:---:|
| ![Today view](docs/screenshots/01-today.png) | ![Board - week](docs/screenshots/02-board-week.png) |
| **Progress board (month)** | **Progress board (year)** |
| ![Board - month](docs/screenshots/03-board-month.png) | ![Board - year](docs/screenshots/04-board-year.png) |
| **Goals** | **Journal** |
| ![Goals](docs/screenshots/05-goals.png) | ![Journal](docs/screenshots/06-journal.png) |
| **Mobile** | **Dark mode** |
| ![Mobile](docs/screenshots/07-mobile.png) | ![Dark mode](docs/screenshots/08-dark.png) |

---

## ✨ Features

### Daily tracking
- **Do's checklist** — tick each habit as you finish it, with an optional note per habit.
- **Habit schedules** — make a habit weekdays-only, weekends-only, or any days you like. Days off never break a streak.
- **Don'ts tracker** — mark each temptation as *Avoided* or *Gave in*. Unmarked never counts as avoided, so the score stays honest.
- **One line a day** and a **daily journal** (mood 1–5, gratitude, a win, a short reflection).
- Move between days with previous / next / jump-to-today.

### Progress board (week · month · year)
- **Week / Month / Year** switch with period navigation.
- Summary cards: average score (with change vs the previous period), good days, days logged, current streak.
- Charts: daily or weekly score with an 80% good-day line, 7-day moving average, do's vs don'ts, day breakdown donut, score by weekday, mood vs score.
- **Discipline heat calendar** — tap any day to open it.
- **Past programs** comparison and a **badges** gallery.
- **Per-habit consistency** bars with current streaks.
- Plain-language **insights** (strongest weekday, most skipped habit, what you gave in to most).
- Month-end reflection.

### To-do list
- A dedicated **To-do tab** for one-off tasks: priority, due date, notes, sections for overdue / today / upcoming, filters, and a quick-add panel on the Today page.

### Weekly review, badges & reminders
- **Sunday weekly review** (with Monday catch-up): week summary plus what went well, what was hard, lesson, and next focus. History lives in the Journal tab.
- **Milestone badges** — streaks (3 to 90 days), perfect day, journaling, to-dos, goals, reviews, finishing a program — with progress bars and a toast when you earn one.
- **Daily reminder** and Sunday review nudge (browser notifications while the app is open, plus an in-app banner).

### Programs, sharing & export
- **Start a new program** after day 90 (30 / 60 / 90 / 180 days); finished programs are kept under *Past programs*.
- **Share a view-only link** with a friend or mentor. They see charts, streaks and badges — never notes, journal text, reviews or to-dos. Turn it off any time.
- **Export** to Excel (.xlsx, eight sheets) or CSV, plus a JSON backup you can re-import.
- **Delete my account** removes your data permanently.

### Goals & journal
- Short-term and long-term goals with category, target date, status, progress slider, notes, and overdue flag.
- Journal timeline of every day you've written; open any entry to edit it.

### Accounts & data
- **Email + password accounts** — every user has a private log that follows them across devices.
- **Autosave** to the database (debounced) with a visible saved / saving / not saved state.
- Customize your do's and don'ts, **export / import a JSON backup**, or reset to the template.

### Experience
- 📱 Mobile-first responsive layout (bottom navigation on phones, sidebar on desktop).
- 🌙 Light / dark mode that remembers your choice.
- Personal greeting, streak badge, and one-tap **Log out**.
- Home-screen installable (web app manifest).

---

## 🧮 How scoring works

For each day:

```
Do's score    = habits done / total do's
Don'ts score  = temptations avoided / total don'ts
Daily score   = (Do's score + Don'ts score) / 2
Good day      = Daily score ≥ 80 %
```

- A **streak** counts consecutive good days up to today and resets on any day under 80%.
- Averages count every past day in the period (blank days count as 0%) and ignore future days.

---

## 🛠 Tech stack

| Area | Choice |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + TanStack Router (React 19, SSR) |
| Language | TypeScript |
| Build / server | Vite 8, Nitro (Vercel preset) |
| Styling | Tailwind CSS 4, Radix UI primitives, Lucide icons |
| State | Zustand |
| Charts | Recharts |
| Auth | [Better Auth](https://www.better-auth.com/) (email + password, secure `__Host-` cookies) |
| Database | PostgreSQL (Neon) via `pg`; embedded PGlite for zero-config local dev |
| Hosting | Vercel |

---

## 🗂 Project structure

```
src/
├─ components/lifeos/   # App shell, header, Today, To-do, Board, Goals, Journal, Settings, badges
├─ routes/share.$token  # Public view-only shared page
├─ lib/
│  ├─ lifeos/           # Data model, scoring, badges, export (xlsx/csv), reminders, store, validation
│  ├─ auth/             # Better Auth server + client, session helpers, middleware
│  └─ db.ts             # Postgres (Neon) / PGlite switch + migrations runner
├─ routes/              # File-based routes: /, /login, /api/auth/*
migrations/             # SQL schema (auth tables + app data)
scripts/                # Migration runner, helpers, and their tests
server/                 # Nitro middleware (PWA install page)
```

---

## 🚀 Run locally

**Prerequisites:** a recent Node.js (v20.19+ or v22+) and npm.

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
```

Open **http://localhost:8080**. With no `DATABASE_URL` set, the app uses an embedded in-memory database, so it works out of the box (data resets when the dev server restarts).

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build (also applies DB migrations when `DATABASE_URL` is set) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Run the unit tests |

End-to-end testing guide: [docs/TESTING.md](docs/TESTING.md).

---

## ☁️ Deploy to Vercel

1. Create a free Postgres database (e.g. [Neon](https://neon.tech)) and copy its connection string.
2. Import the repository into Vercel.
3. Add these **environment variables**:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (include `sslmode=require`) |
| `BETTER_AUTH_SECRET` | Long random string — generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Your public URL, e.g. `https://your-app.vercel.app` (no trailing slash) |
| `TRUSTED_ORIGINS` | *(optional)* Extra custom domains, comma-separated |

4. Deploy. The build runs the migrations and creates the tables.

**Setup check:** open `/api/auth/diagnostics` on your deployment — it reports which settings are present (never their values) and whether the database and auth tables are ready.

> **Troubleshooting:** "Invalid origin" on sign-up means the site's URL isn't trusted — set `BETTER_AUTH_URL` to your exact public address and redeploy.

---

## 🔐 Security & privacy

- Each user's data is stored against their own user id and every server call re-verifies the session.
- Session cookies use the `__Host-` prefix (HTTPS only, no cross-subdomain sharing).
- Cross-site scripted requests to server functions are blocked.
- Secrets live in environment variables — never commit a `.env` file.

---

## 🗺 Roadmap

- [x] Daily reminder notifications (while the app is open)
- [x] Weekly review prompt
- [x] Milestone badges
- [x] CSV / Excel export
- [x] Habit schedules (e.g. weekdays only)
- [x] Share progress with a friend or mentor (view-only link)
- [x] Start a new program after day 90
- [x] To-do list
- [ ] End-to-end tests (Playwright) with CI on GitHub Actions — see [docs/TESTING.md](docs/TESTING.md)
- [ ] True background push notifications (needs a service worker + push server)
- [ ] Change-password screen and email verification

---

## 🤖 About this project

LifeOS began as a personal tool for building daily discipline during a 90-day interview-preparation program. The initial scaffold was generated with an AI app builder; I then took it to production myself — debugging and fixing the Vercel deployment and authentication, designing the progress board and analytics, adding the mobile layout and dark mode, and writing this documentation, with Claude as a pair-programming assistant. Developed By Pranav Chavan for Testing.

## 👤 Author

**<Your Name>** — QA Automation Engineer (Playwright + TypeScript)
[LinkedIn](https://www.linkedin.com/in/<your-handle>) · [GitHub](https://github.com/<your-username>)

## 📄 License

MIT — see [LICENSE](LICENSE).
