import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { deleteMyAccount } from "@/lib/lifeos/account.functions";
import { buildExportSheets, downloadBlob, exportFileName, toCsv, xlsxBytes } from "@/lib/lifeos/export";
import {
  PROGRAM_LENGTHS,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  formatMonthDay,
  mondayOf,
  programOf,
  scheduleLabel,
  shiftDate,
  todayISO,
  type Habit,
} from "@/lib/lifeos/model";
import { showNotification, useReminderPrefs } from "@/lib/lifeos/reminders";
import { createShareLink, getShareStatus, revokeShareLink } from "@/lib/lifeos/share.functions";
import { useLife } from "@/lib/lifeos/store";
import { useLifeData } from "@/lib/lifeos/use-life-data";
import { cn } from "@/lib/utils";
import { Field } from "./ui";

const btn = "h-11 rounded-md border border-line px-3 text-sm font-medium";
const btnPrimary = "h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg disabled:opacity-60";

export function Section({
  id,
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} data-testid={`settings-${id}`} className="group mt-3 rounded-lg border border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <span>
          <span className="block text-sm font-medium">{title}</span>
          {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
        </span>
        <span aria-hidden className="text-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-line px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}

// ── habits with weekday schedules ───────────────────────────────────────────

export function HabitEditor({ kind, title }: { kind: "dos" | "donts"; title: string }) {
  const habits = useLife((s) => s[kind]);
  const renameHabit = useLife((s) => s.renameHabit);
  const addHabit = useLife((s) => s.addHabit);
  const removeHabit = useLife((s) => s.removeHabit);
  const setHabitDays = useLife((s) => s.setHabitDays);
  const [draft, setDraft] = useState("");
  const noun = kind === "dos" ? "do" : "don't";
  const slug = kind === "dos" ? "do" : "dont";

  return (
    <div className="mt-4 first:mt-0" data-testid={`habit-editor-${slug}`}>
      <h3 className="text-sm font-medium">{title}</h3>
      {habits.length === 0 ? <p className="mt-2 text-sm text-muted">None yet. Add your first {noun} below.</p> : null}
      <ul className="mt-2 space-y-3">
        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            slug={slug}
            onRename={(label) => renameHabit(kind, habit.id, label)}
            onRemove={() => removeHabit(kind, habit.id)}
            onDays={(days) => setHabitDays(kind, habit.id, days)}
          />
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const label = draft.trim();
          if (!label) return;
          addHabit(kind, label);
          setDraft("");
        }}
      >
        <Field
          aria-label={`Add a ${noun}`}
          data-testid={`add-${slug}-input`}
          value={draft}
          placeholder={`Add a ${noun}`}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" data-testid={`add-${slug}-button`} className={cn(btnPrimary, "shrink-0")}>
          Add
        </button>
      </form>
    </div>
  );
}

