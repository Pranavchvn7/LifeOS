import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { createBlank, type LifeData } from "./model";
import { parseLifeData } from "./validate";

const TOKEN = /^[A-Za-z0-9_-]{20,80}$/;

export type ShareStatus = { token: string | null; displayName: string };

/** What a shared link exposes: scores and habit names only — never notes, journal text, or to-dos. */
export type SharedProgress = { name: string; data: LifeData };

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const getShareStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ShareStatus> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ token: string; display_name: string }>`
      select token, display_name from share_links where user_id = ${context.userId}
    `;
    return { token: rows[0]?.token ?? null, displayName: rows[0]?.display_name ?? "" };
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const name = typeof (input as { displayName?: unknown })?.displayName === "string"
      ? ((input as { displayName: string }).displayName).trim().slice(0, 40)
      : "";
    return { displayName: name };
  })
  .handler(async ({ context, data }): Promise<ShareStatus> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const token = randomToken();
    // A new token replaces the old one, so "regenerate" also revokes the previous link.
    await sql`
      insert into share_links (token, user_id, display_name, created_at)
      values (${token}, ${context.userId}, ${data.displayName}, now())
      on conflict (user_id) do update
      set token = excluded.token, display_name = excluded.display_name, created_at = now()
    `;
    return { token, displayName: data.displayName };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from share_links where user_id = ${context.userId}`;
    return { ok: true as const };
  });

/** Public (no sign-in): anyone holding the link can view. Returns null for unknown/revoked tokens. */
export const getSharedProgress = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const token = (input as { token?: unknown })?.token;
    if (typeof token !== "string" || !TOKEN.test(token)) throw new Error("Invalid link.");
    return { token };
  })
  .handler(async ({ data }): Promise<SharedProgress | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const links = await sql<{ user_id: string; display_name: string }>`
      select user_id, display_name from share_links where token = ${data.token}
    `;
    const link = links[0];
    if (!link) return null;
    const logs = await sql<{ payload: string }>`select payload from life_logs where user_id = ${link.user_id}`;
    // A brand-new account has no saved log yet. The link is still valid: show an empty board, not "not available".
    const payload = logs[0]?.payload;
    let full: LifeData;
    if (!payload) {
      full = createBlank();
    } else {
      try {
        full = parseLifeData(JSON.parse(payload) as unknown);
      } catch {
        return null;
      }
    }
    // Strip everything private. Only scores-relevant fields leave the server.
    const stripChecks = <T extends { notes: string }>(src: Record<string, Record<string, T>>) =>
      Object.fromEntries(
        Object.entries(src).map(([date, day]) => [
          date,
          Object.fromEntries(Object.entries(day).map(([id, cell]) => [id, { ...cell, notes: "" }])),
        ]),
      ) as Record<string, Record<string, T>>;
    const safe: LifeData = {
      dos: full.dos,
      donts: full.donts,
      doChecks: stripChecks(full.doChecks),
      dontChecks: stripChecks(full.dontChecks),
      journals: Object.fromEntries(
        Object.entries(full.journals).map(([date, j]) => [date, { mood: j.mood, grateful: "", win: "", reflection: "" }]),
      ),
      oneLines: {},
      goals: full.goals.map((g) => ({ ...g, notes: "" })),
      reflections: {},
      todos: [],
      weeklyReviews: {},
      programStart: full.programStart,
      programDays: full.programDays,
      pastPrograms: full.pastPrograms,
    };
    return { name: link.display_name || "A LifeOS user", data: safe };
  });
