import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  MONTHS,
  calendarCells,
  emptyReflection,
  formatMonthDay,
  formatPretty,
  pctLabel,
  todayISO,
} from "@/lib/lifeos/model";
import { buildScores, heatLevel, monthlyRollups, summarize, weeklyRollups } from "@/lib/lifeos/score";
import { useLife } from "@/lib/lifeos/store";
import { selectData } from "@/lib/lifeos/validate";
import { cn } from "@/lib/utils";
import { Area, Field, Panel } from "./ui";

const HEAT = [
  "bg-heat-empty text-subtle",
  "bg-heat-1 text-fg",
  "bg-heat-2 text-fg",
  "bg-heat-3 text-fg",
  "bg-heat-4 text-heat-ink",
  "bg-heat-5 text-heat-ink",
];

export function BoardView({ onOpenDate }: { onOpenDate: (iso: string) => void }) {
  const data = useLife(selectData);
  const patchReflection = useLife((state) => state.patchReflection);
  const reflections = useLife((state) => state.reflections);
  const today = todayISO();
  const days = useMemo(() => buildScores(data, today), [data, today]);
  const summary = summarize(days, today);
  const weeks = weeklyRollups(days);
  const months = monthlyRollups(days);
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const [chartOn, setChartOn] = useState(false);
  useEffect(() => setChartOn(true), []);

  const kpis = [
    { label: "Today's score", value: summary.todayScore ? pctLabel(summary.todayScore.overall) : "—" },
    { label: "Current streak", value: String(summary.current) },
    { label: "Best streak", value: String(summary.best) },
    { label: "Average to date", value: pctLabel(summary.avgOverall) },
    { label: "Avg do's", value: pctLabel(summary.avgDos) },
    { label: "Avg don'ts avoided", value: pctLabel(summary.avgDonts) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Scores update from the checklists. A good day is 80% or higher — the average of do's done and
          temptations avoided. Averages count every day since 23 Sep through today, including blanks, and skip
          future days. Streak resets on any day under 80%.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Panel key={kpi.label} className="p-4">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className="mt-1 font-display text-3xl font-medium tabular-nums">{kpi.value}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <h2 className="font-display text-2xl font-medium">90-day discipline calendar</h2>
        <p className="mb-3 text-sm text-muted">Darker green means a higher score. Grey means not filled in yet.</p>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid gap-1">
          {calendarCells().map((week, index) => (
            <div key={index} className="grid grid-cols-7 gap-1">
              {week.map((iso, cell) => {
                if (!iso) return <div key={cell} />;
                const day = byDate.get(iso);
                const level = heatLevel(day);
                const future = iso > today;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onOpenDate(iso)}
                    title={`${formatPretty(iso)} · ${day ? pctLabel(day.overall) : "0%"}`}
                    className={cn(
                      "grid h-11 place-items-center rounded-sm text-xs font-medium tabular-nums",
                      HEAT[level],
                      iso === today && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                      future && level === 0 && "opacity-70",
                    )}
                  >
                    {iso.slice(8)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-medium">Weekly score</h2>
        <div className="mt-3 h-56 w-full">
          {chartOn ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks.map((week) => ({ name: `W${week.index}`, score: Math.round(week.overall * 100) }))}>
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "var(--color-inset)" }}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 12,
                    color: "var(--color-fg)",
                  }}
                  formatter={(value) => [`${value}%`, "Overall"]}
                />
                <Bar dataKey="score" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-medium">Weekly summary</h2>
        <ul className="mt-2 divide-y divide-line">
          {weeks.map((week) => {
            const current = today >= week.start && today <= week.end;
            return (
              <li key={week.index} className={cn("grid gap-2 py-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center", current && "font-medium")}>
                <div>
                  <p>{week.label}</p>
                  <p className="text-sm font-normal text-muted">
                    {formatMonthDay(week.start)} – {formatMonthDay(week.end)}
                  </p>
                </div>
                <p className="text-sm text-muted">Do's {pctLabel(week.dosPct)}</p>
                <p className="text-sm text-muted">Don'ts {pctLabel(week.dontsPct)}</p>
                <p className="tabular-nums">{pctLabel(week.overall)}</p>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-medium">Monthly summary</h2>
        <ul className="mt-2 divide-y divide-line">
          {months.map((month) => (
            <li key={month.key} className="grid gap-2 py-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
              <p>{month.label}</p>
              <p className="text-sm text-muted">Do's {pctLabel(month.dosPct)}</p>
              <p className="text-sm text-muted">Don'ts {pctLabel(month.dontsPct)}</p>
              <p className="tabular-nums">{pctLabel(month.overall)}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-medium">Month-end reflection</h2>
        <p className="mb-4 text-sm text-muted">A bigger-picture look back, once a month.</p>
        <div className="space-y-6">
          {MONTHS.map((month) => {
            const entry = reflections[month.key] ?? emptyReflection();
            return (
              <div key={month.key} className="rounded-lg border border-line p-3">
                <h3 className="font-medium">{month.label}</h3>
                <label className="mt-3 block text-sm">
                  What went well?
                  <Area className="mt-1" rows={2} value={entry.well} onChange={(event) => patchReflection(month.key, { well: event.target.value })} />
                </label>
                <label className="mt-3 block text-sm">
                  What didn't?
                  <Area className="mt-1" rows={2} value={entry.didnt} onChange={(event) => patchReflection(month.key, { didnt: event.target.value })} />
                </label>
                <label className="mt-3 block text-sm">
                  Best habit
                  <Field className="mt-1" value={entry.habit} onChange={(event) => patchReflection(month.key, { habit: event.target.value })} />
                </label>
                <label className="mt-3 block text-sm">
                  Focus next month
                  <Area className="mt-1" rows={2} value={entry.focus} onChange={(event) => patchReflection(month.key, { focus: event.target.value })} />
                </label>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