function HabitRow({
  habit,
  slug,
  onRename,
  onRemove,
  onDays,
}: {
  habit: Habit;
  slug: string;
  onRename: (label: string) => void;
  onRemove: () => void;
  onDays: (days: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(habit.days && habit.days.length < 7 ? habit.days : []);

  function toggle(day: number) {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onDays([...next]);
  }

  return (
    <li data-testid={`habit-row-${slug}`}>
      <div className="flex gap-2">
        <Field
          aria-label="Habit name"
          defaultValue={habit.label}
          key={habit.label}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (!next) {
              event.target.value = habit.label;
              return;
            }
            if (next !== habit.label) onRename(next);
          }}
        />
        <button type="button" data-testid={`remove-${slug}`} onClick={onRemove} className={cn(btn, "shrink-0 text-muted")}>
          Remove
        </button>
      </div>
      <button
        type="button"
        data-testid="schedule-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-1 h-9 text-xs text-muted underline-offset-2 hover:underline"
      >
        Schedule: {scheduleLabel(habit)}
      </button>
      {open ? (
        <div className="mt-1 space-y-2" data-testid="schedule-editor">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_ORDER.map((day) => {
              const on = selected.has(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  data-testid={`day-${WEEKDAY_NAMES[day]}`}
                  onClick={() => toggle(day)}
                  className={cn("h-10 min-w-11 rounded-md px-2 text-sm font-medium", on ? "bg-accent text-accent-fg" : "bg-inset text-muted")}
                >
                  {WEEKDAY_NAMES[day]}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" data-testid="schedule-weekdays" className="h-9 text-muted underline" onClick={() => onDays([1, 2, 3, 4, 5])}>
              Weekdays
            </button>
            <button type="button" data-testid="schedule-weekends" className="h-9 text-muted underline" onClick={() => onDays([0, 6])}>
              Weekends
            </button>
            <button type="button" data-testid="schedule-everyday" className="h-9 text-muted underline" onClick={() => onDays([])}>
              Every day
            </button>
          </div>
          <p className="text-xs text-subtle">Habits only count (and show up) on their scheduled days. Days off never break a streak.</p>
        </div>
      ) : null}
    </li>
  );
}

// ── reminders ───────────────────────────────────────────────────────────────

export function ReminderSection() {
  const { prefs, permission, update, enable } = useReminderPrefs();

  return (
    <div className="space-y-3" data-testid="reminder-section">
      <p className="text-sm text-muted">
        Reminders work on this device while LifeOS is open in a tab or the installed app. They aren't sent when the app is
        closed.
      </p>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          data-testid="reminder-enabled"
          className="size-5"
          checked={prefs.enabled}
          onChange={(event) => {
            if (event.target.checked) void enable();
            else update({ enabled: false });
          }}
        />
        Daily reminder to log my day
      </label>
      <label className="flex items-center gap-3 text-sm">
        Remind me at
        <input
          type="time"
          data-testid="reminder-time"
          value={prefs.time}
          onChange={(event) => update({ time: event.target.value || "20:00" })}
          className="h-11 rounded-md border border-line bg-paper px-2 text-base"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          data-testid="reminder-weekly"
          className="size-5"
          checked={prefs.weekly}
          onChange={(event) => update({ weekly: event.target.checked })}
        />
        Also nudge me about my weekly review on Sundays
      </label>
      <p className="text-xs text-subtle" data-testid="reminder-permission">
        {permission === "granted"
          ? "Notifications are allowed in this browser."
          : permission === "denied"
            ? "Notifications are blocked in this browser. You'll still see an in-app reminder banner."
            : permission === "unsupported"
              ? "This browser doesn't support notifications. You'll still see an in-app reminder banner."
              : "Turn the reminder on to allow notifications."}
      </p>
      <button
        type="button"
        data-testid="reminder-test"
        className={btn}
        onClick={async () => {
          const ok = await showNotification("LifeOS", "This is a test reminder.");
          if (ok) toast.success("Test notification sent");
          else toast("Notifications aren't allowed here, but in-app reminders still work.");
        }}
      >
        Send a test notification
      </button>
    </div>
  );
}

// ── export ──────────────────────────────────────────────────────────────────

export function ExportSection({ onImportError, onImported }: { onImportError: (m: string) => void; onImported: () => void }) {
  const data = useLifeData();
  const replace = useLife((s) => s.replace);
  const today = todayISO();

  function download(kind: "xlsx" | "daily" | "habits" | "todos" | "json") {
    try {
      if (kind === "xlsx") {
        const bytes = xlsxBytes(data, today);
        downloadBlob(
          exportFileName("export", "xlsx", today),
          new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        );
      } else if (kind === "json") {
        downloadBlob(
          exportFileName("backup", "json", today),
          new Blob([JSON.stringify({ version: 1, ...data }, null, 2)], { type: "application/json" }),
        );
      } else {
        const sheets = buildExportSheets(data, today);
        const wanted = kind === "daily" ? "Daily summary" : kind === "habits" ? "Habit log" : "To-dos";
        const sheet = sheets.find((s) => s.name === wanted);
        if (!sheet) return;
        downloadBlob(
          exportFileName(kind === "daily" ? "daily-summary" : kind === "habits" ? "habit-log" : "todos", "csv", today),
          new Blob([toCsv(sheet.rows)], { type: "text/csv;charset=utf-8" }),
        );
      }
      toast.success("Export ready");
    } catch {
      toast.error("Couldn't create that export.");
    }
  }

  return (
    <div className="space-y-3" data-testid="export-section">
      <p className="text-sm text-muted">
        Excel workbook with sheets for your daily scores, full habit log, habits, to-dos, goals, journal, weekly reviews and
        programs. CSV files open in Excel and Google Sheets.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="export-xlsx" className={btnPrimary} onClick={() => download("xlsx")}>
          Excel workbook (.xlsx)
        </button>
        <button type="button" data-testid="export-csv-daily" className={btn} onClick={() => download("daily")}>
          Daily summary (.csv)
        </button>
        <button type="button" data-testid="export-csv-habits" className={btn} onClick={() => download("habits")}>
          Habit log (.csv)
        </button>
        <button type="button" data-testid="export-csv-todos" className={btn} onClick={() => download("todos")}>
          To-dos (.csv)
        </button>
      </div>
      <div className="border-t border-line pt-3">
        <p className="mb-2 text-sm text-muted">Full backup you can restore later (replaces what's in the app).</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="export-json" className={btn} onClick={() => download("json")}>
            Export backup (.json)
          </button>
          <label className={cn(btn, "grid cursor-pointer place-items-center")}>
            Import backup
            <input
              type="file"
              accept="application/json"
              data-testid="import-json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const parsed = JSON.parse(String(reader.result)) as unknown;
                    if (!parsed || typeof parsed !== "object" || !("dos" in parsed)) throw new Error("That isn't a LifeOS backup.");
                    void import("@/lib/lifeos/validate").then(({ parseLifeData }) => {
                      try {
                        replace(parseLifeData(parsed));
                        onImported();
                      } catch (err) {
                        onImportError(err instanceof Error ? err.message : "Could not read that file.");
                      }
                    });
                  } catch (err) {
                    onImportError(err instanceof Error ? err.message : "Could not read that file.");
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── sharing ─────────────────────────────────────────────────────────────────

export function ShareSection() {
  const user = useCurrentUser();
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    void getShareStatus()
      .then((status) => {
        if (cancel) return;
        setToken(status.token);
        setName(status.displayName || user?.displayName?.trim().split(/\s+/)[0] || "");
        setLoaded(true);
      })
      .catch(() => {
        if (!cancel) {
          setError("Sharing isn't available right now.");
          setLoaded(true);
        }
      });
    return () => {
      cancel = true;
    };
  }, [user?.displayName]);

  const url = token ? `${window.location.origin}/share/${token}` : "";

  async function create() {
    setBusy(true);
    setError("");
    try {
      const status = await createShareLink({ data: { displayName: name } });
      setToken(status.token);
      toast.success(token ? "New link created. The old one no longer works." : "Share link created");
    } catch {
      setError("Couldn't create the link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await revokeShareLink();
      setToken(null);
      toast.success("Sharing turned off");
    } catch {
      setError("Couldn't turn sharing off. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="share-section">
      <p className="text-sm text-muted">
        Give a friend or mentor a private, view-only link to your progress charts, streaks, badges and habit names. They never
        see your notes, journal text, one-liners, reviews or to-dos, and they can't edit anything. Anyone with the link can
        view it until you turn it off.
      </p>
      {!loaded ? <p className="text-sm text-muted">Loading…</p> : null}
      {loaded && !token ? (
        <>
          <label className="block text-sm font-medium">
            Name shown on the shared page
            <Field
              className="mt-1"
              data-testid="share-name"
              value={name}
              maxLength={40}
              placeholder="e.g. Asha"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="button" data-testid="share-create" disabled={busy} className={btnPrimary} onClick={create}>
            Create share link
          </button>
        </>
      ) : null}
      {token ? (
        <>
          <Field readOnly aria-label="Share link" data-testid="share-url" value={url} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="share-copy"
              className={btnPrimary}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                } catch {
                  toast("Select the link and copy it manually.");
                }
              }}
            >
              Copy link
            </button>
            <button type="button" data-testid="share-regenerate" disabled={busy} className={btn} onClick={create}>
              New link
            </button>
            <button type="button" data-testid="share-revoke" disabled={busy} className={cn(btn, "text-bad")} onClick={revoke}>
              Turn off sharing
            </button>
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

// ── program ─────────────────────────────────────────────────────────────────

export function ProgramSection({ onDone }: { onDone: () => void }) {
  const data = useLifeData();
  const startNewProgram = useLife((s) => s.startNewProgram);
  const program = programOf(data);
  const today = todayISO();
  const nextMonday = shiftDate(mondayOf(today), 7);
  const [start, setStart] = useState(today);
  const [length, setLength] = useState<number>(90);
  const [keepHabits, setKeepHabits] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const over = today > program.end;

  return (
    <div className="space-y-3" data-testid="program-section">
      <p className="text-sm" data-testid="program-current">
        Current program: {formatMonthDay(program.start)} – {formatMonthDay(program.end)} {program.end.slice(0, 4)} ({program.days} days)
        {over ? " · finished" : ""}
      </p>
      <p className="text-sm text-muted">
        Starting a new program saves this one's results to your history (see Board → Year → Past programs) and opens a fresh
        window. Your logged days, journal, goals and to-dos stay.
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Start
          <input
            type="date"
            data-testid="program-start"
            value={start}
            onChange={(event) => setStart(event.target.value || today)}
            className="h-11 rounded-md border border-line bg-paper px-2 text-base"
          />
        </label>
        <button type="button" className="h-11 text-muted underline" onClick={() => setStart(today)}>
          Today
        </button>
        <button type="button" data-testid="program-next-monday" className="h-11 text-muted underline" onClick={() => setStart(nextMonday)}>
          Next Monday
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Length
        <select
          data-testid="program-length"
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
          className="h-11 rounded-md border border-line bg-paper px-2 text-base"
        >
          {PROGRAM_LENGTHS.map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="size-5" checked={keepHabits} onChange={(event) => setKeepHabits(event.target.checked)} />
        Keep my current do's and don'ts
      </label>

      {confirm ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="program-confirm"
            className={btnPrimary}
            onClick={() => {
              startNewProgram({ start, days: length, keepHabits }, today);
              setConfirm(false);
              toast.success(`New ${length}-day program starts ${formatMonthDay(start)}`);
              onDone();
            }}
          >
            Yes, start the new program
          </button>
          <button type="button" className={btn} onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" data-testid="program-start-new" className={btnPrimary} onClick={() => setConfirm(true)}>
          Start a new program…
        </button>
      )}
    </div>
  );
}

// ── danger zone ─────────────────────────────────────────────────────────────

export function DangerSection({ onDone }: { onDone: () => void }) {
  const replace = useLife((s) => s.replace);
  const [confirmReset, setConfirmReset] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    setDeleting(true);
    setError("");
    try {
      await deleteMyAccount();
      await signOut().catch(() => undefined);
      window.location.href = "/login";
    } catch {
      setDeleting(false);
      setError("Couldn't delete your account. Please try again.");
    }
  }

  return (
    <div className="space-y-4" data-testid="danger-section">
      <div>
        {confirmReset ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="reset-confirm"
              className="h-11 rounded-md bg-bad px-3 text-sm font-medium text-accent-fg"
              onClick={async () => {
                const { createBlank } = await import("@/lib/lifeos/model");
                replace(createBlank());
                setConfirmReset(false);
                onDone();
              }}
            >
              Yes, erase everything and start over
            </button>
            <button type="button" className={btn} onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" data-testid="reset-start" className={cn(btn, "text-bad")} onClick={() => setConfirmReset(true)}>
            Start over: clear all habits, goals, to-dos and logged days
          </button>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <p className="text-sm font-medium">Delete my account</p>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your account, your whole log and any share link. This can't be undone. Type DELETE to confirm.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Field
            aria-label="Type DELETE to confirm"
            data-testid="delete-confirm-input"
            className="max-w-40"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="DELETE"
          />
          <button
            type="button"
            data-testid="delete-account"
            disabled={typed !== "DELETE" || deleting}
            className="h-11 rounded-md bg-bad px-3 text-sm font-medium text-accent-fg disabled:opacity-40"
            onClick={deleteAccount}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
      </div>
    </div>
  );
}
