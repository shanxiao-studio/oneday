import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  Circle,
  Inbox,
  ListChecks,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createTask,
  getTodayKey,
  parseStoredTasks,
  rolloverTasks,
  sortTasks,
  STORAGE_KEY,
  type Task,
} from "@/lib/tasks";

type View = "today" | "inbox" | "done";

const viewCopy: Record<View, { title: string; description: string }> = {
  today: {
    title: "今日",
    description: "保持当日焦点。",
  },
  inbox: {
    title: "收件箱",
    description: "等待重新安排。",
  },
  done: {
    title: "已完成",
    description: "已经收尾。",
  },
};

function App() {
  const todayKey = getTodayKey();
  const [tasks, setTasks] = useState<Task[]>(() =>
    rolloverTasks(parseStoredTasks(localStorage.getItem(STORAGE_KEY)), todayKey),
  );
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<View>("today");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const todayTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === "today")),
    [tasks],
  );
  const inboxTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === "inbox")),
    [tasks],
  );
  const doneTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.status === "done")),
    [tasks],
  );
  const visibleTasks =
    view === "today" ? todayTasks : view === "inbox" ? inboxTasks : doneTasks;

  function addTodayTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) {
      return;
    }

    setTasks((current) => [createTask(title, todayKey), ...current]);
    setDraft("");
    setView("today");
  }

  function completeTask(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status: "done", completedAt: new Date().toISOString() }
          : task,
      ),
    );
  }

  function moveToToday(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "today",
              scheduledFor: todayKey,
              completedAt: undefined,
            }
          : task,
      ),
    );
    setView("today");
  }

  function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_#ffffff_78%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">oneday</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              今天只做今天的事
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{todayKey}</span>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <nav className="rounded-lg border bg-card p-2" aria-label="任务视图">
              <ViewButton
                active={view === "today"}
                count={todayTasks.length}
                icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
                label="今日"
                onClick={() => setView("today")}
              />
              <ViewButton
                active={view === "inbox"}
                count={inboxTasks.length}
                icon={<Inbox className="h-4 w-4" aria-hidden="true" />}
                label="收件箱"
                onClick={() => setView("inbox")}
              />
              <ViewButton
                active={view === "done"}
                count={doneTasks.length}
                icon={<Check className="h-4 w-4" aria-hidden="true" />}
                label="已完成"
                onClick={() => setView("done")}
              />
            </nav>

            <div className="rounded-lg border bg-secondary/70 p-4 text-sm text-secondary-foreground">
              <div className="flex items-center gap-2 font-medium">
                <Archive className="h-4 w-4" aria-hidden="true" />
                日终
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {todayTasks.length}
                <span className="ml-2 text-sm font-medium">项待完成</span>
              </p>
            </div>
          </aside>

          <Card className="min-h-[560px] shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{viewCopy[view].title}</CardTitle>
                  <CardDescription className="mt-2">
                    {viewCopy[view].description}
                  </CardDescription>
                </div>
                <span className="rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
                  {visibleTasks.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <form className="border-b p-4 sm:p-6" onSubmit={addTodayTask}>
                <label className="sr-only" htmlFor="new-task">
                  添加今日待办
                </label>
                <div className="flex gap-2">
                  <Input
                    id="new-task"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="添加今日待办"
                  />
                  <Button size="icon" aria-label="添加今日待办">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </form>
              {visibleTasks.length > 0 ? (
                <ul className="divide-y">
                  {visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      onDelete={deleteTask}
                      onMoveToToday={moveToToday}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState view={view} />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

type ViewButtonProps = {
  active: boolean;
  count: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function ViewButton({ active, count, icon, label, onClick }: ViewButtonProps) {
  return (
    <button
      className={`flex h-11 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span>{count}</span>
    </button>
  );
}

type TaskRowProps = {
  task: Task;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
};

function TaskRow({ task, onComplete, onDelete, onMoveToToday }: TaskRowProps) {
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6">
      <button
        aria-label={`完成 ${task.title}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:hover:border-border disabled:hover:text-muted-foreground"
        disabled={task.status === "done"}
        onClick={() => onComplete(task.id)}
        type="button"
      >
        {task.status === "done" ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Circle className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`break-words text-sm font-medium leading-6 ${
            task.status === "done" ? "text-muted-foreground line-through" : ""
          }`}
        >
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground">
          归属日期 {task.scheduledFor}
        </p>
      </div>
      {task.status !== "today" ? (
        <Button
          onClick={() => onMoveToToday(task.id)}
          size="sm"
          type="button"
          variant="outline"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          今天
        </Button>
      ) : null}
      <Button
        aria-label={`删除 ${task.title}`}
        onClick={() => onDelete(task.id)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

function EmptyState({ view }: { view: View }) {
  const copy =
    view === "today"
      ? "今天还没有待办。"
      : view === "inbox"
        ? "收件箱是空的。"
        : "还没有完成项。";

  return (
    <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-medium">{copy}</p>
      </div>
    </div>
  );
}

export default App;
