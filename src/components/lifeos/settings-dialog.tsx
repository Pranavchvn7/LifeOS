import { useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { createSeed, todayISO, type Habit } from "@/lib/lifeos/model";
import { useLife } from "@/lib/lifeos/store";
import { parseLifeData, selectData } from "@/lib/lifeos/validate";
import { Field } from "./ui";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const dos = useLife((state) => state.dos);
  const donts = useLife((state) => state.donts);
  const renameHabit = useLife((state) => state.renameHabit);
  const addHabit = useLife((state) => state.addHabit);
  const removeHabit = useLife((state) => state.removeHabit);
  const replace = useLife((state) => state.replace);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function exportLog() {
    const payload = { version: 1 as const, ...selectData(useLife.getState()) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifeos-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importLog(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        const body =
          parsed && typeof parsed === "object" && "dos" in parsed ? parsed : null;
        replace(parseLifeData(body));
        setError("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-fg/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="settings-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface p-4 sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="settings-title" className="font-display text-2xl font-medium">
              Your log
            </h2>
            <p className="mt-1 text-sm text-muted">
              Saved to your account, so it follows you when you sign in again. A backup file is there if you want a copy.
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-11 rounded-md border border-line px-3 text-sm">
            Close
          </button>
        </div>

        <div className="account-chip mt-4 rounded-lg border border-line p-3">
          <UserButton />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={exportLog} className="h-11 rounded-md border border-line px-3 text-sm font-medium">
            Export backup
          </button>
          <label className="grid h-11 cursor-pointer place-items-center rounded-md border border-line px-3 text-sm font-medium">
            Import backup
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importLog(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}

        <HabitEditor
          title="Do's"
          habits={dos}
          onRename={(id, label) => renameHabit("dos", id, label)}
          onAdd={(label) => addHabit("dos", label)}
          onRemove={(id) => removeHabit("dos", id)}
        />
        <HabitEditor
          title="Don'ts"
          habits={donts}
          onRename={(id, label) => renameHabit("donts", id, label)}
          onAdd={(label) => addHabit("donts", label)}
          onRemove={(id) => removeHabit("donts", id)}
        />
        <p className="mt-2 text-xs text-subtle">
          Adding or removing a habit changes past percentages, because each day is scored against the current list.
        </p>

        <div className="mt-4 border-t border-line pt-4">
          {confirmReset ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-11 rounded-md bg-bad px-3 text-sm font-medium text-accent-fg"
                onClick={() => {
                  replace(createSeed());
                  setConfirmReset(false);
                  onClose();
                }}
              >
                Reset to the original LifeOS template
              </button>
              <button type="button" className="h-11 rounded-md border border-line px-3 text-sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={() => setConfirmReset(true)}>
              Reset habits and goals to the original template
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitEditor({
  title,
  habits,
  onRename,
  onAdd,
  onRemove,
}: {
  title: string;
  habits: Habit[];
  onRename: (id: string, label: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-2 space-y-2">
        {habits.map((habit) => (
          <li key={habit.id} className="flex gap-2">
            <Field
              defaultValue={habit.label}
              key={habit.label}
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (!next) {
                  event.target.value = habit.label;
                  return;
                }
                if (next !== habit.label) onRename(habit.id, next);
              }}
            />
            <button
              type="button"
              disabled={habits.length <= 1}
              onClick={() => onRemove(habit.id)}
              className="h-11 shrink-0 rounded-md border border-line px-3 text-sm text-muted disabled:opacity-40"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const label = draft.trim();
          if (!label) return;
          onAdd(label);
          setDraft("");
        }}
      >
        <Field value={draft} placeholder={`Add a ${title === "Do's" ? "do" : "don't"}`} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="h-11 shrink-0 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg">
          Add
        </button>
      </form>
    </div>
  );
}
