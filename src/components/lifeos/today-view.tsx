import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  MOODS,
  clampProgram,
  createExample,
  dayNumber,
  emptyJournal,
  formatLong,
  isScheduled,
  pctLabel,
  programOf,
  scheduleLabel,
  shiftDate,
  todayISO,
} from "@/lib/lifeos/model";
import { buildScores } from "@/lib/lifeos/score";
import { selectData } from "@/lib/lifeos/validate";
import { useLife } from "@/lib/lifeos/store";
import { useLifeData } from "@/lib/lifeos/use-life-data";
import { isReviewDone, reviewWeekFor } from "@/lib/lifeos/weekly";
import { cn } from "@/lib/utils";
import { TodoAdder, TodoRow } from "./todo-view";
import { Area, Field, Panel } from "./ui";
import { WeeklyReviewCard } from "./weekly-review";

export function TodayView({
  date,
  onDate,
  onSetup,
  onOpenTodos,
  reminderDue,
}: {
  date: string;
  onDate: (iso: string) => void;
  onSetup: () => void;
  onOpenTodos: () => void;
  reminderDue: boolean;
}) {
  const data = useLifeData();
  const { dos, donts, doChecks, dontChecks, journals, oneLines } = data;
  const toggleDo = useLife((state) => state.toggleDo);
  const setDoNote = useLife((state) => state.setDoNote);
  const setDontStatus = useLife((state) => state.setDontStatus);
  const setDontNote = useLife((state) => state.setDontNote);
  const setOneLine = useLife((state) => state.setOneLine);
  const patchJournal = useLife((state) => state.patchJournal);

  const today = todayISO();
  const program = programOf(data);
  const score = useMemo(() => buildScores(data, today).find((day) => day.date === date), [data, today, date]);
  const journal = journals[date] ?? emptyJournal();
  const noHabits = dos.length === 0 && donts.length === 0;
  const atStart = date <= program.start;
  const atEnd = date >= program.end;
  const todaysDos = dos.filter((habit) => isScheduled(habit, date));
  const todaysDonts = donts.filter((habit) => isScheduled(habit, date));
  const hiddenCount = dos.length - todaysDos.length + (donts.length - todaysDonts.length);
  const reviewMonday = reviewWeekFor(today);
  const reviewPending = reviewMonday !== null && !isReviewDone(data.weeklyReviews[reviewMonday]);
  // Once the card has been shown this session it stays, even after the first words are typed.
  const [reviewKept, setReviewKept] = useState<string | null>(null);
  useEffect(() => {
    if (reviewPending && reviewMonday) setReviewKept(reviewMonday);
  }, [reviewPending, reviewMonday]);
  const showReview = reviewMonday !== null && date === today && (reviewPending || reviewKept === reviewMonday);
  const programOver = today > program.end;
  const todoPanel = data.todos
    .filter((t) => !t.done && ((t.due && t.due <= today) || (!t.due && t.priority === "high")))
    .sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            <span data-testid="day-number">
              Day {dayNumber(date, program)} of {program.days}
            </span>
            {date === today ? " · Today" : ""}
          </p>
          <h1 data-testid="day-title" className="font-display text-3xl font-medium tracking-tight text-fg">
            {formatLong(date)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            data-testid="prev-day"
            disabled={atStart}
            onClick={() => onDate(clampProgram(shiftDate(date, -1), program))}
            className="grid size-11 place-items-center rounded-md border border-line bg-surface disabled:opacity-40"
          >
            <ChevronLeft className="size-5" />
          </button>
          {date !== today ? (
            <button
              type="button"
              data-testid="go-today"
              onClick={() => onDate(clampProgram(today, program))}
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Next day"
            data-testid="next-day"
            disabled={atEnd}
            onClick={() => onDate(clampProgram(shiftDate(date, 1), program))}
            className="grid size-11 place-items-center rounded-md border border-line bg-surface disabled:opacity-40"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {reminderDue && date === today ? (
        <div
          role="status"
          data-testid="reminder-banner"
          className="flex items-center gap-3 rounded-xl border border-line bg-good-soft px-4 py-3 text-sm"
        >
          <BellRing className="size-5 shrink-0 text-good" />
          <p>It's past your reminder time and today isn't logged yet.</p>
        </div>
      ) : null}

      {programOver && date >= program.end ? (
        <Panel>
          <h2 className="font-display text-2xl font-medium">Your {program.days}-day program is complete 🎉</h2>
          <p className="mt-1 text-sm text-muted">
            Review your results on the Board, then start a fresh program from Account &amp; habits whenever you're ready.
          </p>
          <button
            type="button"
            data-testid="finish-open-settings"
            onClick={onSetup}
            className="mt-3 h-11 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Start a new program
          </button>
        </Panel>
      ) : null}

      {noHabits ? (
        <Panel>
          <h2 className="font-display text-2xl font-medium">Welcome — let's set up your log</h2>
          <p className="mt-1 text-sm text-muted">
            Your log is empty. Add the daily habits you want to do (and the ones you want to avoid), then tick them off
            here each day.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="setup-add-habits"
              onClick={onSetup}
              className="h-11 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
            >
              Add my own habits
            </button>
            <button
              type="button"
              data-testid="setup-example"
              onClick={() => {
                const example = createExample();
                const current = selectData(useLife.getState());
                useLife.getState().replace({
                  ...current,
                  dos: example.dos,
                  donts: example.donts,
                  goals: [...current.goals, ...example.goals],
                  todos: [...current.todos, ...example.todos],
                });
              }}
              className="h-11 rounded-md border border-line px-4 text-sm font-medium"
            >
              Start from an example
            </button>
          </div>
        </Panel>
      ) : null}

      {score && !noHabits && score.rest ? (
        <Panel>
          <p className="font-display text-2xl font-medium" data-testid="rest-day">
            Rest day
          </p>
          <p className="mt-1 text-sm text-muted">Nothing is scheduled today, so it won't affect your score or streak.</p>
        </Panel>
      ) : null}

      {score && !noHabits && !score.rest ? (
        <Panel>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <p data-testid="score-percent" className="font-display text-5xl font-medium tabular-nums tracking-tight text-fg">
                {pctLabel(score.overall)}
              </p>
              <p className={cn("text-sm", score.good ? "text-good" : "text-muted")}>
                {score.good ? "Good day — 80% or higher" : "Good day starts at 80%"}
              </p>
            </div>
            <div className="space-y-3">
              <Meter label="Do's" detail={`${score.dosDone}/${score.dosTotal}`} ratio={score.dosPct} tone="good" />
              <Meter
                label="Don'ts avoided"
                detail={`${score.dontsAvoided}/${score.dontsTotal}`}
                ratio={score.dontsPct}
                tone="good"
              />
              <p className="text-sm text-muted">
                Streak through today: {score.streak ?? "—"} · Gave in today: {score.dontsGaveIn}
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-2xl font-medium">Daily do's</h2>
          <p className="mb-3 text-sm text-muted">Tick each habit as you finish it. Done items stay struck through.</p>
          {todaysDos.length === 0 ? (
            <p className="text-sm text-muted">
              {dos.length > 0 ? "No do's scheduled today." : "No do's yet."}{" "}
              <button type="button" className="underline underline-offset-2" onClick={onSetup}>
                {dos.length === 0 ? "Add some" : ""}
              </button>
            </p>
          ) : null}
          <ul className="divide-y divide-line" data-testid="do-list">
            {todaysDos.map((habit) => {
              const cell = doChecks[date]?.[habit.id];
              const done = cell?.done === true;
              return (
                <li key={habit.id} className="py-3" data-testid="do-item" data-label={habit.label} data-done={done}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      data-testid="do-toggle"
                      aria-pressed={done}
                      aria-label={done ? `Mark not done: ${habit.label}` : `Mark done: ${habit.label}`}
                      onClick={() => toggleDo(date, habit.id)}
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-md border transition-colors duration-150",
                        done ? "border-good bg-good text-accent-fg" : "border-line bg-paper text-transparent",
                      )}
                    >
                      <Check className="size-5" strokeWidth={2.5} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("pt-2 text-base", done && "text-good line-through")}>
                        {habit.label}
                        {habit.days?.length ? (
                          <span className="ml-2 text-xs font-normal text-subtle">{scheduleLabel(habit)}</span>
                        ) : null}
                      </p>
                      <NoteField
                        value={cell?.notes ?? ""}
                        onChange={(notes) => setDoNote(date, habit.id, notes)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <h2 className="font-display text-2xl font-medium">Daily don'ts</h2>
          <p className="mb-3 text-sm text-muted">
            Avoided or gave in. Unmarked does not count as avoided — honesty beats a perfect streak.
          </p>
          {todaysDonts.length === 0 ? (
            <p className="text-sm text-muted">
              {donts.length > 0 ? "No don'ts scheduled today." : "No don'ts yet."}{" "}
              <button type="button" className="underline underline-offset-2" onClick={onSetup}>
                {donts.length === 0 ? "Add some" : ""}
              </button>
            </p>
          ) : null}
          <ul className="space-y-3" data-testid="dont-list">
            {todaysDonts.map((habit) => {
              const cell = dontChecks[date]?.[habit.id];
              const status = cell?.status ?? "";
              return (
                <li
                  key={habit.id}
                  className="rounded-lg border border-line bg-paper p-3"
                  data-testid="dont-item"
                  data-label={habit.label}
                  data-status={status}
                >
                  <p
                    className={cn(
                      "text-base",
                      status === "Avoided" && "text-good line-through",
                      status === "Gave In" && "font-medium text-bad",
                    )}
                  >
                    {habit.label}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="dont-avoided"
                      aria-pressed={status === "Avoided"}
                      onClick={() => setDontStatus(date, habit.id, "Avoided")}
                      className={cn(
                        "h-11 rounded-md text-sm font-medium",
                        status === "Avoided" ? "bg-good-soft text-good" : "bg-inset text-muted",
                      )}
                    >
                      Avoided
                    </button>
                    <button
                      type="button"
                      data-testid="dont-gave-in"
                      aria-pressed={status === "Gave In"}
                      onClick={() => setDontStatus(date, habit.id, "Gave In")}
                      className={cn(
                        "h-11 rounded-md text-sm font-medium",
                        status === "Gave In" ? "bg-bad-soft text-bad" : "bg-inset text-muted",
                      )}
                    >
                      Gave in
                    </button>
                  </div>
                  <NoteField
                    value={cell?.notes ?? ""}
                    onChange={(notes) => setDontNote(date, habit.id, notes)}
                  />
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {hiddenCount > 0 ? (
        <p className="text-sm text-subtle" data-testid="hidden-habits-note">
          {hiddenCount} habit{hiddenCount === 1 ? " isn't" : "s aren't"} scheduled for this weekday.
        </p>
      ) : null}

      {showReview && reviewMonday ? (
        <WeeklyReviewCard
          monday={reviewMonday}
          title={weekdayIsSunday(today) ? "Weekly review — it's Sunday" : "Last week's review"}
        />
      ) : null}

      <Panel>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium">Tasks to do</h2>
          <button
            type="button"
            data-testid="open-todos"
            onClick={onOpenTodos}
            className="h-11 text-sm text-muted underline-offset-2 hover:underline"
          >
            All tasks
          </button>
        </div>
        <ul className="divide-y divide-line" data-testid="todos-today-panel">
          {todoPanel.map((todo) => (
            <TodoRow key={todo.id} todo={todo} today={today} />
          ))}
        </ul>
        {todoPanel.length === 0 ? <p className="mb-3 text-sm text-muted">Nothing due. Add a task for today:</p> : null}
        <div className="mt-3">
          <TodoAdder defaultDue={today} testId="today-todo" />
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-medium">One line today</h2>
        <p className="mb-3 text-sm text-muted">One sentence. Easy to fill, useful to scroll back through.</p>
        <Field
          data-testid="one-line-input"
          aria-label="One line today"
          value={oneLines[date] ?? ""}
          maxLength={280}
          placeholder="What was this day, in one line?"
          onChange={(event) => setOneLine(date, event.target.value)}
        />
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-medium">Daily journal</h2>
        <p className="mb-3 text-sm text-muted">Mood, gratitude, a win, and a short reflection.</p>
        <p className="mb-2 text-sm font-medium">Mood</p>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((mood) => {
            const active = journal.mood === mood.value;
            return (
              <button
                key={mood.value}
                type="button"
                data-testid={`mood-${mood.value}`}
                aria-pressed={active}
                onClick={() => patchJournal(date, { mood: active ? null : mood.value })}
                className={cn(
                  "h-14 rounded-md text-sm font-medium",
                  active ? "bg-accent text-accent-fg" : "bg-inset text-muted",
                )}
              >
                <span className="block text-base">{mood.value}</span>
                <span className="block text-xs font-normal">{mood.label}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-4 block text-sm font-medium">
          Grateful for
          <Area
            className="mt-1"
            rows={2}
            maxLength={2000}
            data-testid="journal-grateful"
            value={journal.grateful}
            onChange={(event) => patchJournal(date, { grateful: event.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Win
          <Area
            className="mt-1"
            rows={2}
            maxLength={2000}
            data-testid="journal-win"
            value={journal.win}
            onChange={(event) => patchJournal(date, { win: event.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Reflection
          <Area
            className="mt-1"
            rows={3}
            maxLength={4000}
            data-testid="journal-reflection"
            value={journal.reflection}
            onChange={(event) => patchJournal(date, { reflection: event.target.value })}
          />
        </label>
      </Panel>
    </div>
  );
}

function Meter({
  label,
  detail,
  ratio,
  tone,
}: {
  label: string;
  detail: string;
  ratio: number;
  tone: "good";
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {detail} · {pctLabel(ratio)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-inset">
        <div
          className={cn("h-full rounded-full", tone === "good" && "bg-good")}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (notes: string) => void }) {
  const [open, setOpen] = useState(Boolean(value));
  if (!open) {
    return (
      <button type="button" className="mt-1 text-sm text-muted underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
        {value ? "Edit note" : "Add note"}
      </button>
    );
  }
  return (
    <Field
      className="mt-2 h-10"
      value={value}
      maxLength={500}
      placeholder="Optional note"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function weekdayIsSunday(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y as number, (m as number) - 1, d as number).getDay() === 0;
}
