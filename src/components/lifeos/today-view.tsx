import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  MOODS,
  PROGRAM_END,
  PROGRAM_START,
  clampProgram,
  dayNumber,
  emptyJournal,
  formatLong,
  pctLabel,
  shiftDate,
  todayISO,
} from "@/lib/lifeos/model";
import { buildScores } from "@/lib/lifeos/score";
import { useLife } from "@/lib/lifeos/store";
import { cn } from "@/lib/utils";
import { Area, Field, Panel } from "./ui";

export function TodayView({
  date,
  onDate,
}: {
  date: string;
  onDate: (iso: string) => void;
}) {
  const dos = useLife((state) => state.dos);
  const donts = useLife((state) => state.donts);
  const doChecks = useLife((state) => state.doChecks);
  const dontChecks = useLife((state) => state.dontChecks);
  const journals = useLife((state) => state.journals);
  const oneLines = useLife((state) => state.oneLines);
  const toggleDo = useLife((state) => state.toggleDo);
  const setDoNote = useLife((state) => state.setDoNote);
  const setDontStatus = useLife((state) => state.setDontStatus);
  const setDontNote = useLife((state) => state.setDontNote);
  const setOneLine = useLife((state) => state.setOneLine);
  const patchJournal = useLife((state) => state.patchJournal);

  const today = todayISO();
  const score = buildScores(
    { dos, donts, doChecks, dontChecks, journals, oneLines, goals: [], reflections: {} },
    today,
  ).find((day) => day.date === date);
  const journal = journals[date] ?? emptyJournal();
  const atStart = date <= PROGRAM_START;
  const atEnd = date >= PROGRAM_END;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            Day {dayNumber(date)} of 90
            {date === today ? " · Today" : ""}
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">{formatLong(date)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            disabled={atStart}
            onClick={() => onDate(clampProgram(shiftDate(date, -1)))}
            className="grid size-11 place-items-center rounded-md border border-line bg-surface disabled:opacity-40"
          >
            <ChevronLeft className="size-5" />
          </button>
          {date !== today ? (
            <button
              type="button"
              onClick={() => onDate(clampProgram(today))}
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Next day"
            disabled={atEnd}
            onClick={() => onDate(clampProgram(shiftDate(date, 1)))}
            className="grid size-11 place-items-center rounded-md border border-line bg-surface disabled:opacity-40"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {score ? (
        <Panel>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <p className="font-display text-5xl font-medium tabular-nums tracking-tight text-fg">
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
          <ul className="divide-y divide-line">
            {dos.map((habit) => {
              const cell = doChecks[date]?.[habit.id];
              const done = cell?.done === true;
              return (
                <li key={habit.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
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
                      <p className={cn("pt-2 text-base", done && "text-good line-through")}>{habit.label}</p>
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
          <ul className="space-y-3">
            {donts.map((habit) => {
              const cell = dontChecks[date]?.[habit.id];
              const status = cell?.status ?? "";
              return (
                <li key={habit.id} className="rounded-lg border border-line bg-paper p-3">
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

      <Panel>
        <h2 className="font-display text-2xl font-medium">One line today</h2>
        <p className="mb-3 text-sm text-muted">One sentence. Easy to fill, useful to scroll back through.</p>
        <Field
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
