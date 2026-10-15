import { useMemo } from "react";
import { emptyWeeklyReview, formatMonthDay, pctLabel, shiftDate, todayISO } from "@/lib/lifeos/model";
import { useLife } from "@/lib/lifeos/store";
import { useLifeData } from "@/lib/lifeos/use-life-data";
import { isReviewDone, weekStats } from "@/lib/lifeos/weekly";
import { cn } from "@/lib/utils";
import { Area, Panel } from "./ui";

/** Reflect on one Mon–Sun week. `monday` is the Monday of that week (YYYY-MM-DD). */
export function WeeklyReviewCard({ monday, title }: { monday: string; title?: string }) {
  const data = useLifeData();
  const review = useLife((s) => s.weeklyReviews[monday]) ?? emptyWeeklyReview();
  const patch = useLife((s) => s.patchWeeklyReview);
  const today = todayISO();
  const stats = useMemo(() => weekStats(data, monday, today), [data, monday, today]);
  const done = isReviewDone(review);

  return (
    <Panel className="space-y-4" >
      <div data-testid="weekly-review-card" data-week={monday}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-medium">{title ?? "Weekly review"}</h2>
          <p className="text-sm text-muted">
            {formatMonthDay(monday)} – {formatMonthDay(shiftDate(monday, 6))}
            {done ? " · saved" : ""}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="Avg score" value={stats.elapsedDays ? pctLabel(stats.avgOverall) : "—"} />
          <Mini label="Good days" value={stats.elapsedDays ? `${stats.goodDays}/${stats.elapsedDays}` : "—"} />
          <Mini label="Logged" value={stats.elapsedDays ? `${stats.filledDays}/${stats.elapsedDays}` : "—"} />
        </div>

        <p className="mb-2 mt-4 text-sm font-medium">How did this week feel overall?</p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = review.rating === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                aria-label={`Rate week ${n} out of 5`}
                data-testid={`review-rating-${n}`}
                onClick={() => patch(monday, { rating: active ? null : n })}
                className={cn("h-11 rounded-md text-sm font-medium", active ? "bg-accent text-accent-fg" : "bg-inset text-muted")}
              >
                {n}
              </button>
            );
          })}
        </div>

        {(
          [
            ["wins", "What went well?", "review-wins"],
            ["struggles", "What was hard?", "review-struggles"],
            ["lesson", "What did I learn?", "review-lesson"],
            ["focus", "One focus for next week", "review-focus"],
          ] as const
        ).map(([key, label, testId]) => (
          <label key={key} className="mt-3 block text-sm font-medium">
            {label}
            <Area
              className="mt-1"
              rows={2}
              maxLength={4000}
              data-testid={testId}
              value={review[key]}
              onChange={(event) => patch(monday, { [key]: event.target.value })}
            />
          </label>
        ))}
      </div>
    </Panel>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-inset px-2 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}
