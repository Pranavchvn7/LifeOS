import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, LayoutDashboard, ListChecks, ListTodo, Settings, Target } from "lucide-react";
import { Toaster, toast } from "sonner";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { clampProgram, createBlank, formatMonthDay, programOf, todayISO } from "@/lib/lifeos/model";
import { computeBadges } from "@/lib/lifeos/badges";
import { useReminderEngine } from "@/lib/lifeos/reminders";
import { buildScores } from "@/lib/lifeos/score";
import { useLifeData } from "@/lib/lifeos/use-life-data";
import { isReviewDone, reviewWeekFor } from "@/lib/lifeos/weekly";
import { getLifeLog, saveLifeLog } from "@/lib/lifeos/life.functions";
import { useLife } from "@/lib/lifeos/store";
import { selectData } from "@/lib/lifeos/validate";
import { useTheme } from "@/lib/lifeos/theme";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";
import { BoardView } from "./board-view";
import { BootScreen } from "./boot-screen";
import { GoalsView } from "./goals-view";
import { JournalView } from "./journal-view";
import { SettingsDialog } from "./settings-dialog";
import { TodayView } from "./today-view";
import { TodoView } from "./todo-view";

type View = "today" | "todo" | "board" | "journal" | "goals";

const NAV: { id: View; label: string; icon: typeof ListChecks }[] = [
  { id: "today", label: "Today", icon: ListChecks },
  { id: "todo", label: "To-do", icon: ListTodo },
  { id: "board", label: "Board", icon: LayoutDashboard },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "goals", label: "Goals", icon: Target },
];

export function LifeApp({ userId }: { userId: string }) {
  const ready = useLife((state) => state.ready && state.ownerId === userId);
  const revision = useLife((state) => state.revision);
  const [view, setView] = useState<View>("today");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [mounted, setMounted] = useState(false);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const { theme, toggle: toggleTheme } = useTheme();
  const data = useLifeData();
  const program = programOf(data);
  const today = todayISO();
  // Follows today until the visitor navigates; always kept inside the program window.
  const date = clampProgram(pickedDate ?? today, program);
  const setDate = setPickedDate;

  const todayScore = useMemo(() => buildScores(data, today).find((d) => d.date === today), [data, today]);
  const hasHabits = data.dos.length + data.donts.length > 0;
  const reviewMonday = reviewWeekFor(today);
  const { due: reminderDue } = useReminderEngine({
    today,
    needsLogToday: hasHabits && !!todayScore && !todayScore.rest && !todayScore.filled,
    reviewPending: reviewMonday !== null && !isReviewDone(data.weeklyReviews[reviewMonday]),
    onFire: useCallback((message: string) => toast(message), []),
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let cancel = false;
    useLife.getState().markUnready();
    setLoadError("");
    void getLifeLog()
      .then((row) => {
        if (cancel) return;
        useLife.getState().load(userId, row ?? createBlank());
      })
      .catch((err: unknown) => {
        if (cancel) return;
        const message = err instanceof Error ? err.message : "";
        setLoadError(message === "Unauthorized" ? "unauthorized" : "Could not open your log.");
      });
    return () => {
      cancel = true;
    };
  }, [mounted, userId]);

  useEffect(() => {
    if (!ready || revision === 0) return;
    const handle = window.setTimeout(() => {
      const rev = useLife.getState().revision;
      const snapshot = selectData(useLife.getState());
      setSaveState("saving");
      chain.current = chain.current
        .then(async () => {
          if (useLife.getState().revision !== rev) return;
          await saveLifeLog({ data: snapshot });
          if (useLife.getState().revision === rev) setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [ready, revision]);

  // Celebrate newly earned badges (the first run only records what's already earned).
  const earnedIds = useMemo(
    () => (ready ? computeBadges(data, today).filter((b) => b.earned).map((b) => b.id) : []),
    [ready, data, today],
  );
  const earnedKey = earnedIds.join(",");
  useEffect(() => {
    if (!ready) return;
    const storageKey = `lifeos-badges-${userId}`;
    try {
      const seenRaw = window.localStorage.getItem(storageKey);
      if (seenRaw !== null) {
        const seen = new Set(seenRaw.split(",").filter(Boolean));
        const fresh = computeBadges(data, today).filter((b) => b.earned && !seen.has(b.id));
        fresh.forEach((b) => toast.success(`New badge: ${b.title}`, { description: b.description }));
      }
      window.localStorage.setItem(storageKey, earnedKey);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, earnedKey, userId]);

  if (!mounted || (!ready && !loadError)) return <BootScreen label="Opening your log" />;
  if (loadError === "unauthorized") return <RedirectToSignIn />;
  if (loadError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-2xl">LifeOS</p>
          <p className="mt-2 text-sm text-muted">{loadError}</p>
          <button
            type="button"
            className="mt-4 h-11 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
            onClick={() => {
              setLoadError("");
              setMounted(false);
              window.setTimeout(() => setMounted(true), 0);
            }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  function openDate(iso: string) {
    setDate(clampProgram(iso, program));
    setView("today");
  }

  return (
    <div className="min-h-dvh bg-paper text-fg">
      <div className="mx-auto grid min-h-dvh max-w-6xl md:grid-cols-[15rem_1fr]">
        <aside className="hidden border-r border-line md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:px-4 md:py-6">
          <p className="font-display text-2xl font-medium tracking-tight">LifeOS</p>
          <p className="mt-1 text-sm text-muted" data-testid="program-range">
            {formatMonthDay(program.start)} – {formatMonthDay(program.end)} {program.end.slice(0, 4)}
          </p>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} testId={`nav-desktop-${item.id}`} />
            ))}
          </nav>
          <div className="mt-auto space-y-3 pt-6">
            <SaveNote state={saveState} />
            <button
              type="button"
              data-testid="settings-open"
              onClick={() => setSettings(true)}
              className="flex h-11 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-muted"
            >
              <Settings className="size-4" />
              Account &amp; settings
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <AppHeader
            theme={theme}
            onToggleTheme={toggleTheme}
            onSettings={() => setSettings(true)}
            saveNote={saveNoteText(saveState)}
          />
          <main className="px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
            {view === "today" ? (
              <TodayView
                date={date}
                onDate={setDate}
                onSetup={() => setSettings(true)}
                onOpenTodos={() => setView("todo")}
                reminderDue={reminderDue}
              />
            ) : null}
            {view === "todo" ? <TodoView /> : null}
            {view === "board" ? <BoardView data={data} onOpenDate={openDate} onSetup={() => setSettings(true)} /> : null}
            {view === "journal" ? <JournalView onOpenDate={openDate} /> : null}
            {view === "goals" ? <GoalsView /> : null}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`nav-mobile-${item.id}`}
            onClick={() => setView(item.id)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
              view === item.id ? "text-accent" : "text-muted",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
      <Toaster position="top-center" theme={theme} richColors closeButton />
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
  testId,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium",
        active ? "bg-surface text-fg" : "text-muted",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </button>
  );
}

function saveNoteText(state: "idle" | "saving" | "saved" | "error"): string {
  if (state === "idle") return "";
  return state === "saving" ? "Saving…" : state === "saved" ? "Saved to your account" : "Not saved";
}

function SaveNote({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  const text = saveNoteText(state);
  if (!text) return null;
  return (
    <p data-testid="save-status" className={cn("text-xs", state === "error" ? "text-bad" : "text-subtle")}>
      {text}
    </p>
  );
}
