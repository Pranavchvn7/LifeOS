import {
  GOOD_DAY,
  MONTHS,
  programDates,
  programWeeks,
  type LifeData,
  type ProgramWeek,
} from "./model";

export type DayScore = {
  date: string;
  dosDone: number;
  dosTotal: number;
  dosPct: number;
  dontsAvoided: number;
  dontsGaveIn: number;
  dontsTotal: number;
  dontsPct: number;
  overall: number;
  good: boolean;
  filled: boolean;
  streak: number | null;
};

export function buildScores(data: LifeData, today: string): DayScore[] {
  let run = 0;
  return programDates().map((date) => {
    const doDay = data.doChecks[date] ?? {};
    const dontDay = data.dontChecks[date] ?? {};
    let dosDone = 0;
    let filled = false;
    for (const habit of data.dos) {
      if (doDay[habit.id]?.done) {
        dosDone += 1;
        filled = true;
      }
    }
    let dontsAvoided = 0;
    let dontsGaveIn = 0;
    for (const habit of data.donts) {
      const status = dontDay[habit.id]?.status ?? "";
      if (status === "Avoided") {
        dontsAvoided += 1;
        filled = true;
      } else if (status === "Gave In") {
        dontsGaveIn += 1;
        filled = true;
      }
    }
    const dosTotal = data.dos.length;
    const dontsTotal = data.donts.length;
    const dosPct = dosTotal ? dosDone / dosTotal : 0;
    const dontsPct = dontsTotal ? dontsAvoided / dontsTotal : 0;
    // Only lists that exist count: with no don'ts yet, the day is scored on do's alone (and vice versa).
    const overall =
      dosTotal && dontsTotal ? (dosPct + dontsPct) / 2 : dosTotal ? dosPct : dontsTotal ? dontsPct : 0;
    const good = overall >= GOOD_DAY;
    let streak: number | null = null;
    if (date <= today) {
      run = good ? run + 1 : 0;
      streak = run;
    }
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
      good,
      filled,
      streak,
    };
  });
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarize(days: DayScore[], today: string) {
  const elapsed = days.filter((day) => day.date <= today);
  const todayScore = days.find((day) => day.date === today) ?? null;
  const last = elapsed[elapsed.length - 1];
  return {
    todayScore,
    current: todayScore?.streak ?? last?.streak ?? 0,
    best: elapsed.reduce((max, day) => Math.max(max, day.streak ?? 0), 0),
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

function rollupSlice(days: DayScore[], start: string, end: string) {
  const slice = days.filter((day) => day.date >= start && day.date <= end);
  const dosPct = average(slice.map((day) => day.dosPct));
  const dontsPct = average(slice.map((day) => day.dontsPct));
  return { dosPct, dontsPct, overall: (dosPct + dontsPct) / 2 };
}

export function weeklyRollups(days: DayScore[]): Rollup[] {
  return programWeeks().map((week) => ({ ...week, ...rollupSlice(days, week.start, week.end) }));
}

export function monthlyRollups(days: DayScore[]) {
  return MONTHS.map((month) => ({ ...month, ...rollupSlice(days, month.start, month.end) }));
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
  elapsedDays: number;
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

/** Stats for [start, end]. Only days up to `today` count; future days are ignored. */
export function rangeStats(days: DayScore[], start: string, end: string, today: string): RangeStats {
  const slice = days.filter((day) => day.date >= start && day.date <= end);
  const elapsed = slice.filter((day) => day.date <= today);
  let run = 0;
  let longestRun = 0;
  let best: DayScore | null = null;
  for (const day of elapsed) {
    run = day.good ? run + 1 : 0;
    longestRun = Math.max(longestRun, run);
    if (day.filled && (!best || day.overall > best.overall)) best = day;
  }
  const goodDays = elapsed.filter((day) => day.good).length;
  const filledDays = elapsed.filter((day) => day.filled).length;
  return {
    totalDays: slice.length,
    elapsedDays: elapsed.length,
    filledDays,
    goodDays,
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
  days: number; // elapsed days in the period
  pct: number;
  streak: number; // current run, counted up to today
};

function habitState(data: LifeData, kind: "do" | "dont", id: string, date: string): "ok" | "bad" | "empty" {
  if (kind === "do") return data.doChecks[date]?.[id]?.done ? "ok" : "empty";
  const status = data.dontChecks[date]?.[id]?.status ?? "";
  return status === "Avoided" ? "ok" : status === "Gave In" ? "bad" : "empty";
}

function habitStreak(data: LifeData, kind: "do" | "dont", id: string, today: string): number {
  const dates = programDates()
    .filter((date) => date <= today)
    .reverse();
  let run = 0;
  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i] as string;
    const state = habitState(data, kind, id, date);
    if (state === "ok") run += 1;
    else if (state === "empty" && i === 0 && date === today) continue; // today not logged yet
    else break;
  }
  return run;
}

/** Per-habit consistency for the elapsed days between start and end. */
export function habitStats(data: LifeData, start: string, end: string, today: string): HabitStat[] {
  const dates = programDates().filter((date) => date >= start && date <= end && date <= today);
  const build = (kind: "do" | "dont", habit: { id: string; label: string }): HabitStat => {
    let hits = 0;
    let gaveIn = 0;
    for (const date of dates) {
      const state = habitState(data, kind, habit.id, date);
      if (state === "ok") hits += 1;
      if (state === "bad") gaveIn += 1;
    }
    return {
      id: habit.id,
      label: habit.label,
      kind,
      hits,
      gaveIn,
      days: dates.length,
      pct: dates.length ? hits / dates.length : 0,
      streak: habitStreak(data, kind, habit.id, today),
    };
  };
  return [...data.dos.map((h) => build("do", h)), ...data.donts.map((h) => build("dont", h))];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Average overall score per weekday (Mon first) across elapsed, logged days in range. */
export function weekdayAverages(days: DayScore[], start: string, end: string, today: string) {
  const buckets = WEEKDAYS.map((name) => ({ name, sum: 0, n: 0 }));
  for (const day of days) {
    if (day.date < start || day.date > end || day.date > today || !day.filled) continue;
    const [y, m, d] = day.date.split("-").map(Number);
    const index = (new Date(y as number, (m as number) - 1, d as number).getDay() + 6) % 7;
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
    if (day.date < start || day.date > end || day.date > today) continue;
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
