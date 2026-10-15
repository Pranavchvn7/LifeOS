import {
  GOOD_DAY,
  isScheduled,
  parseISODate,
  programDates,
  programOf,
  programWeeks,
  shiftDate,
  type LifeData,
  type Program,
  type ProgramWeek,
} from "./model";

export type DayScore = {
  date: string;
  dosDone: number;
  dosTotal: number; // do's scheduled for this date
  dosPct: number;
  dontsAvoided: number;
  dontsGaveIn: number;
  dontsTotal: number; // don'ts scheduled for this date
  dontsPct: number;
  overall: number;
  good: boolean;
  filled: boolean;
  /** Nothing is scheduled this day (no habits, or none apply on this weekday). */
  rest: boolean;
  streak: number | null;
};

/** Score a single date. Only habits scheduled for that weekday count. */
function scoreDate(data: LifeData, date: string): Omit<DayScore, "streak"> {
  const doDay = data.doChecks[date] ?? {};
  const dontDay = data.dontChecks[date] ?? {};
  let dosDone = 0;
  let dosTotal = 0;
  let filled = false;
  for (const habit of data.dos) {
    if (!isScheduled(habit, date)) continue;
    dosTotal += 1;
    if (doDay[habit.id]?.done) {
      dosDone += 1;
      filled = true;
    }
  }
  let dontsAvoided = 0;
  let dontsGaveIn = 0;
  let dontsTotal = 0;
  for (const habit of data.donts) {
    if (!isScheduled(habit, date)) continue;
    dontsTotal += 1;
    const status = dontDay[habit.id]?.status ?? "";
    if (status === "Avoided") {
      dontsAvoided += 1;
      filled = true;
    } else if (status === "Gave In") {
      dontsGaveIn += 1;
      filled = true;
    }
  }
  const dosPct = dosTotal ? dosDone / dosTotal : 0;
  const dontsPct = dontsTotal ? dontsAvoided / dontsTotal : 0;
  // Only lists that apply count: with no don'ts scheduled, the day is scored on do's alone (and vice versa).
  const overall =
    dosTotal && dontsTotal ? (dosPct + dontsPct) / 2 : dosTotal ? dosPct : dontsTotal ? dontsPct : 0;
  const rest = dosTotal + dontsTotal === 0;
  return {
    date,
    dosDone,
    dosTotal,
    dosPct,
    dontsAvoided,
    dontsGaveIn,
    dontsTotal,
    dontsPct,
    overall,
    good: !rest && overall >= GOOD_DAY,
    filled,
    rest,
  };
}

/** Score an arbitrary list of consecutive dates; streaks run through them in order. */
export function scoreDays(data: LifeData, dates: string[], today: string): DayScore[] {
  let run = 0;
  return dates.map((date) => {
    const base = scoreDate(data, date);
    let streak: number | null = null;
    if (date <= today) {
      // A rest day neither extends nor breaks a streak.
      if (!base.rest) run = base.good ? run + 1 : 0;
      streak = run;
    }
    return { ...base, streak };
  });
}

/** Scores for every day of the active program. */
export function buildScores(data: LifeData, today: string): DayScore[] {
  return scoreDays(data, programDates(programOf(data)), today);
}

/** First date anything was logged (or the program began), across all programs. */
export function earliestDate(data: LifeData): string {
  let earliest = data.programStart;
  const consider = (iso: string) => {
    if (iso < earliest) earliest = iso;
  };
  for (const key of Object.keys(data.doChecks)) consider(key);
  for (const key of Object.keys(data.dontChecks)) consider(key);
  for (const past of data.pastPrograms) consider(past.start);
  return earliest;
}

