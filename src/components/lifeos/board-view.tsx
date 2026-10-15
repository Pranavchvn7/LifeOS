import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarCells,
  emptyReflection,
  formatMonthDay,
  formatPretty,
  pctLabel,
  programMonths,
  programOf,
  programWeeks,
  todayISO,
  type LifeData,
} from "@/lib/lifeos/model";
import {
  buildScores,
  habitStats,
  heatLevel,
  moodAverages,
  rangeStats,
  summarize,
  weekdayAverages,
  type DayScore,
  type HabitStat,
} from "@/lib/lifeos/score";
import { useLife } from "@/lib/lifeos/store";
import { cn } from "@/lib/utils";
import { BadgesPanel } from "./badges-panel";
import { Area as TextArea, Field, Panel } from "./ui";

type Range = "week" | "month" | "year";

const HEAT = [
  "bg-heat-empty text-subtle",
  "bg-heat-1 text-fg",
  "bg-heat-2 text-fg",
  "bg-heat-3 text-fg",
  "bg-heat-4 text-heat-ink",
  "bg-heat-5 text-heat-ink",
];

const AXIS = { fill: "var(--color-muted)", fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  borderRadius: 12,
  color: "var(--color-fg)",
  fontSize: 13,
} as const;

const pct = (ratio: number) => Math.round(ratio * 100);
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function scoreColor(score: number | null): string {
  if (score === null) return "var(--color-heat-empty)";
  if (score >= 80) return "var(--color-good)";
  if (score >= 50) return "var(--color-heat-3)";
  return "var(--color-heat-2)";
}

function indexFor(list: readonly { start: string; end: string }[], today: string): number {
  const found = list.findIndex((item) => today >= item.start && today <= item.end);
  if (found >= 0) return found;
  const first = list[0];
  return first && today < first.start ? 0 : Math.max(0, list.length - 1);
}

