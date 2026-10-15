import {
  isScheduled,
  parseISODate,
  programDates,
  programOf,
  scheduleLabel,
  WEEKDAY_NAMES,
  type LifeData,
} from "./model";
import { buildAllScores, rangeStats, buildScores } from "./score";
import { buildXlsx, type Cell, type Sheet } from "./xlsx";

const yesNo = (value: boolean) => (value ? "Yes" : "No");

/** All export tables, built from your data. Header row first in each. */
export function buildExportSheets(data: LifeData, today: string): Sheet[] {
  const program = programOf(data);
  const programDateSet = new Map(programDates(program).map((d, i) => [d, i + 1]));
  const scores = buildAllScores(data, today);

  const daily: Cell[][] = [
    [
      "Date", "Weekday", "Program day", "Do's done", "Do's scheduled", "Do's %", "Don'ts avoided",
      "Gave in", "Don'ts scheduled", "Don'ts %", "Score %", "Good day (80%+)", "Mood (1-5)", "One line",
    ],
  ];
  for (const d of scores) {
    daily.push([
      d.date,
      WEEKDAY_NAMES[parseISODate(d.date).getDay()],
      programDateSet.get(d.date) ?? "",
      d.dosDone,
      d.dosTotal,
      d.dosTotal ? Math.round(d.dosPct * 100) : "",
      d.dontsAvoided,
      d.dontsGaveIn,
      d.dontsTotal,
      d.dontsTotal ? Math.round(d.dontsPct * 100) : "",
      d.rest ? "" : Math.round(d.overall * 100),
      d.rest ? "Rest day" : yesNo(d.good),
      data.journals[d.date]?.mood ?? "",
      data.oneLines[d.date] ?? "",
    ]);
  }

  const habitLog: Cell[][] = [["Date", "Type", "Habit", "Status", "Note"]];
  for (const d of scores) {
    for (const habit of data.dos) {
      if (!isScheduled(habit, d.date)) continue;
      const check = data.doChecks[d.date]?.[habit.id];
      habitLog.push([d.date, "Do", habit.label, check?.done ? "Done" : "Not done", check?.notes ?? ""]);
    }
    for (const habit of data.donts) {
      if (!isScheduled(habit, d.date)) continue;
      const check = data.dontChecks[d.date]?.[habit.id];
      habitLog.push([d.date, "Don't", habit.label, check?.status || "Not logged", check?.notes ?? ""]);
    }
  }

  const habits: Cell[][] = [["Type", "Habit", "Schedule"]];
  data.dos.forEach((h) => habits.push(["Do", h.label, scheduleLabel(h)]));
  data.donts.forEach((h) => habits.push(["Don't", h.label, scheduleLabel(h)]));

  const todos: Cell[][] = [["Task", "Priority", "Due", "Status", "Added", "Completed", "Notes"]];
  data.todos.forEach((t) =>
    todos.push([t.title, t.priority, t.due, t.done ? "Done" : "Open", t.created, t.doneOn, t.notes]),
  );

  const goals: Cell[][] = [["Horizon", "Goal", "Category", "Target date", "Status", "Progress %", "Notes"]];
  data.goals.forEach((g) =>
    goals.push([g.horizon === "short" ? "Short-term" : "Long-term", g.title, g.category, g.targetDate, g.status, g.progress, g.notes]),
  );

  const journal: Cell[][] = [["Date", "Mood (1-5)", "Grateful for", "Win", "Reflection"]];
  Object.keys(data.journals)
    .sort()
    .forEach((date) => {
      const j = data.journals[date];
      if (j) journal.push([date, j.mood ?? "", j.grateful, j.win, j.reflection]);
    });

  const reviews: Cell[][] = [["Week starting (Mon)", "Rating (1-5)", "Wins", "Struggles", "Lesson", "Next week focus"]];
  Object.keys(data.weeklyReviews)
    .sort()
    .forEach((week) => {
      const r = data.weeklyReviews[week];
      if (r) reviews.push([week, r.rating ?? "", r.wins, r.struggles, r.lesson, r.focus]);
    });

  const current = rangeStats(buildScores(data, today), program.start, program.end, today);
  const programs: Cell[][] = [["Start", "End", "Days", "Average score %", "Good days", "Days logged", "Best streak", "Status"]];
  data.pastPrograms.forEach((p) =>
    programs.push([p.start, p.end, p.days, p.avgScore, p.goodDays, p.loggedDays, p.bestStreak, "Completed"]),
  );
  programs.push([
    program.start, program.end, program.days, Math.round(current.avgOverall * 100),
    current.goodDays, current.filledDays, current.longestRun, "Current",
  ]);

  return [
    { name: "Daily summary", rows: daily },
    { name: "Habit log", rows: habitLog },
    { name: "Habits", rows: habits },
    { name: "To-dos", rows: todos },
    { name: "Goals", rows: goals },
    { name: "Journal", rows: journal },
    { name: "Weekly reviews", rows: reviews },
    { name: "Programs", rows: programs },
  ];
}

/** CSV text (UTF-8 BOM so Excel shows accents correctly). Guards against spreadsheet formula injection. */
export function toCsv(rows: Cell[][]): string {
  const escape = (cell: Cell): string => {
    if (cell === null || cell === undefined) return "";
    let text = String(cell);
    if (typeof cell === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "\ufeff" + rows.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}

export function exportFileName(base: string, ext: string, today: string): string {
  return `lifeos-${base}-${today}.${ext}`;
}

export function xlsxBytes(data: LifeData, today: string): Uint8Array {
  return buildXlsx(buildExportSheets(data, today));
}

/** Trigger a browser download. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
