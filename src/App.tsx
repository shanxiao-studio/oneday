import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  Circle,
  Inbox,
  Tags,
  ListChecks,
  Moon,
  Plus,
  RotateCcw,
  Sun,
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
  createTaggedTask,
  filterTasksByTag,
  getTaskTags,
  getTodayKey,
  parseTaskDraft,
  parseStoredTasks,
  rolloverTasks,
  sortTasks,
  STORAGE_KEY,
  type Task,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

type View = "today" | "inbox" | "done";
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "oneday-theme";

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

function getStoredTheme(): Theme {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const todayKey = getTodayKey();
  const [tasks, setTasks] = useState<Task[]>(() =>
    rolloverTasks(parseStoredTasks(localStorage.getItem(STORAGE_KEY)), todayKey),
  );
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<View>("today");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
  const baseTasks =
    view === "today" ? todayTasks : view === "inbox" ? inboxTasks : doneTasks;
  const availableTags = useMemo(() => getTaskTags(baseTasks), [baseTasks]);
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tag of availableTags) {
      counts.set(tag, filterTasksByTag(baseTasks, tag).length);
    }

    return counts;
  }, [availableTags, baseTasks]);
  const visibleTasks = useMemo(
    () => filterTasksByTag(baseTasks, selectedTag),
    [baseTasks, selectedTag],
  );

  useEffect(() => {
    if (selectedTag && !availableTags.includes(selectedTag)) {
      setSelectedTag(null);
    }
  }, [availableTags, selectedTag]);

  function addTodayTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedDraft = parseTaskDraft(draft);
    if (!parsedDraft.title) {
      return;
    }

    setTasks((current) => [
      createTaggedTask(draft, {
        scheduledFor: todayKey,
      }),
      ...current,
    ]);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted))_100%)] transition-colors">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">oneday</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              今天只做今天的事
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              <span>{todayKey}</span>
            </div>
            <Button
              aria-label={theme === "dark" ? "切换到浅色主题" : "切换到暗色主题"}
              onClick={() =>
                setTheme((currentTheme) =>
                  currentTheme === "dark" ? "light" : "dark",
                )
              }
              size="icon"
              type="button"
              variant="outline"
            >
              {theme === "dark" ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <nav className="rounded-lg border bg-card p-2" aria-label="任务视图">
              <ViewButton
                active={view === "today"}
                count={todayTasks.length}
                icon={<ListChecks className="size-4" aria-hidden="true" />}
                label="今日"
                onClick={() => setView("today")}
              />
              <ViewButton
                active={view === "inbox"}
                count={inboxTasks.length}
                icon={<Inbox className="size-4" aria-hidden="true" />}
                label="收件箱"
                onClick={() => setView("inbox")}
              />
              <ViewButton
                active={view === "done"}
                count={doneTasks.length}
                icon={<Check className="size-4" aria-hidden="true" />}
                label="已完成"
                onClick={() => setView("done")}
              />
            </nav>

            <div className="rounded-lg border bg-secondary/70 p-4 text-sm text-secondary-foreground">
              <div className="flex items-center gap-2 font-medium">
                <Archive className="size-4" aria-hidden="true" />
                日终
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {todayTasks.length}
                <span className="ml-2 text-sm font-medium">项待完成</span>
              </p>
            </div>

            <TagSidebarSection
              availableTags={availableTags}
              baseTaskCount={baseTasks.length}
              selectedTag={selectedTag}
              tagCounts={tagCounts}
              onSelectTag={setSelectedTag}
            />
          </aside>

          <Card className="min-h-[560px] shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{viewCopy[view].title}</CardTitle>
                  <CardDescription className="mt-2">
                    {selectedTag
                      ? `按 #${selectedTag} 查看。`
                      : viewCopy[view].description}
                  </CardDescription>
                </div>
                <span className="rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
                  {visibleTasks.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <form className="border-b p-4 sm:p-6" onSubmit={addTodayTask}>
                <label className="sr-only" htmlFor="new-task-title">
                  待办标题
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="new-task-title"
                    className="sm:flex-1"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="添加今日待办，用 #标签 标记分类"
                  />
                  <Button
                    aria-label="添加今日待办"
                    className="sm:shrink-0"
                    size="icon"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  直接在文本里写 #工作、#复盘 这样的标签即可
                </p>
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

type TagSidebarSectionProps = {
  availableTags: string[];
  baseTaskCount: number;
  selectedTag: string | null;
  tagCounts: Map<string, number>;
  onSelectTag: (tag: string | null) => void;
};

function TagSidebarSection({
  availableTags,
  baseTaskCount,
  selectedTag,
  tagCounts,
  onSelectTag,
}: TagSidebarSectionProps) {
  return (
    <section
      className="rounded-lg border bg-card p-4"
      aria-label="标签筛选"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tags className="size-4 text-primary" aria-hidden="true" />
        标签
      </div>
      {availableTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <TagFilterButton
            active={selectedTag === null}
            count={baseTaskCount}
            label="全部"
            onClick={() => onSelectTag(null)}
          />
          {availableTags.map((tag) => (
            <TagFilterButton
              key={tag}
              active={selectedTag === tag}
              count={tagCounts.get(tag) ?? 0}
              label={`#${tag}`}
              onClick={() => onSelectTag(tag)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          当前视图还没有标签。
        </p>
      )}
    </section>
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
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
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

type TagFilterButtonProps = {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
};

function TagFilterButton({
  active,
  count,
  label,
  onClick,
}: TagFilterButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span className="text-xs">{count}</span>
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
        className="flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:hover:border-border disabled:hover:text-muted-foreground"
        disabled={task.status === "done"}
        onClick={() => onComplete(task.id)}
        type="button"
      >
        {task.status === "done" ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Circle className="size-4" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "break-words text-sm font-medium leading-6",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        {task.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
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
          <RotateCcw className="size-4" aria-hidden="true" />
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
        <Trash2 className="size-4" aria-hidden="true" />
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
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Inbox className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-medium">{copy}</p>
      </div>
    </div>
  );
}

export default App;
