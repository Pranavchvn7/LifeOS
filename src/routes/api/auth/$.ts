import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Safe setup check: open https://<your-site>/api/auth/diagnostics
 * Reports which settings are present (never their values) and whether the
 * database is reachable with the auth tables created.
 */
async function diagnostics(): Promise<Response> {
  const has = (k: string) => Boolean(process.env[k]?.trim());
  const report: Record<string, unknown> = {
    DATABASE_URL: has("DATABASE_URL"),
    BETTER_AUTH_SECRET: has("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: has("BETTER_AUTH_URL"),
    onVercel: has("VERCEL"),
  };
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_name in ('user','session','account','verification')",
    );
    report.database = "connected";
    report.authTables = rows.map((r) => r.table_name).sort();
    report.authTablesComplete = rows.length === 4;
  } catch (err) {
    report.database = "FAILED";
    report.databaseError = err instanceof Error ? err.message : String(err);
  }
  return new Response(JSON.stringify(report, null, 2), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new URL(request.url).pathname === "/api/auth/diagnostics"
          ? diagnostics()
          : auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
