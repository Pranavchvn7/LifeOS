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

export function createSeed(): LifeData {
  return {
    dos: [
      { id: "walk", label: "Morning Walk & Exercise (5 AM)" },
      { id: "prayer", label: "Prayer" },
      { id: "theory-am", label: "Theory Revision - Manual & Automation (Morning)" },
      { id: "breakfast", label: "Healthy Breakfast" },
      { id: "programming", label: "Programming Practice" },
      { id: "lunch", label: "Lunch & Rest" },
      { id: "study", label: "Study & Improve Testing Concepts" },
      { id: "tea", label: "Evening High Tea" },
      { id: "theory-pm", label: "Theory Revision (Evening)" },
      { id: "free-time", label: "Free Evening Time (Earned Mobile/Entertainment)" },
    ],
    donts: [
      { id: "sugar", label: "No Sugar" },
      { id: "youtube", label: "No YouTube (mindless scrolling)" },
      { id: "instagram", label: "No Instagram" },
      { id: "gaming", label: "No Gaming" },
      { id: "porn", label: "No Porn" },
      { id: "masturbation", label: "No Masturbation" },
      { id: "overthinking", label: "No Overthinking" },
      { id: "laziness", label: "No Laziness - Stick to Routine" },
      { id: "anger", label: "No Anger" },
    ],
    doChecks: {},
    dontChecks: {},
    journals: {},
    oneLines: {},
    goals: [
      {
        id: "g-playwright",
        horizon: "short",
        title: "Finish Playwright + TypeScript advanced concepts revision",
        category: "Automation Testing",
        targetDate: "2026-10-15",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-cicd-mocks",
        horizon: "short",
        title: "Build 3 mock interview answers on CI/CD pipeline",
        category: "Interview Prep",
        targetDate: "2026-10-10",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-walk-streak",
        horizon: "short",
        title: "30-day streak of 5 AM walk & exercise",
        category: "Discipline",
        targetDate: "2026-10-23",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-zero-sugar",
        horizon: "short",
        title: "Zero-sugar for 30 days",
        category: "Health",
        targetDate: "2026-10-23",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-role",
        horizon: "long",
        title: "Land a senior QA automation role (Playwright + TS)",
        category: "Career",
        targetDate: "2027-03-31",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-cicd",
        horizon: "long",
        title: "Master CI/CD (GitHub Actions) end-to-end for automation pipelines",
        category: "Automation Testing",
        targetDate: "2027-01-31",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-discipline",
        horizon: "long",
        title: "Build a consistent daily discipline system (no distractions)",
        category: "Discipline",
        targetDate: "2027-06-30",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
      {
        id: "g-fitness",
        horizon: "long",
        title: "Improve physical fitness - daily exercise habit fully automatic",
        category: "Health",
        targetDate: "2027-06-30",
        progress: 0,
        status: "Not Started",
        notes: "",
      },
    ],
    reflections: {},
  };
}
