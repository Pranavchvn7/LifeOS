import { programOf, type LifeData } from "./model";
import { buildAllScores } from "./score";
import { isReviewDone } from "./weekly";

export type BadgeIcon = "flame" | "star" | "footprints" | "book" | "check" | "target" | "trophy" | "calendar";

export type Badge = {
  id: string;
  title: string;
  description: string;
  icon: BadgeIcon;
  earned: boolean;
  /** 0–1 progress toward earning it. */
  progress: number;
  /** "3 / 7" style progress text. */
  progressLabel: string;
  /** Date it was earned, when we can tell. */
  earnedOn?: string;
};

const STREAKS = [3, 7, 14, 30, 60, 90] as const;

function counted(id: string, title: string, description: string, icon: BadgeIcon, value: number, target: number, earnedOn?: string): Badge {
  const earned = value >= target;
  return {
    id,
    title,
    description,
    icon,
    earned,
    progress: Math.min(1, value / target),
    progressLabel: `${Math.min(value, target)} / ${target}`,
    earnedOn: earned ? earnedOn : undefined,
  };
}

/** Milestone badges, computed from your whole history (never stored). */
export function computeBadges(data: LifeData, today: string): Badge[] {
  const all = buildAllScores(data, today);
  const program = programOf(data);

  const loggedDates = all.filter((d) => d.filled).map((d) => d.date);
  const bestStreak = all.reduce((max, d) => Math.max(max, d.streak ?? 0), 0);
  const streakReached = (n: number) => all.find((d) => (d.streak ?? 0) >= n)?.date;
  const perfect = all.find((d) => !d.rest && d.filled && d.overall >= 1);
  const journalDates = Object.entries(data.journals)
    .filter(([, j]) => j.mood !== null || j.grateful || j.win || j.reflection)
    .map(([date]) => date)
    .sort();
  const todosDone = data.todos.filter((t) => t.done);
  const reviewsDone = Object.entries(data.weeklyReviews)
    .filter(([, r]) => isReviewDone(r))
    .map(([k]) => k)
    .sort();
  const goalsDone = data.goals.filter((g) => g.status === "Done").length;
  const finishedPrograms = data.pastPrograms.length + (today > program.end ? 1 : 0);

  const badges: Badge[] = [
    counted("first-log", "First step", "Log your first day.", "footprints", loggedDates.length, 1, loggedDates[0]),
    ...STREAKS.map((n) =>
      counted(`streak-${n}`, `${n}-day streak`, `${n} good days (80%+) in a row.`, "flame", bestStreak, n, streakReached(n)),
    ),
    counted("perfect-day", "Perfect day", "Score 100% on a day.", "star", perfect ? 1 : 0, 1, perfect?.date),
    counted("logged-30", "Consistent logger", "Log 30 different days.", "calendar", loggedDates.length, 30, loggedDates[29]),
    counted("journal-7", "Reflective", "Write 7 journal entries.", "book", journalDates.length, 7, journalDates[6]),
    counted("todo-10", "Task master", "Complete 10 to-dos.", "check", todosDone.length, 10,
      todosDone.map((t) => t.doneOn).filter(Boolean).sort()[9]),
    counted("review-1", "Weekly reviewer", "Complete your first weekly review.", "target", reviewsDone.length, 1, reviewsDone[0]),
    counted("review-4", "Review habit", "Complete 4 weekly reviews.", "target", reviewsDone.length, 4, reviewsDone[3]),
    counted("goal-done", "Goal getter", "Mark a goal as Done.", "trophy", goalsDone, 1),
    counted("program-done", "Finisher", "Complete a full program.", "trophy", finishedPrograms, 1),
  ];
  return badges;
}
