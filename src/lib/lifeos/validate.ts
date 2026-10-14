import {
  GOAL_STATUSES,
  type DontCheck,
  type DontStatus,
  type DoCheck,
  type Goal,
  type GoalHorizon,
  type GoalStatus,
  type Habit,
  type JournalEntry,
  type LifeData,
  type MonthReflection,
} from "./model";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-\d{2}$/;
const MAX_JSON = 750_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parseHabits(value: unknown, name: string): Habit[] {
  if (!Array.isArray(value) || value.length > 40) {
    throw new Error(`Invalid ${name} list.`);
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!isRecord(item)) throw new Error(`Invalid ${name} list.`);
    const id = clip(item.id, 64);
    const label = clip(item.label, 140);
    if (!id || !label || seen.has(id)) throw new Error(`Invalid ${name} list.`);
    seen.add(id);
    return { id, label };
  });
}

function parseDoChecks(
  value: unknown,
  ids: Set<string>,
): Record<string, Record<string, DoCheck>> {
  if (value == null) return {};
  if (!isRecord(value)) throw new Error("Invalid do checklist.");
  const out: Record<string, Record<string, DoCheck>> = {};
  for (const date of Object.keys(value).slice(0, 500)) {
    if (!ISO_DATE.test(date) || !isRecord(value[date])) continue;
    const bucket: Record<string, DoCheck> = {};
    const day = value[date] as Record<string, unknown>;
    for (const id of Object.keys(day)) {
      if (!ids.has(id) || !isRecord(day[id])) continue;
      const cell = day[id] as Record<string, unknown>;
      bucket[id] = { done: cell.done === true, notes: clip(cell.notes, 500) };
    }
    if (Object.keys(bucket).length) out[date] = bucket;
  }
  return out;
}

function parseDontChecks(
  value: unknown,
  ids: Set<string>,
): Record<string, Record<string, DontCheck>> {
  if (value == null) return {};
  if (!isRecord(value)) throw new Error("Invalid don't checklist.");
  const out: Record<string, Record<string, DontCheck>> = {};
  for (const date of Object.keys(value).slice(0, 500)) {
    if (!ISO_DATE.test(date) || !isRecord(value[date])) continue;
    const bucket: Record<string, DontCheck> = {};
    const day = value[date] as Record<string, unknown>;
    for (const id of Object.keys(day)) {
      if (!ids.has(id) || !isRecord(day[id])) continue;
      const cell = day[id] as Record<string, unknown>;
      const status: DontStatus | "" =
        cell.status === "Avoided" || cell.status === "Gave In" ? cell.status : "";
      bucket[id] = { status, notes: clip(cell.notes, 500) };
    }
    if (Object.keys(bucket).length) out[date] = bucket;
  }
  return out;
}

function parseJournals(value: unknown): Record<string, JournalEntry> {
  if (value == null) return {};
  if (!isRecord(value)) throw new Error("Invalid journal.");
  const out: Record<string, JournalEntry> = {};
  for (const date of Object.keys(value).slice(0, 500)) {
    if (!ISO_DATE.test(date) || !isRecord(value[date])) continue;
    const entry = value[date] as Record<string, unknown>;
    const mood =
      typeof entry.mood === "number" && entry.mood >= 1 && entry.mood <= 5
        ? Math.round(entry.mood)
        : null;
    out[date] = {
      mood,
      grateful: clip(entry.grateful, 2000),
      win: clip(entry.win, 2000),
      reflection: clip(entry.reflection, 4000),
    };
  }
  return out;
}

function parseLines(value: unknown): Record<string, string> {
  if (value == null) return {};
  if (!isRecord(value)) throw new Error("Invalid one-line journal.");
  const out: Record<string, string> = {};
  for (const date of Object.keys(value).slice(0, 500)) {
    if (!ISO_DATE.test(date)) continue;
    const line = clip(value[date], 280);
    if (line) out[date] = line;
  }
  return out;
}

function parseGoals(value: unknown): Goal[] {
  if (!Array.isArray(value) || value.length > 40) throw new Error("Invalid goals.");
  const seen = new Set<string>();
  const goals: Goal[] = [];
  for (const item of value) {
    if (!isRecord(item)) throw new Error("Invalid goals.");
    const id = clip(item.id, 64);
    const title = clip(item.title, 200) || "Untitled";
    if (!id || seen.has(id)) throw new Error("Invalid goals.");
    seen.add(id);
    const horizon: GoalHorizon = item.horizon === "long" ? "long" : "short";
    const status: GoalStatus = GOAL_STATUSES.includes(item.status as GoalStatus)
      ? (item.status as GoalStatus)
      : "Not Started";
    const progress = typeof item.progress === "number" && Number.isFinite(item.progress)
      ? Math.min(100, Math.max(0, Math.round(item.progress)))
      : 0;
    const targetDate = ISO_DATE.test(clip(item.targetDate, 10)) ? clip(item.targetDate, 10) : "";
    goals.push({
      id,
      horizon,
      title,
      category: clip(item.category, 60),
      targetDate,
      progress,
      status,
      notes: clip(item.notes, 2000),
    });
  }
  return goals;
}

function parseReflections(value: unknown): Record<string, MonthReflection> {
  if (value == null) return {};
  if (!isRecord(value)) throw new Error("Invalid reflections.");
  const out: Record<string, MonthReflection> = {};
  for (const key of Object.keys(value).slice(0, 24)) {
    if (!MONTH_KEY.test(key) || !isRecord(value[key])) continue;
    const entry = value[key] as Record<string, unknown>;
    out[key] = {
      well: clip(entry.well, 4000),
      didnt: clip(entry.didnt, 4000),
      habit: clip(entry.habit, 400),
      focus: clip(entry.focus, 4000),
    };
  }
  return out;
}

export function parseLifeData(input: unknown): LifeData {
  let size = 0;
  try {
    size = JSON.stringify(input).length;
  } catch {
    throw new Error("Invalid log.");
  }
  if (size > MAX_JSON) throw new Error("That log is too large to save.");
  if (!isRecord(input)) throw new Error("Invalid log.");
  const dos = parseHabits(input.dos, "do");
  const donts = parseHabits(input.donts, "don't");
  return {
    dos,
    donts,
    doChecks: parseDoChecks(input.doChecks, new Set(dos.map((habit) => habit.id))),
    dontChecks: parseDontChecks(input.dontChecks, new Set(donts.map((habit) => habit.id))),
    journals: parseJournals(input.journals),
    oneLines: parseLines(input.oneLines),
    goals: parseGoals(input.goals),
    reflections: parseReflections(input.reflections),
  };
}

export function selectData(state: LifeData): LifeData {
  return {
    dos: state.dos,
    donts: state.donts,
    doChecks: state.doChecks,
    dontChecks: state.dontChecks,
    journals: state.journals,
    oneLines: state.oneLines,
    goals: state.goals,
    reflections: state.reflections,
  };
}
