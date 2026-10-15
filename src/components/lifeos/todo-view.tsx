import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { TODO_PRIORITIES, formatPretty, todayISO, type Todo, type TodoPriority } from "@/lib/lifeos/model";
import { useLife } from "@/lib/lifeos/store";
import { cn } from "@/lib/utils";
import { Field, Panel } from "./ui";

const PRIORITY_LABEL: Record<TodoPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_RANK: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_CLASS: Record<TodoPriority, string> = {
  high: "bg-bad-soft text-bad",
  medium: "bg-inset text-muted",
  low: "bg-good-soft text-good",
};

function byUrgency(a: Todo, b: Todo): number {
  if (a.due !== b.due) {
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due < b.due ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

/** Add-a-task form shared by the To-do tab and the Today page. */
export function TodoAdder({ defaultDue = "", testId = "todo" }: { defaultDue?: string; testId?: string }) {
  const addTodo = useLife((s) => s.addTodo);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [due, setDue] = useState(defaultDue);

  function submit() {
    if (!title.trim()) return;
    addTodo({ title, priority, due }, todayISO());
    setTitle("");
    setDue(defaultDue);
  }

  return (
    <div className="space-y-2" data-testid={`${testId}-adder`}>
      <div className="flex gap-2">
        <Field
          aria-label="New task"
          data-testid={`${testId}-input`}
          value={title}
          maxLength={200}
          placeholder="Add a task…"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <button
          type="button"
          aria-label="Add task"
          data-testid={`${testId}-add`}
          onClick={submit}
          className="grid size-11 shrink-0 place-items-center rounded-md bg-accent text-accent-fg"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2 text-muted">
          Priority
          <select
            aria-label="Priority"
            data-testid={`${testId}-priority`}
            value={priority}
            onChange={(event) => setPriority(event.target.value as TodoPriority)}
            className="h-10 rounded-md border border-line bg-paper px-2 text-base text-fg"
          >
            {TODO_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-muted">
          Due
          <input
            type="date"
            aria-label="Due date"
            data-testid={`${testId}-due`}
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="h-10 rounded-md border border-line bg-paper px-2 text-base text-fg"
          />
        </label>
      </div>
    </div>
  );
}

export function TodoRow({ todo, today }: { todo: Todo; today: string }) {
  const toggleTodo = useLife((s) => s.toggleTodo);
  const patchTodo = useLife((s) => s.patchTodo);
  const removeTodo = useLife((s) => s.removeTodo);
  const [open, setOpen] = useState(false);
  const overdue = !todo.done && todo.due !== "" && todo.due < today;

  return (
    <li className="py-3" data-testid="todo-item" data-title={todo.title} data-done={todo.done}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={todo.done}
          aria-label={todo.done ? `Reopen: ${todo.title}` : `Complete: ${todo.title}`}
          data-testid="todo-toggle"
          onClick={() => toggleTodo(todo.id, today)}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-md border transition-colors duration-150",
            todo.done ? "border-good bg-good text-accent-fg" : "border-line bg-paper text-transparent",
          )}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn("block w-full pt-2 text-left text-base", todo.done && "text-muted line-through")}
          >
            {todo.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2 py-0.5 font-medium", PRIORITY_CLASS[todo.priority])}>
              {PRIORITY_LABEL[todo.priority]}
            </span>
            {todo.due ? (
              <span className={cn(overdue ? "font-medium text-bad" : "text-muted")}>
                {overdue ? "Overdue · " : "Due "}
                {formatPretty(todo.due)}
              </span>
            ) : null}
          </div>
          {open ? (
            <div className="mt-2 space-y-2">
              <Field
                aria-label="Task title"
                value={todo.title}
                maxLength={200}
                onChange={(event) => patchTodo(todo.id, { title: event.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Task priority"
                  value={todo.priority}
                  onChange={(event) => patchTodo(todo.id, { priority: event.target.value as TodoPriority })}
                  className="h-10 rounded-md border border-line bg-paper px-2 text-base"
                >
                  {TODO_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Task due date"
                  value={todo.due}
                  onChange={(event) => patchTodo(todo.id, { due: event.target.value })}
                  className="h-10 rounded-md border border-line bg-paper px-2 text-base"
                />
              </div>
              <Field
                aria-label="Task notes"
                value={todo.notes}
                maxLength={1000}
                placeholder="Notes (optional)"
                onChange={(event) => patchTodo(todo.id, { notes: event.target.value })}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Delete task: ${todo.title}`}
          data-testid="todo-delete"
          onClick={() => removeTodo(todo.id)}
          className="grid size-11 shrink-0 place-items-center rounded-md text-subtle hover:text-bad"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

type Filter = "open" | "done" | "all";

export function TodoView() {
  const todos = useLife((s) => s.todos);
  const clearDoneTodos = useLife((s) => s.clearDoneTodos);
  const [filter, setFilter] = useState<Filter>("open");
  const today = todayISO();

  const { overdue, dueToday, upcoming, someday, done } = useMemo(() => {
    const open = todos.filter((t) => !t.done).sort(byUrgency);
    return {
      overdue: open.filter((t) => t.due && t.due < today),
      dueToday: open.filter((t) => t.due === today),
      upcoming: open.filter((t) => t.due && t.due > today),
      someday: open.filter((t) => !t.due),
      done: todos.filter((t) => t.done).sort((a, b) => (a.doneOn < b.doneOn ? 1 : -1)),
    };
  }, [todos, today]);

  const openCount = overdue.length + dueToday.length + upcoming.length + someday.length;
  const sections: { key: string; title: string; items: Todo[] }[] = [
    ...(filter !== "done"
      ? [
          { key: "overdue", title: "Overdue", items: overdue },
          { key: "today", title: "Due today", items: dueToday },
          { key: "upcoming", title: "Upcoming", items: upcoming },
          { key: "someday", title: "No date", items: someday },
        ]
      : []),
    ...(filter !== "open" ? [{ key: "done", title: "Completed", items: done }] : []),
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-4" data-testid="todo-view">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">To-do list</h1>
        <p className="mt-1 text-sm text-muted">
          One-off tasks that sit beside your daily habits. {openCount} open · {done.length} done.
        </p>
      </div>

      <Panel>
        <TodoAdder />
      </Panel>

      <div role="tablist" aria-label="Task filter" className="grid grid-cols-3 gap-1 rounded-lg bg-inset p-1">
        {(["open", "done", "all"] as const).map((item) => (
          <button
            key={item}
            role="tab"
            type="button"
            aria-selected={filter === item}
            data-testid={`todo-filter-${item}`}
            onClick={() => setFilter(item)}
            className={cn("h-11 rounded-md text-sm font-medium capitalize", filter === item ? "bg-surface text-fg shadow-sm" : "text-muted")}
          >
            {item}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted" data-testid="todo-empty">
            {filter === "done" ? "Nothing completed yet." : "No tasks yet. Add your first one above."}
          </p>
        </Panel>
      ) : (
        sections.map((section) => (
          <Panel key={section.key}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={cn("font-display text-xl font-medium", section.key === "overdue" && "text-bad")}>
                {section.title} <span className="text-sm text-muted">({section.items.length})</span>
              </h2>
              {section.key === "done" ? (
                <button
                  type="button"
                  data-testid="todo-clear-done"
                  onClick={clearDoneTodos}
                  className="h-11 rounded-md px-3 text-sm text-muted underline-offset-2 hover:underline"
                >
                  Clear completed
                </button>
              ) : null}
            </div>
            <ul className="divide-y divide-line">
              {section.items.map((todo) => (
                <TodoRow key={todo.id} todo={todo} today={today} />
              ))}
            </ul>
          </Panel>
        ))
      )}
    </div>
  );
}