/** Scores from the first logged day up to today — used for lifetime stats like badges. */
export function buildAllScores(data: LifeData, today: string): DayScore[] {
  const first = earliestDate(data);
  const dates: string[] = [];
  for (let d = first, guard = 0; d <= today && guard < 4000; d = shiftDate(d, 1), guard += 1) dates.push(d);
  return scoreDays(data, dates, today);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarize(days: DayScore[], today: string) {
  const elapsed = days.filter((day) => day.date <= today && !day.rest);
  const todayScore = days.find((day) => day.date === today) ?? null;
  const last = [...days].reverse().find((day) => day.date <= today);
  return {
    todayScore,
    current: todayScore?.streak ?? last?.streak ?? 0,
    best: days.reduce((max, day) => Math.max(max, day.streak ?? 0), 0),
    avgOverall: average(elapsed.map((day) => day.overall)),
    avgDos: average(elapsed.map((day) => day.dosPct)),
    avgDonts: average(elapsed.map((day) => day.dontsPct)),
    elapsedDays: elapsed.length,
  };
}

export type Rollup = ProgramWeek & {
  dosPct: number;
  dontsPct: number;
  overall: number;
};

export function weeklyRollups(days: DayScore[], program: Program): Rollup[] {
  return programWeeks(program).map((week) => {
    const slice = days.filter((day) => day.date >= week.start && day.date <= week.end && !day.rest);
    const dosPct = average(slice.map((day) => day.dosPct));
    const dontsPct = average(slice.map((day) => day.dontsPct));
    return { ...week, dosPct, dontsPct, overall: average(slice.map((day) => day.overall)) };
  });
}

export function heatLevel(day: DayScore | undefined): number {
  if (!day?.filled) return 0;
  if (day.overall >= 0.9) return 5;
  if (day.overall >= 0.8) return 4;
  if (day.overall >= 0.6) return 3;
  if (day.overall >= 0.4) return 2;
  return 1;
}

// ── Period analytics (Board: week / month / year) ───────────────────────────

export type RangeStats = {
  totalDays: number;
  elapsedDays: number; // trackable days up to today (rest days excluded)
  filledDays: number;
  goodDays: number;
  missedDays: number; // logged, but under the good-day line
  unloggedDays: number; // elapsed with nothing logged
  avgOverall: number;
  avgDos: number;
  avgDonts: number;
  longestRun: number;
  best: DayScore | null;
};

/** Stats for [start, end]. Only trackable days up to `today` count; future and rest days are ignored. */
export function rangeStats(days: DayScore[], start: string, end: string, today: string): RangeStats {
  const slice = days.filter((day) => day.date >= start && day.date <= end);
  const elapsed = slice.filter((day) => day.date <= today && !day.rest);
  let run = 0;
  let longestRun = 0;
  let best: DayScore | null = null;
  for (const day of elapsed) {
    run = day.good ? run + 1 : 0;
    longestRun = Math.max(longestRun, run);
    if (day.filled && (!best || day.overall > best.overall)) best = day;
  }
  const filledDays = elapsed.filter((day) => day.filled).length;
  return {
    totalDays: slice.length,
    elapsedDays: elapsed.length,
    filledDays,
    goodDays: elapsed.filter((day) => day.good).length,
    missedDays: elapsed.filter((day) => day.filled && !day.good).length,
    unloggedDays: elapsed.length - filledDays,
    avgOverall: average(elapsed.map((day) => day.overall)),
    avgDos: average(elapsed.map((day) => day.dosPct)),
    avgDonts: average(elapsed.map((day) => day.dontsPct)),
    longestRun,
    best,
  };
}

export type HabitStat = {
  id: string;
  label: string;
  kind: "do" | "dont";
  hits: number; // done / avoided
  gaveIn: number; // don'ts only
  days: number; // scheduled, elapsed days in the period
  pct: number;
  streak: number; // current run of scheduled days, counted up to today
};

type Cell = "ok" | "bad" | "empty";

function habitCell(data: LifeData, kind: "do" | "dont", id: string, date: string): Cell {
  if (kind === "do") return data.doChecks[date]?.[id]?.done ? "ok" : "empty";
  const status = data.dontChecks[date]?.[id]?.status ?? "";
  return status === "Avoided" ? "ok" : status === "Gave In" ? "bad" : "empty";
}

function habitStreak(
  data: LifeData,
  kind: "do" | "dont",
  habit: LifeData["dos"][number],
  today: string,
  program: Program,
): number {
  const dates = programDates(program)
    .filter((date) => date <= today)
    .reverse();
  let run = 0;
  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i] as string;
    if (!isScheduled(habit, date)) continue; // days off never break a streak
    const state = habitCell(data, kind, habit.id, date);
    if (state === "ok") run += 1;
    else if (state === "empty" && date === today) continue; // today not logged yet
    else break;
  }
  return run;
}

