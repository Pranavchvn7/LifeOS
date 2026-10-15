import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/** Permanently delete the signed-in user's log, share link, sessions and account. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from share_links where user_id = ${context.userId}`;
    await sql`delete from life_logs where user_id = ${context.userId}`;
    // session + account rows cascade from the user row.
    await sql`delete from "user" where "id" = ${context.userId}`;
    return { ok: true as const };
  });
