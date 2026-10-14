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
    const overall = (dosPct + dontsPct) / 2;
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