/** Per-habit consistency for the scheduled, elapsed days between start and end. */
export function habitStats(data: LifeData, start: string, end: string, today: string): HabitStat[] {
  const program = programOf(data);
  const dates = programDates(program).filter((date) => date >= start && date <= end && date <= today);
  const build = (kind: "do" | "dont", habit: LifeData["dos"][number]): HabitStat => {
    let hits = 0;
    let gaveIn = 0;
    let scheduled = 0;
    for (const date of dates) {
      if (!isScheduled(habit, date)) continue;
      scheduled += 1;
      const state = habitCell(data, kind, habit.id, date);
      if (state === "ok") hits += 1;
      if (state === "bad") gaveIn += 1;
    }
    return {
      id: habit.id,
      label: habit.label,
      kind,
      hits,
      gaveIn,
      days: scheduled,
      pct: scheduled ? hits / scheduled : 0,
      streak: habitStreak(data, kind, habit, today, program),
    };
  };
  return [...data.dos.map((h) => build("do", h)), ...data.donts.map((h) => build("dont", h))];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Average overall score per weekday (Mon first) across elapsed, logged days in range. */
export function weekdayAverages(days: DayScore[], start: string, end: string, today: string) {
  const buckets = WEEKDAYS.map((name) => ({ name, sum: 0, n: 0 }));
  for (const day of days) {
    if (day.date < start || day.date > end || day.date > today || !day.filled || day.rest) continue;
    const index = (parseISODate(day.date).getDay() + 6) % 7;
    const bucket = buckets[index];
    if (bucket) {
      bucket.sum += day.overall;
      bucket.n += 1;
    }
  }
  return buckets.map((b) => ({ name: b.name, n: b.n, score: b.n ? Math.round((b.sum / b.n) * 100) : null }));
}

/** Average overall score for each mood (1-5) the user logged in range. */
export function moodAverages(
  days: DayScore[],
  journals: LifeData["journals"],
  start: string,
  end: string,
  today: string,
) {
  const buckets = [1, 2, 3, 4, 5].map((mood) => ({ mood, sum: 0, n: 0 }));
  for (const day of days) {
    if (day.date < start || day.date > end || day.date > today || day.rest) continue;
    const mood = journals[day.date]?.mood;
    if (!mood) continue;
    const bucket = buckets[mood - 1];
    if (bucket) {
      bucket.sum += day.overall;
      bucket.n += 1;
    }
  }
  return buckets.map((b) => ({ mood: b.mood, n: b.n, score: b.n ? Math.round((b.sum / b.n) * 100) : null }));
}

/** Current streak of good days up to today (0 if none). */
export function currentStreak(days: DayScore[], today: string): number {
  return summarize(days, today).current;
}

/** Snapshot of the finished (or abandoned) program, stored in `pastPrograms`. */
export function snapshotProgram(data: LifeData, today: string) {
  const program = programOf(data);
  const days = buildScores(data, today);
  const stats = rangeStats(days, program.start, program.end, today);
  return {
    start: program.start,
    end: program.end,
    days: program.days,
    avgScore: Math.round(stats.avgOverall * 100),
    goodDays: stats.goodDays,
    loggedDays: stats.filledDays,
    bestStreak: stats.longestRun,
  };
}