export function BoardView({
  data,
  readOnly = false,
  onOpenDate,
  onSetup,
}: {
  data: LifeData;
  /** Shared (view-only) mode: no editing, no links to other screens. */
  readOnly?: boolean;
  onOpenDate?: (iso: string) => void;
  onSetup?: () => void;
}) {
  const patchReflection = useLife((state) => state.patchReflection);
  const { dos, donts, journals, reflections } = data;

  const today = todayISO();
  const program = useMemo(() => programOf(data), [data.programStart, data.programDays]); // eslint-disable-line react-hooks/exhaustive-deps
  const WEEKS = useMemo(() => programWeeks(program), [program]);
  const MONTHS = useMemo(() => programMonths(program), [program]);
  const days = useMemo(() => buildScores(data, today), [data, today]);
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const overall = useMemo(() => summarize(days, today), [days, today]);

  const [range, setRange] = useState<Range>("week");
  const [weekPick, setWeekIdx] = useState(() => indexFor(WEEKS, today));
  const [monthPick, setMonthIdx] = useState(() => indexFor(MONTHS, today));
  const weekIdx = Math.min(weekPick, WEEKS.length - 1);
  const monthIdx = Math.min(monthPick, MONTHS.length - 1);

  // 7-day moving average of the daily score (for the month trend line).
  const movingAvg = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((day, i) => {
      if (day.date > today) return;
      map.set(day.date, pct(avg(days.slice(Math.max(0, i - 6), i + 1).map((d) => d.overall))));
    });
    return map;
  }, [days, today]);

  const period = useMemo(() => {
    if (range === "week") {
      const week = WEEKS[weekIdx] ?? WEEKS[0]!;
      return { start: week.start, end: week.end, title: week.label, sub: `${formatMonthDay(week.start)} – ${formatMonthDay(week.end)}` };
    }
    if (range === "month") {
      const month = MONTHS[monthIdx] ?? MONTHS[0];
      return { start: month.start, end: month.end, title: month.label, sub: `${formatMonthDay(month.start)} – ${formatMonthDay(month.end)}` };
    }
    return {
      start: program.start,
      end: program.end,
      title: `Full ${program.days}-day program`,
      sub: `${formatMonthDay(program.start)} – ${formatMonthDay(program.end)} ${program.end.slice(0, 4)}`,
    };
  }, [range, weekIdx, monthIdx, WEEKS, MONTHS, program]);

  const stats = useMemo(() => rangeStats(days, period.start, period.end, today), [days, period, today]);

  const previous = useMemo(() => {
    const prev = range === "week" ? WEEKS[weekIdx - 1] : range === "month" ? MONTHS[monthIdx - 1] : undefined;
    if (!prev) return null;
    const s = rangeStats(days, prev.start, prev.end, today);
    return s.elapsedDays > 0 ? s : null;
  }, [days, range, weekIdx, monthIdx, today, WEEKS, MONTHS]);
  const delta = previous && stats.elapsedDays > 0 ? pct(stats.avgOverall) - pct(previous.avgOverall) : null;

  const habits = useMemo(() => habitStats(data, period.start, period.end, today), [data, period, today]);
  const weekday = useMemo(() => weekdayAverages(days, period.start, period.end, today), [days, period, today]);
  const moods = useMemo(() => moodAverages(days, journals, period.start, period.end, today), [days, journals, period, today]);

  // ── chart rows ──
  const dayRows = useMemo(
    () =>
      days
        .filter((day) => day.date >= period.start && day.date <= period.end)
        .map((day) => {
          const elapsed = day.date <= today;
          return {
            date: day.date,
            name: range === "week" ? formatPretty(day.date).split(" ")[0] : String(Number(day.date.slice(8))),
            label: formatPretty(day.date),
            score: elapsed && !day.rest ? pct(day.overall) : null,
            dos: elapsed && !day.rest ? pct(day.dosPct) : null,
            donts: elapsed && !day.rest ? pct(day.dontsPct) : null,
            avg7: movingAvg.get(day.date) ?? null,
          };
        }),
    [days, period, today, range, movingAvg],
  );

  const bucketRow = (name: string, label: string, start: string, end: string) => {
    const s = rangeStats(days, start, end, today);
    return {
      name,
      label,
      score: s.elapsedDays ? pct(s.avgOverall) : null,
      dos: s.elapsedDays ? pct(s.avgDos) : null,
      donts: s.elapsedDays ? pct(s.avgDonts) : null,
    };
  };
  const weekRows = useMemo(() => {
    const list = range === "month" ? WEEKS.filter((w) => w.end >= period.start && w.start <= period.end) : WEEKS;
    return list.map((w) =>
      bucketRow(`W${w.index}`, `${w.label} · ${formatMonthDay(w.start)}–${formatMonthDay(w.end)}`, w.start > period.start ? w.start : period.start, w.end < period.end ? w.end : period.end),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, today, range, period, WEEKS]);
  const monthRows = useMemo(
    () => MONTHS.map((m) => bucketRow(m.short, m.label, m.start, m.end)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, today, MONTHS],
  );

  const trendRows = range === "year" ? weekRows : dayRows;
  const splitRows = range === "week" ? dayRows : range === "month" ? weekRows : monthRows;

  const donut = [
    { name: "Good days (80%+)", value: stats.goodDays, fill: "var(--color-good)" },
    { name: "Logged, under 80%", value: stats.missedDays, fill: "var(--color-heat-3)" },
    { name: "Not logged", value: stats.unloggedDays, fill: "var(--color-heat-empty)" },
  ].filter((slice) => slice.value > 0);

  // ── plain-language insights ──
  const insights = useMemo(() => {
    const out: string[] = [];
    const wd = weekday.filter((w) => w.score !== null && w.n >= 2) as { name: string; n: number; score: number }[];
    if (wd.length >= 3) {
      const best = wd.reduce((a, b) => (b.score > a.score ? b : a));
      const worst = wd.reduce((a, b) => (b.score < a.score ? b : a));
      if (best.name !== worst.name) out.push(`Strongest weekday: ${best.name} (${best.score}%). Toughest: ${worst.name} (${worst.score}%).`);
    }
    const doList = habits.filter((h) => h.kind === "do" && h.days > 0);
    if (doList.length) {
      const weakest = doList.reduce((a, b) => (b.pct < a.pct ? b : a));
      if (weakest.pct < 1) out.push(`Most skipped do: "${weakest.label}" — done on ${pct(weakest.pct)}% of days.`);
    }
    const dontList = habits.filter((h) => h.kind === "dont" && h.gaveIn > 0);
    if (dontList.length) {
      const worst = dontList.reduce((a, b) => (b.gaveIn > a.gaveIn ? b : a));
      out.push(`You gave in most to "${worst.label}" (${worst.gaveIn}×). Plan what you'll do instead at that trigger moment.`);
    }
    const hi = moods.filter((m) => m.mood >= 4 && m.score !== null);
    const lo = moods.filter((m) => m.mood <= 3 && m.score !== null);
    const hiN = hi.reduce((s, m) => s + m.n, 0);
    const loN = lo.reduce((s, m) => s + m.n, 0);
    if (hiN >= 2 && loN >= 2) {
      const hiAvg = Math.round(hi.reduce((s, m) => s + (m.score as number) * m.n, 0) / hiN);
      const loAvg = Math.round(lo.reduce((s, m) => s + (m.score as number) * m.n, 0) / loN);
      out.push(`On good-mood days (4–5) you score ${hiAvg}%, versus ${loAvg}% on other days.`);
    }
    if (stats.longestRun >= 2) out.push(`Longest run of good days in this period: ${stats.longestRun}.`);
    return out;
  }, [weekday, habits, moods, stats.longestRun]);

  const heatCells = useMemo(() => {
    const rows = calendarCells(program).map((week) => week.map((iso) => (iso && iso >= period.start && iso <= period.end ? iso : null)));
    return rows.filter((row) => row.some(Boolean));
  }, [period, program]);

  const notStarted = stats.elapsedDays === 0;
  const month = MONTHS[monthIdx] ?? MONTHS[0]!;
  const reflection = reflections[month.key] ?? emptyReflection();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Progress board</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          See how you're doing by week, month, or the whole program. A good day is 80% or higher — the average of do's
          done and temptations avoided. Unlogged past days count as 0%.
        </p>
      </div>

      {/* Range switch */}
      <div role="tablist" aria-label="Time range" className="grid grid-cols-3 gap-1 rounded-lg bg-inset p-1">
        {(["week", "month", "year"] as const).map((item) => (
          <button
            key={item}
            role="tab"
            type="button"
            aria-selected={range === item}
            data-testid={`range-${item}`}
            onClick={() => setRange(item)}
            className={cn(
              "h-11 rounded-md text-sm font-medium capitalize",
              range === item ? "bg-surface text-fg shadow-sm" : "text-muted",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Period picker */}
      {range === "week" ? (
        <div className="flex items-center justify-between gap-2">
          <NavBtn testId="week-prev" label="Previous week" disabled={weekIdx <= 0} onClick={() => setWeekIdx((i) => Math.max(0, i - 1))} dir="left" />
          <div className="text-center">
            <p className="font-display text-xl font-medium">{period.title}</p>
            <p className="text-sm text-muted">{period.sub}</p>
          </div>
          <NavBtn testId="week-next" label="Next week" disabled={weekIdx >= WEEKS.length - 1} onClick={() => setWeekIdx((i) => Math.min(WEEKS.length - 1, i + 1))} dir="right" />
        </div>
      ) : range === "month" ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {MONTHS.map((m, i) => (
            <button
              key={m.key}
              type="button"
              data-testid={`month-${m.key}`}
              onClick={() => setMonthIdx(i)}
              className={cn(
                "h-11 rounded-md border text-sm font-medium",
                i === monthIdx ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted",
              )}
            >
              {m.short}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <p className="font-display text-xl font-medium">{period.title}</p>
          <p className="text-sm text-muted">{period.sub}</p>
        </div>
      )}

      {!readOnly && dos.length === 0 && donts.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">
            Add your daily do's and don'ts to start filling these charts.{" "}
            <button type="button" className="font-medium text-fg underline underline-offset-2" onClick={onSetup} data-testid="board-setup">
              Set up habits
            </button>
          </p>
        </Panel>
      ) : null}

      {notStarted ? (
        <Panel>
          <p className="text-sm text-muted">This period hasn't started yet. Charts will fill in as days pass.</p>
        </Panel>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Average score" value={notStarted ? "—" : pctLabel(stats.avgOverall)}>
          {delta !== null ? (
            <span className={cn("text-xs font-medium", delta >= 0 ? "text-good" : "text-bad")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs previous {range}
            </span>
          ) : null}
        </Stat>
        <Stat label="Good days" value={notStarted ? "—" : `${stats.goodDays}/${stats.elapsedDays}`}>
          <span className="text-xs text-muted">80% or higher</span>
        </Stat>
        <Stat label="Days logged" value={notStarted ? "—" : `${stats.filledDays}/${stats.elapsedDays}`}>
          <span className="text-xs text-muted">{stats.unloggedDays ? `${stats.unloggedDays} blank` : "all filled in"}</span>
        </Stat>
        <Stat label="Current streak" value={`${overall.current}`}>
          <span className="text-xs text-muted">best this period: {stats.longestRun}</span>
        </Stat>
      </div>

      {/* Trend */}
      <Panel>
        <h2 className="font-display text-2xl font-medium">
          {range === "week" ? "Daily score" : range === "month" ? "Daily score & 7-day average" : "Weekly score"}
        </h2>
        <p className="text-sm text-muted">Dashed line is the 80% good-day mark.</p>
        <ChartBox className="mt-3 h-60">
          {range === "week" || range === "year" ? (
            <BarChart data={trendRows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 80, 100]} tick={AXIS} axisLine={false} tickLine={false} width={34} />
              <ReferenceLine y={80} stroke="var(--color-subtle)" strokeDasharray="4 4" />
              <Tooltip cursor={{ fill: "var(--color-inset)" }} contentStyle={TOOLTIP_STYLE} labelFormatter={(_l, p) => p?.[0]?.payload?.label ?? ""} formatter={(v) => [`${v}%`, "Score"]} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {trendRows.map((row, i) => (
                  <Cell key={i} fill={scoreColor(row.score)} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <ComposedChart data={trendRows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={10} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 80, 100]} tick={AXIS} axisLine={false} tickLine={false} width={34} />
              <ReferenceLine y={80} stroke="var(--color-subtle)" strokeDasharray="4 4" />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(_l, p) => p?.[0]?.payload?.label ?? ""} formatter={(v, name) => [`${v}%`, name === "avg7" ? "7-day avg" : "Score"]} />
              <Area type="monotone" dataKey="score" stroke="var(--color-heat-3)" fill="var(--color-heat-1)" fillOpacity={0.7} strokeWidth={2} connectNulls={false} />
              <Line type="monotone" dataKey="avg7" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} connectNulls={false} />
            </ComposedChart>
          )}
        </ChartBox>
      </Panel>

      {/* Do's vs Don'ts + donut */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <h2 className="font-display text-2xl font-medium">Do's vs don'ts</h2>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
            <Dot color="var(--color-accent)" label="Do's done" />
            <Dot color="var(--color-heat-3)" label="Don'ts avoided" />
          </div>
          <ChartBox className="mt-3 h-56">
            <BarChart data={splitRows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} width={34} />
              <Tooltip cursor={{ fill: "var(--color-inset)" }} contentStyle={TOOLTIP_STYLE} labelFormatter={(_l, p) => p?.[0]?.payload?.label ?? ""} formatter={(v, name) => [`${v}%`, name === "dos" ? "Do's" : "Don'ts"]} />
              <Bar dataKey="dos" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="donts" fill="var(--color-heat-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </Panel>

        <Panel>
          <h2 className="font-display text-2xl font-medium">Day breakdown</h2>
          {donut.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing to show yet.</p>
          ) : (
            <>
              <ChartBox className="mt-2 h-44">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none">
                    {donut.map((slice) => (
                      <Cell key={slice.name} fill={slice.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ChartBox>
              <ul className="mt-2 space-y-1 text-sm">
                {donut.map((slice) => (
                  <li key={slice.name} className="flex items-center justify-between gap-2">
                    <Dot color={slice.fill} label={slice.name} />
                    <span className="tabular-nums text-muted">{slice.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {/* Calendar / tiles */}
      <Panel>
        <h2 className="font-display text-2xl font-medium">{range === "week" ? "This week, day by day" : "Discipline calendar"}</h2>
        <p className="mb-3 text-sm text-muted">Darker green means a higher score.{readOnly ? "" : " Tap a day to open it."}</p>
        {range === "week" ? (
          <div className="grid grid-cols-7 gap-1.5">
            {dayRows.map((row) => {
              const iso = row.date;
              const day = byDate.get(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={readOnly || !onOpenDate}
                  onClick={() => onOpenDate?.(iso)}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center rounded-md px-0.5 py-2 text-xs font-medium",
                    HEAT[heatLevel(day)],
                    iso === today && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                  )}
                >
                  <span className="opacity-80">{row.name}</span>
                  <span className="text-sm tabular-nums">{iso.slice(8)}</span>
                  <span className="tabular-nums">{row.score === null ? "·" : `${row.score}%`}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid gap-1">
              {heatCells.map((row, index) => (
                <div key={index} className="grid grid-cols-7 gap-1">
                  {row.map((iso, cell) => {
                    if (!iso) return <div key={cell} />;
                    const day: DayScore | undefined = byDate.get(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={readOnly || !onOpenDate}
                        onClick={() => onOpenDate?.(iso)}
                        title={`${formatPretty(iso)} · ${day ? pctLabel(day.overall) : "0%"}`}
                        className={cn(
                          "grid h-11 place-items-center rounded-sm text-xs font-medium tabular-nums",
                          HEAT[heatLevel(day)],
                          iso === today && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                          iso > today && "opacity-60",
                        )}
                      >
                        {iso.slice(8)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      {/* Habit consistency */}
      <div className="grid gap-4 lg:grid-cols-2">
        <HabitBars title="Do's consistency" habits={habits.filter((h) => h.kind === "do")} />
        <HabitBars title="Don'ts consistency" habits={habits.filter((h) => h.kind === "dont")} />
      </div>

      {/* Patterns */}
      {range !== "week" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <h2 className="font-display text-2xl font-medium">Score by weekday</h2>
            <ChartBox className="mt-3 h-48">
              <BarChart data={weekday} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} width={34} />
                <Tooltip cursor={{ fill: "var(--color-inset)" }} contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Average"]} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {weekday.map((row, i) => (
                    <Cell key={i} fill={scoreColor(row.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartBox>
          </Panel>
          <Panel>
            <h2 className="font-display text-2xl font-medium">Mood vs score</h2>
            {moods.every((m) => m.n === 0) ? (
              <p className="mt-2 text-sm text-muted">Log your mood in the daily journal to see how it links to your score.</p>
            ) : (
              <ChartBox className="mt-3 h-48">
                <BarChart data={moods} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" />
                  <XAxis dataKey="mood" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} width={34} />
                  <Tooltip cursor={{ fill: "var(--color-inset)" }} contentStyle={TOOLTIP_STYLE} labelFormatter={(m) => `Mood ${m}`} formatter={(v) => [`${v}%`, "Average score"]} />
                  <Bar dataKey="score" fill="var(--color-heat-3)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartBox>
            )}
            <p className="mt-1 text-xs text-subtle">Mood 1 = rough, 5 = strong.</p>
          </Panel>
        </div>
      ) : null}

      {/* Insights */}
      <Panel>
        <h2 className="font-display text-2xl font-medium">What the numbers say</h2>
        {insights.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Log a few days (and moods) and personal insights will show up here.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {insights.map((line) => (
              <li key={line} className="rounded-md bg-inset px-3 py-2">{line}</li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Month-end reflection (month view) */}
      {range === "month" && !readOnly ? (
        <Panel>
          <h2 className="font-display text-2xl font-medium">{month.label} reflection</h2>
          <p className="mb-3 text-sm text-muted">A bigger-picture look back at this month.</p>
          <div className="space-y-3">
            <label className="block text-sm">
              What went well?
              <TextArea className="mt-1" rows={2} value={reflection.well} onChange={(e) => patchReflection(month.key, { well: e.target.value })} />
            </label>
            <label className="block text-sm">
              What didn't?
              <TextArea className="mt-1" rows={2} value={reflection.didnt} onChange={(e) => patchReflection(month.key, { didnt: e.target.value })} />
            </label>
            <label className="block text-sm">
              Best habit
              <Field className="mt-1" value={reflection.habit} onChange={(e) => patchReflection(month.key, { habit: e.target.value })} />
            </label>
            <label className="block text-sm">
              Focus next month
              <TextArea className="mt-1" rows={2} value={reflection.focus} onChange={(e) => patchReflection(month.key, { focus: e.target.value })} />
            </label>
          </div>
        </Panel>
      ) : null}

      {range === "year" && data.pastPrograms.length > 0 ? (
        <Panel>
          <h2 className="font-display text-2xl font-medium">Past programs</h2>
          <p className="mb-3 text-sm text-muted">Results from programs you finished or replaced.</p>
          <ul className="space-y-2" data-testid="past-programs">
            {[...data.pastPrograms].reverse().map((p) => (
              <li key={`${p.start}-${p.end}`} className="rounded-lg border border-line bg-paper p-3 text-sm" data-testid="past-program">
                <p className="font-medium">
                  {formatMonthDay(p.start)} – {formatMonthDay(p.end)} {p.end.slice(0, 4)} · {p.days} days
                </p>
                <p className="mt-0.5 text-muted">
                  Average {p.avgScore}% · {p.goodDays} good days · {p.loggedDays} logged · best streak {p.bestStreak}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <BadgesPanel data={data} />
    </div>
  );
}

function ChartBox({ className, children }: { className?: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return (
    <div className={cn("w-full min-w-0", className)}>
      {on ? (
        <ResponsiveContainer width="100%" height="100%">
          {children as ReactElement}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <Panel className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-medium tabular-nums">{value}</p>
      <div className="mt-0.5 min-h-4">{children}</div>
    </Panel>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-3 shrink-0 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function NavBtn({ label, disabled, onClick, dir, testId }: { label: string; disabled: boolean; onClick: () => void; dir: "left" | "right"; testId: string }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-surface disabled:opacity-40"
    >
      <Icon className="size-5" />
    </button>
  );
}

function HabitBars({ title, habits }: { title: string; habits: HabitStat[] }) {
  const sorted = [...habits].sort((a, b) => b.pct - a.pct);
  return (
    <Panel>
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      {sorted.length === 0 ? <p className="mt-2 text-sm text-muted">None added yet.</p> : null}
      <ul className="mt-3 space-y-3">
        {sorted.map((habit) => (
          <li key={habit.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{habit.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{habit.days ? pctLabel(habit.pct) : "—"}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct(habit.pct)}%`, background: scoreColor(pct(habit.pct)) }}
              />
            </div>
            <p className="mt-0.5 text-xs text-subtle">
              {habit.hits}/{habit.days} days
              {habit.kind === "dont" && habit.gaveIn ? ` · gave in ${habit.gaveIn}×` : ""}
              {habit.streak > 0 ? ` · ${habit.streak}-day streak` : ""}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
