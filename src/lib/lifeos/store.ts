import { create } from "zustand";
import {
  emptyJournal,
  emptyReflection,
  type DontStatus,
  type Goal,
  type GoalHorizon,
  type GoalStatus,
  type JournalEntry,
  type LifeData,
  type MonthReflection,
} from "./model";

type LifeStore = LifeData & {
  ownerId: string | null;
  ready: boolean;
  revision: number;
  load: (ownerId: string, data: LifeData) => void;
  markUnready: () => void;
  toggleDo: (date: string, id: string) => void;
  setDoNote: (date: string, id: string, notes: string) => void;
  setDontStatus: (date: string, id: string, status: DontStatus) => void;
  setDontNote: (date: string, id: string, notes: string) => void;
  setOneLine: (date: string, line: string) => void;
  patchJournal: (date: string, patch: Partial<JournalEntry>) => void;
  patchGoal: (id: string, patch: Partial<Goal>) => void;
  addGoal: (horizon: GoalHorizon) => void;
  removeGoal: (id: string) => void;
  renameHabit: (kind: "dos" | "donts", id: string, label: string) => void;
  addHabit: (kind: "dos" | "donts", label: string) => void;
  removeHabit: (kind: "dos" | "donts", id: string) => void;
  patchReflection: (month: string, patch: Partial<MonthReflection>) => void;
  replace: (data: LifeData) => void;
};

const blank: LifeData = {
  dos: [],
  donts: [],
  doChecks: {},
  dontChecks: {},
  journals: {},
  oneLines: {},
  goals: [],
  reflections: {},
};

function bump(state: LifeStore, patch: Partial<LifeData>): Partial<LifeStore> {
  return { ...patch, revision: state.revision + 1 };
}

export const useLife = create<LifeStore>((set) => ({
  ...blank,
  ownerId: null,
  ready: false,
  revision: 0,
  load: (ownerId, data) => set({ ...data, ownerId, ready: true, revision: 0 }),
  markUnready: () => set({ ready: false, ownerId: null }),
  toggleDo: (date, id) =>
    set((state) => {
      const day = { ...(state.doChecks[date] ?? {}) };
      const prev = day[id] ?? { done: false, notes: "" };
      day[id] = { ...prev, done: !prev.done };
      return bump(state, { doChecks: { ...state.doChecks, [date]: day } });
    }),
  setDoNote: (date, id, notes) =>
    set((state) => {
      const day = { ...(state.doChecks[date] ?? {}) };
      const prev = day[id] ?? { done: false, notes: "" };
      day[id] = { ...prev, notes: notes.slice(0, 500) };
      return bump(state, { doChecks: { ...state.doChecks, [date]: day } });
    }),
  setDontStatus: (date, id, status) =>
    set((state) => {
      const day = { ...(state.dontChecks[date] ?? {}) };
      const prev = day[id] ?? { status: "", notes: "" };
      day[id] = { ...prev, status: prev.status === status ? "" : status };
      return bump(state, { dontChecks: { ...state.dontChecks, [date]: day } });
    }),
  setDontNote: (date, id, notes) =>
    set((state) => {
      const day = { ...(state.dontChecks[date] ?? {}) };
      const prev = day[id] ?? { status: "", notes: "" };
      day[id] = { ...prev, notes: notes.slice(0, 500) };
      return bump(state, { dontChecks: { ...state.dontChecks, [date]: day } });
    }),
  setOneLine: (date, line) =>
    set((state) => ({
      ...bump(state, { oneLines: { ...state.oneLines, [date]: line.slice(0, 280) } }),
    })),
  patchJournal: (date, patch) =>
    set((state) => {
      const prev = state.journals[date] ?? emptyJournal();
      return bump(state, {
        journals: {
          ...state.journals,
          [date]: {
            mood: patch.mood === undefined ? prev.mood : patch.mood,
            grateful: (patch.grateful ?? prev.grateful).slice(0, 2000),
            win: (patch.win ?? prev.win).slice(0, 2000),
            reflection: (patch.reflection ?? prev.reflection).slice(0, 4000),
          },
        },
      });
    }),
  patchGoal: (id, patch) =>
    set((state) => ({
      ...bump(state, {
        goals: state.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
      }),
    })),
  addGoal: (horizon) =>
    set((state) => ({
      ...bump(state, {
        goals: [
          ...state.goals,
          {
            id: crypto.randomUUID(),
            horizon,
            title: "New goal",
            category: "",
            targetDate: "",
            progress: 0,
            status: "Not Started" satisfies GoalStatus,
            notes: "",
          },
        ],
      }),
    })),
  removeGoal: (id) =>
    set((state) => ({
      ...bump(state, { goals: state.goals.filter((goal) => goal.id !== id) }),
    })),
  renameHabit: (kind, id, label) =>
    set((state) => ({
      ...bump(state, {
        [kind]: state[kind].map((habit) =>
          habit.id === id ? { ...habit, label: label.slice(0, 140) } : habit,
        ),
      }),
    })),
  addHabit: (kind, label) =>
    set((state) => {
      if (state[kind].length >= 40) return {};
      return bump(state, {
        [kind]: [...state[kind], { id: crypto.randomUUID(), label: label.slice(0, 140) }],
      });
    }),
  removeHabit: (kind, id) =>
    set((state) => {
      return bump(state, { [kind]: state[kind].filter((habit) => habit.id !== id) });
    }),
  patchReflection: (month, patch) =>
    set((state) => {
      const prev = state.reflections[month] ?? emptyReflection();
      return bump(state, {
        reflections: {
          ...state.reflections,
          [month]: {
            well: (patch.well ?? prev.well).slice(0, 4000),
            didnt: (patch.didnt ?? prev.didnt).slice(0, 4000),
            habit: (patch.habit ?? prev.habit).slice(0, 400),
            focus: (patch.focus ?? prev.focus).slice(0, 4000),
          },
        },
      });
    }),
  replace: (data) => set((state) => ({ ...data, revision: state.revision + 1, ready: true })),
}));
