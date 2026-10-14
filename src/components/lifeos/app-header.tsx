import { useMemo, useState, useSyncExternalStore } from "react";
import { Flame, LogOut, Moon, Settings, Sun } from "lucide-react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser, type AppUser } from "@/lib/auth/use-current-user";
import { formatLong, todayISO } from "@/lib/lifeos/model";
import { buildScores, currentStreak } from "@/lib/lifeos/score";
import { useLife } from "@/lib/lifeos/store";
import type { Theme } from "@/lib/lifeos/theme";
import { cn } from "@/lib/utils";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(user: AppUser | null): string {
  const name = user?.displayName?.trim();
  if (name) return name.split(/\s+/)[0] as string;
  const email = user?.primaryEmail;
  if (email) return email.split("@")[0] as string;
  return "there";
}

export function AppHeader({
  theme,
  onToggleTheme,
  onSettings,
  saveNote,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  onSettings: () => void;
  saveNote: string;
}) {
  const user = useCurrentUser();
  const dos = useLife((state) => state.dos);
  const donts = useLife((state) => state.donts);
  const doChecks = useLife((state) => state.doChecks);
  const dontChecks = useLife((state) => state.dontChecks);
  const today = todayISO();
  const streak = useMemo(
    () =>
      currentStreak(
        buildScores(
          { dos, donts, doChecks, dontChecks, journals: {}, oneLines: {}, goals: [], reflections: {} },
          today,
        ),
        today,
      ),
    [dos, donts, doChecks, dontChecks, today],
  );

  const gateSession = useSyncExternalStore(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
  const canSignOut = authEnabled && !gateSession;
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  function logout() {
    setSignOutError(false);
    setSigningOut(true);
    // Success navigates away; on failure let the visitor retry.
    void signOut().catch(() => {
      setSigningOut(false);
      setSignOutError(true);
    });
  }

  const iconBtn =
    "grid size-11 shrink-0 place-items-center rounded-md border border-line bg-surface text-fg";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-medium leading-tight md:text-2xl">
            {greeting()}, {firstName(user)}
          </p>
          <p className="truncate text-xs text-muted md:text-sm">
            {formatLong(today)}
            {saveNote ? <span className={saveNote === "Not saved" ? "text-bad" : "text-subtle"}> · {saveNote}</span> : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {streak > 0 ? (
            <span
              className="hidden h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium sm:flex"
              title="Current streak of good days (80%+)"
            >
              <Flame className="size-4 text-accent" />
              {streak}-day streak
            </span>
          ) : null}
          <button
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={onToggleTheme}
            className={iconBtn}
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <button type="button" aria-label="Account and habits" onClick={onSettings} className={cn(iconBtn, "md:hidden")}>
            <Settings className="size-5" />
          </button>
          {canSignOut ? (
            <button
              type="button"
              onClick={logout}
              disabled={signingOut}
              aria-label="Log out"
              className="flex h-11 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg disabled:opacity-60 md:px-4"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{signingOut ? "Logging out…" : "Log out"}</span>
            </button>
          ) : null}
        </div>
      </div>
      {signOutError ? (
        <p className="px-4 pb-2 text-xs text-bad md:px-8">Couldn't log out. Check your connection and try again.</p>
      ) : null}
    </header>
  );
}
