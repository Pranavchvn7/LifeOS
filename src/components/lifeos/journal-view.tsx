import { MOODS, emptyJournal, formatLong, programDates } from "@/lib/lifeos/model";
import { useLife } from "@/lib/lifeos/store";
import { Panel } from "./ui";

export function JournalView({ onOpenDate }: { onOpenDate: (iso: string) => void }) {
  const journals = useLife((state) => state.journals);
  const oneLines = useLife((state) => state.oneLines);
  const dates = [...programDates()].reverse();
  const filled = dates.filter((date) => {
    const entry = journals[date];
    const line = oneLines[date]?.trim();
    if (line) return true;
    if (!entry) return false;
    return entry.mood != null || entry.grateful || entry.win || entry.reflection;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-muted">Days you've written. Open one to edit it with that day's habits.</p>
      </div>
      {filled.length === 0 ? (
        <Panel>
          <p className="text-muted">Nothing written yet. Add a one-line note on today and it will show up here.</p>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {filled.map((date) => {
            const entry = journals[date] ?? emptyJournal();
            const mood = MOODS.find((item) => item.value === entry.mood);
            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => onOpenDate(date)}
                  className="w-full rounded-xl border border-line bg-surface p-4 text-left"
                >
                  <p className="text-sm text-muted">{formatLong(date)}</p>
                  <p className="mt-1 text-base">{oneLines[date]?.trim() || "No one-liner yet"}</p>
                  <p className="mt-2 text-sm text-muted">
                    {mood ? `Mood ${mood.value} · ${mood.label}` : "No mood"}
                    {entry.win ? ` · Win: ${entry.win}` : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
