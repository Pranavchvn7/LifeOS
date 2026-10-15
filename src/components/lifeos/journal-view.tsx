import { MOODS, emptyJournal, formatLong, formatMonthDay, shiftDate } from "@/lib/lifeos/model";
import { useLife } from "@/lib/lifeos/store";
import { isReviewDone } from "@/lib/lifeos/weekly";
import { Panel } from "./ui";

export function JournalView({ onOpenDate }: { onOpenDate: (iso: string) => void }) {
  const journals = useLife((state) => state.journals);
  const oneLines = useLife((state) => state.oneLines);
  const weeklyReviews = useLife((state) => state.weeklyReviews);

  // Every day with something written, across all programs, newest first.
  const dates = [...new Set([...Object.keys(journals), ...Object.keys(oneLines)])]
    .sort()
    .reverse();
  const filled = dates.filter((date) => {
    const entry = journals[date];
    const line = oneLines[date]?.trim();
    if (line) return true;
    if (!entry) return false;
    return entry.mood != null || entry.grateful || entry.win || entry.reflection;
  });

  const reviews = Object.keys(weeklyReviews)
    .filter((monday) => isReviewDone(weeklyReviews[monday]))
    .sort()
    .reverse();

  return (
    <div className="space-y-4" data-testid="journal-view">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-muted">Days you've written. Open one to edit it with that day's habits.</p>
      </div>

      {reviews.length > 0 ? (
        <Panel>
          <h2 className="font-display text-2xl font-medium">Weekly reviews</h2>
          <ul className="mt-2 divide-y divide-line" data-testid="weekly-review-list">
            {reviews.map((monday) => {
              const r = weeklyReviews[monday];
              if (!r) return null;
              return (
                <li key={monday} className="py-3">
                  <details>
                    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                      <span>
                        {formatMonthDay(monday)} – {formatMonthDay(shiftDate(monday, 6))}
                      </span>
                      <span className="text-muted">{r.rating ? `Felt ${r.rating}/5` : "No rating"}</span>
                    </summary>
                    <dl className="mt-2 space-y-2 text-sm">
                      {(
                        [
                          ["Went well", r.wins],
                          ["Was hard", r.struggles],
                          ["Learned", r.lesson],
                          ["Next focus", r.focus],
                        ] as const
                      )
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-xs text-muted">{label}</dt>
                            <dd className="whitespace-pre-wrap">{value}</dd>
                          </div>
                        ))}
                    </dl>
                  </details>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

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
                  data-testid="journal-entry"
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
