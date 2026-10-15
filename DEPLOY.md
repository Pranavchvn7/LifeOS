# Deploying LifeOS publicly (Vercel)

1. Create a free Postgres DB (Neon: https://neon.tech) and copy its connection string.
2. In Vercel > Project > Settings > Environment Variables add:
   - `DATABASE_URL`       – the Postgres connection string
   - `BETTER_AUTH_SECRET` – random string (`openssl rand -hex 32`)
   - `BETTER_AUTH_URL`    – your site URL, e.g. `https://your-app.vercel.app`
   - `TRUSTED_ORIGINS`    – (optional) custom domains, comma-separated
3. Redeploy. The build runs `npm run db:migrate` and creates the tables.

Sign-up uses email + password. "Continue with Google/X" only appears on Grok-hosted domains.

## Updating to v4
No new environment variables. The build applies the new `migrations/0003_share_links.sql` automatically
(it adds the table behind "Share my progress"). Run the build once with `DATABASE_URL` set (Vercel does this).
