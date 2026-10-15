import { useState } from "react";
import { GOAL_STATUSES, formatMonthDay, todayISO, type Goal, type GoalHorizon, type GoalStatus } from "@/lib/lifeos/model";
import { useLife } from "@/lib/lifeos/store";
import { Area, Field, Panel } from "./ui";

export function GoalsView() {
  const goals = useLife((state) => state.goals);
  const patchGoal = useLife((state) => state.patchGoal);
  const addGoal = useLife((state) => state.addGoal);
  const removeGoal = useLife((state) => state.removeGoal);
  const today = todayISO();

  return (
    <div className="space-y-4" data-testid="goals-view">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted">
          Short-term is this month. Long-term is the next 3–12 months. Update progress as you go.
        </p>
      </div>
      <GoalList
        title="Short-term"
        horizon="short"
        goals={goals.filter((goal) => goal.horizon === "short")}
        today={today}
        onPatch={patchGoal}
        onAdd={() => addGoal("short")}
        onRemove={removeGoal}
      />
      <GoalList
        title="Long-term"
        horizon="long"
        goals={goals.filter((goal) => goal.horizon === "long")}
        today={today}
        onPatch={patchGoal}
        onAdd={() => addGoal("long")}
        onRemove={removeGoal}
      />
    </div>
  );
}

function GoalList({
  title,
  horizon,
  goals,
  today,
  onPatch,
  onAdd,
  onRemove,
}: {
  title: string;
  horizon: GoalHorizon;
  goals: Goal[];
  today: string;
  onPatch: (id: string, patch: Partial<Goal>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-medium">{title}</h2>
        <button type="button" data-testid={`add-goal-${horizon}`} onClick={onAdd} className="h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg">
          Add goal
        </button>
      </div>
      {goals.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">No {horizon === "short" ? "short-term" : "long-term"} goals yet.</p>
        </Panel>
      ) : (
        goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} today={today} onPatch={onPatch} onRemove={onRemove} />
        ))
      )}
    </section>
  );
}

function GoalCard({
  goal,
  today,
  onPatch,
  onRemove,
}: {
  goal: Goal;
  today: string;
  onPatch: (id: string, patch: Partial<Goal>) => void;
  onRemove: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const overdue = Boolean(goal.targetDate) && goal.targetDate < today && goal.status !== "Done";
  return (
    <Panel>
      <input
        aria-label="Goal title"
        data-testid="goal-title"
        value={goal.title}
        maxLength={200}
        onChange={(event) => onPatch(goal.id, { title: event.target.value })}
        className="w-full bg-transparent font-display text-xl font-medium outline-none"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Category
          <Field className="mt-1" value={goal.category} maxLength={60} onChange={(event) => onPatch(goal.id, { category: event.target.value })} />
        </label>
        <label className="text-sm">
          Target date
          <Field className="mt-1" type="date" value={goal.targetDate} onChange={(event) => onPatch(goal.id, { targetDate: event.target.value })} />
        </label>
        <label className="text-sm">
          Status
          <select
            data-testid="goal-status"
            value={goal.status}
            onChange={(event) => onPatch(goal.id, { status: event.target.value as GoalStatus })}
            className="mt-1 h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
          >
            {GOAL_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm">
        Progress {goal.progress}%
        {goal.targetDate ? ` · due ${formatMonthDay(goal.targetDate)}` : ""}
        {overdue ? <span className="text-bad"> · overdue</span> : null}
        <input
          type="range"
          aria-label="Goal progress"
          data-testid="goal-progress"
          min={0}
          max={100}
          value={goal.progress}
          onChange={(event) => onPatch(goal.id, { progress: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-inset">
        <div className="h-full rounded-full bg-accent" style={{ width: `${goal.progress}%` }} />
      </div>
      <label className="mt-3 block text-sm">
        Notes
        <Area className="mt-1" rows={2} maxLength={2000} value={goal.notes} onChange={(event) => onPatch(goal.id, { notes: event.target.value })} />
      </label>
      <div className="mt-2">
        {confirm ? (
          <div className="flex gap-2">
            <button type="button" className="h-11 rounded-md bg-bad px-3 text-sm font-medium text-accent-fg" onClick={() => onRemove(goal.id)}>
              Remove goal
            </button>
            <button type="button" className="h-11 rounded-md border border-line px-3 text-sm" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={() => setConfirm(true)}>
            Remove
          </button>
        )}
      </div>
    </Panel>
  );
}
