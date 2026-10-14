import { format } from "date-fns";

export const PROGRAM_START = "2026-09-23";
export const PROGRAM_END = "2026-12-21";
export const PROGRAM_DAYS = 90;
export const GOOD_DAY = 0.8;

export const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Low" },
  { value: 3, label: "Even" },
  { value: 4, label: "Good" },
  { value: 5, label: "Strong" },
] as const;

export const GOAL_STATUSES = ["Not Started", "In Progress", "Done", "Paused"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type GoalHorizon = "short" | "long";
export type DontStatus = "Avoided" | "Gave In";

export type Habit = { id: string; label: string };
export type DoCheck = { done: boolean; notes: string };
export type DontCheck = { status: DontStatus | ""; notes: string };

export type JournalEntry = {
  mood: number | null;
  grateful: string;
  win: string;
  reflection: string;
};

export type Goal = {
  id: string;
  horizon: GoalHorizon;
  title: string;
  category: string;
  targetDate: string;
  progress: number;
  status: GoalStatus;
  notes: string;
};

export type MonthReflection = {
  well: string;
  didnt: string;
  habit: string;
  focus: string;
};

export type LifeData = {
  dos: Habit[];
  donts: Habit[];
  doChecks: Record<string, Record<string, DoCheck>>;
  dontChecks: Record<string, Record<string, DontCheck>>;
  journals: Record<string, JournalEntry>;
  oneLines: Record<string, string>;
  goals: Goal[];
  reflections: Record<string, MonthReflection>;
};

export const MONTHS = [
  { key: "2026-09", label: "September 2026", start: "2026-09-23", end: "2026-09-30" },
  { key: "2026-10", label: "October 2026", start: "2026-10-01", end: "2026-10-31" },
  { key: "2026-11", label: "November 2026", start: "2026-11-01", end: "2026-11-30" },
  { key: "2026-12", label: "December 2026", start: "2026-12-01", end: "2026-12-21" },
] as const;

export function emptyJournal(): JournalEntry {
  return { mood: null, grateful: "", win: "", reflection: "" };
}

export function emptyReflection(): MonthReflection {
  return { well: "", didnt: "", habit: "", focus: "" };
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return formatISODate(new Date());
}

export function shiftDate(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return formatISODate(date);
}

export function clampProgram(iso: string): string {
  if (iso < PROGRAM_START) return PROGRAM_START;
  if (iso > PROGRAM_END) return PROGRAM_END;
  return iso;
}

export function programDates(): string[] {
  const dates: string[] = [];
  const cursor = parseISODate(PROGRAM_START);
  const end = parseISODate(PROGRAM_END);
  while (cursor <= end) {
    dates.push(formatISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function dayNumber(iso: string): number {
  const start = parseISODate(PROGRAM_START).getTime();
  const current = parseISODate(iso).getTime();
  return Math.round((current - start) / 86_400_000) + 1;
}

export function formatPretty(iso: string): string {
  return format(parseISODate(iso), "EEE d MMM");
}

export function formatLong(iso: string): string {
  return format(parseISODate(iso), "EEEE d MMMM");
}

export function formatMonthDay(iso: string): string {
  return format(parseISODate(iso), "d MMM");
}

export type ProgramWeek = { index: number; label: string; start: string; end: string };

export function programWeeks(): ProgramWeek[] {
  const dates = programDates();
  const weeks: ProgramWeek[] = [];
  for (let i = 0; i < dates.length; i += 7) {
    const slice = dates.slice(i, i + 7);
    const index = weeks.length + 1;
    weeks.push({
      index,
      label: `Week ${index}`,
      start: slice[0] ?? PROGRAM_START,
      end: slice[slice.length - 1] ?? PROGRAM_START,
    });
  }
  return weeks;
}

export function calendarCells(): (string | null)[][] {
  const dates = programDates();
  const first = parseISODate(dates[0] ?? PROGRAM_START);
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...dates];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function pctLabel(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** What every new account starts with: nothing. */
export function createBlank(): LifeData {
  return {
    dos: [],
    donts: [],
    doChecks: {},
    dontChecks: {},
    journals: {},
    oneLines: {},
    goals: [],
    reflections: {},
  };
}

/** Optional, generic starter habits a user can load with one tap (never applied automatically). */
export function createExample(): Pick<LifeData, "dos" | "donts" | "goals"> {
  return {
    dos: [
      { id: "ex-exercise", label: "Exercise or a brisk walk" },
      { id: "ex-water", label: "Drink enough water" },
      { id: "ex-meal", label: "Eat a healthy breakfast" },
      { id: "ex-focus", label: "Two hours of focused work or study" },
      { id: "ex-read", label: "Read for 20 minutes" },
      { id: "ex-plan", label: "Plan tomorrow" },
    ],
    donts: [
      { id: "ex-sugar", label: "No sugary drinks or snacks" },
      { id: "ex-scroll", label: "No mindless scrolling" },
      { id: "ex-late", label: "No late-night screens" },
      { id: "ex-procrastinate", label: "No procrastinating on the main task" },
    ],
    goals: [
      {
        id: "ex-goal-streak",
        horizon: "short",
        title: "Build a 7-day streak of good days",
        category: "Discipline",
        targetDate: "",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "ex-goal-long",
        horizon: "long",
        title: "Make my daily routine automatic",
        category: "Habits",
        targetDate: "",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
    ],
  };
}
