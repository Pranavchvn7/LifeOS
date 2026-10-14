import { useEffect, useRef, useState } from "react";
import { BookOpen, LayoutDashboard, ListChecks, Settings, Target } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { clampProgram, createSeed, todayISO } from "@/lib/lifeos/model";
import { getLifeLog, saveLifeLog } from "@/lib/lifeos/life.functions";
import { useLife } from "@/lib/lifeos/store";
import { selectData } from "@/lib/lifeos/validate";
import { cn } from "@/lib/utils";
import { BoardView } from "./board-view";
import { BootScreen } from "./boot-screen";
import { GoalsView } from "./goals-view";
import { JournalView } from "./journal-view";
import { SettingsDialog } from "./settings-dialog";
import { TodayView } from "./today-view";

type View = "today" | "board" | "journal" | "goals";

const NAV: { id: View; label: string; icon: typeof ListChecks }[] = [
  { id: "today", label: "Today", icon: ListChecks },
  { id: "board", label: "Board", icon: LayoutDashboard },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "goals", label: "Goals", icon: Target },
];

export function LifeApp({ userId }: { userId: string }) {
  const ready = useLife((state) => state.ready && state.ownerId === userId);
  const revision = useLife((state) => state.revision);
  const [view, setView] = useState<View>("today");
  const [date, setDate] = useState(() => clampProgram(todayISO()));
  const [settings, setSettings] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [mounted, setMounted] = useState(false);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let cancel = false;
    useLife.getState().markUnready();
    setLoadError("");
    void getLifeLog()
      .then((row) => {
        if (cancel) return;
        useLife.getState().load(userId, row ?? createSeed());
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

  if (!mounted || (!ready && !loadError)) return <BootScreen label="Opening your log" />;
  if (loadError === "unauthorized") return <RedirectToSignIn />;
  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-6 text-center">
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
    setDate(clampProgram(iso));
    setView("today");
  }

  return (
    <div className="min-h-screen bg-paper text-fg">
      <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-[15rem_1fr]">
        <aside className="hidden border-r border-line md:flex md:flex-col md:px-4 md:py-6">
          <p className="font-display text-2xl font-medium tracking-tight">LifeOS</p>
          <p className="mt-1 text-sm text-muted">23 Sep – 21 Dec 2026</p>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
            ))}
          </nav>
          <div className="mt-auto space-y-3 pt-6">
            <SaveNote state={saveState} />
            <button
              type="button"
              onClick={() => setSettings(true)}
              className="flex h-11 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-muted"
            >
              <Settings className="size-4" />
              Account & habits
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-sm md:hidden">
            <p className="font-display text-xl font-medium">LifeOS</p>
            <div className="flex items-center gap-2">
              <SaveNote state={saveState} />
              <button
                type="button"
                aria-label="Account and habits"
                onClick={() => setSettings(true)}
                className="grid size-11 place-items-center rounded-md border border-line bg-surface"
              >
                <Settings className="size-5" />
              </button>
            </div>
          </header>
          <main className="px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
            {view === "today" ? <TodayView date={date} onDate={setDate} /> : null}
            {view === "board" ? <BoardView onOpenDate={openDate} /> : null}
            {view === "journal" ? <JournalView onOpenDate={openDate} /> : null}
            {view === "goals" ? <GoalsView /> : null}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
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
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
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

function SaveNote({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving…" : state === "saved" ? "Saved to your account" : "Not saved";
  return <p className={cn("text-xs", state === "error" ? "text-bad" : "text-subtle")}>{text}</p>;
}
