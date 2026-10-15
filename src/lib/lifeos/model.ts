import { format } from "date-fns";

export const GOOD_DAY = 0.8;
export const DEFAULT_PROGRAM_START = "2026-09-23";
export const DEFAULT_PROGRAM_DAYS = 90;
export const PROGRAM_LENGTHS = [30, 60, 90, 180] as const;

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

/** Weekday numbers follow JS `Date#getDay()`: 0 = Sunday … 6 = Saturday. */
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Display order, Monday first. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export type Habit = {
  id: string;
  label: string;
  /** Weekdays the habit applies to. Missing or empty = every day. */
  days?: number[];
};
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

export const TODO_PRIORITIES = ["high", "medium", "low"] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  priority: TodoPriority;
  /** Due date (YYYY-MM-DD) or "" for none. */
  due: string;
  notes: string;
  /** YYYY-MM-DD the task was added. */
  created: string;
  /** YYYY-MM-DD the task was completed, or "". */
  doneOn: string;
};

/** Weekly review, keyed in `LifeData.weeklyReviews` by the Monday (YYYY-MM-DD) of that Mon–Sun week. */
export type WeeklyReview = {
  wins: string;
  struggles: string;
  lesson: string;
  focus: string;
  rating: number | null;
};

/** Snapshot taken when a program is finished or replaced by a new one. */
export type PastProgram = {
  start: string;
  end: string;
  days: number;
  avgScore: number; // 0–100
  goodDays: number;
  loggedDays: number;
  bestStreak: number;
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
  todos: Todo[];
  weeklyReviews: Record<string, WeeklyReview>;
  programStart: string;
  programDays: number;
  pastPrograms: PastProgram[];
};

// ── dates ───────────────────────────────────────────────────────────────────

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y as number, (m ?? 1) - 1, d ?? 1);
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

/** JS weekday (0 = Sunday) of an ISO date. */
export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay();
}

/** Monday (YYYY-MM-DD) of the Mon–Sun week containing `iso`. */
export function mondayOf(iso: string): string {
  return shiftDate(iso, -((weekdayOf(iso) + 6) % 7));
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

export function formatMonthYear(iso: string): string {
  return format(parseISODate(iso), "MMMM yyyy");
}

export function pctLabel(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// ── program window ──────────────────────────────────────────────────────────

export type Program = { start: string; end: string; days: number };

export function makeProgram(start: string, days: number = DEFAULT_PROGRAM_DAYS): Program {
  const length = Math.max(7, Math.min(366, Math.round(days)));
  return { start, end: shiftDate(start, length - 1), days: length };
}

export function programOf(data: Pick<LifeData, "programStart" | "programDays">): Program {
  return makeProgram(data.programStart, data.programDays);
}

export function clampProgram(iso: string, program: Program): string {
  if (iso < program.start) return program.start;
  if (iso > program.end) return program.end;
  return iso;
}

export function programDates(program: Program): string[] {
  const dates: string[] = [];
  const cursor = parseISODate(program.start);
  const end = parseISODate(program.end);
  while (cursor <= end) {
    dates.push(formatISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** 1-based day of the program (can be < 1 or > days outside the window). */
export function dayNumber(iso: string, program: Program): number {
  const start = parseISODate(program.start).getTime();
  const current = parseISODate(iso).getTime();
  return Math.round((current - start) / 86_400_000) + 1;
}

export type ProgramWeek = { index: number; label: string; start: string; end: string };

export function programWeeks(program: Program): ProgramWeek[] {
  const dates = programDates(program);
  const weeks: ProgramWeek[] = [];
  for (let i = 0; i < dates.length; i += 7) {
    const slice = dates.slice(i, i + 7);
    const index = weeks.length + 1;
    weeks.push({
      index,
      label: `Week ${index}`,
      start: slice[0] ?? program.start,
      end: slice[slice.length - 1] ?? program.start,
    });
  }
  return weeks;
}

export type ProgramMonth = { key: string; label: string; short: string; start: string; end: string };

/** Calendar months overlapping the program, clipped to the program window. */
export function programMonths(program: Program): ProgramMonth[] {
  const months: ProgramMonth[] = [];
  for (const date of programDates(program)) {
    const key = date.slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.key === key) {
      last.end = date;
    } else {
      months.push({
        key,
        label: formatMonthYear(date),
        short: format(parseISODate(date), "MMM"),
        start: date,
        end: date,
      });
    }
  }
  return months;
}

export function calendarCells(program: Program): (string | null)[][] {
  const dates = programDates(program);
  const first = parseISODate(dates[0] ?? program.start);
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...dates];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ── habits & schedules ──────────────────────────────────────────────────────

/** Does this habit apply on `iso`? (No schedule = every day.) */
export function isScheduled(habit: Habit, iso: string): boolean {
  if (!habit.days || habit.days.length === 0 || habit.days.length >= 7) return true;
  return habit.days.includes(weekdayOf(iso));
}

export function scheduleLabel(habit: Habit): string {
  const days = habit.days;
  if (!days || days.length === 0 || days.length >= 7) return "Every day";
  const set = new Set(days);
  const weekdays = [1, 2, 3, 4, 5];
  if (set.size === 5 && weekdays.every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  return WEEKDAY_ORDER.filter((d) => set.has(d))
    .map((d) => WEEKDAY_NAMES[d])
    .join(", ");
}

// ── empty / example data ────────────────────────────────────────────────────

export function emptyJournal(): JournalEntry {
  return { mood: null, grateful: "", win: "", reflection: "" };
}

export function emptyReflection(): MonthReflection {
  return { well: "", didnt: "", habit: "", focus: "" };
}

export function emptyWeeklyReview(): WeeklyReview {
  return { wins: "", struggles: "", lesson: "", focus: "", rating: null };
}

/** What every new account starts with: nothing, and a 90-day program starting today. */
export function createBlank(start: string = todayISO()): LifeData {
  return {
    dos: [],
    donts: [],
    doChecks: {},
    dontChecks: {},
    journals: {},
    oneLines: {},
    goals: [],
    reflections: {},
    todos: [],
    weeklyReviews: {},
    programStart: start,
    programDays: DEFAULT_PROGRAM_DAYS,
    pastPrograms: [],
  };
}

/** Optional, generic starter content a user can load with one tap (never applied automatically). */
export function createExample(): Pick<LifeData, "dos" | "donts" | "goals" | "todos"> {
  return {
    dos: [
      { id: "ex-exercise", label: "Exercise or a brisk walk" },
      { id: "ex-water", label: "Drink enough water" },
      { id: "ex-meal", label: "Eat a healthy breakfast" },
      { id: "ex-focus", label: "Two hours of focused work or study", days: [1, 2, 3, 4, 5] },
      { id: "ex-read", label: "Read for 20 minutes" },
      { id: "ex-plan", label: "Plan tomorrow" },
    ],
    donts: [
      { id: "ex-sugar", label: "No sugary drinks or snacks" },
      { id: "ex-scroll", label: "No mindless scrolling" },
      { id: "ex-late", label: "No late-night screens" },
      { id: "ex-procrastinate", label: "No procrastinating on the main task", days: [1, 2, 3, 4, 5] },
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
    todos: [
      {
        id: "ex-todo-1",
        title: "Pick my three most important habits",
        done: false,
        priority: "high",
        due: "",
        notes: "",
        created: todayISO(),
        doneOn: "",
      },
    ],
  };
}
