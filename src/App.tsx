import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Flag,
  Inbox,
  ListChecks,
  Moon,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Sun,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  type TaskPriority,
  type Task,
  updateTask as updateStoredTask,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

type View = "today" | "inbox" | "done";
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "oneday-theme";

const viewCopy: Record<View, { title: string; description: string }> = {
  today: {
    title: "今日",
    description: "把今天真正要推进的事情排成一条清晰的工作流。",
  },
  inbox: {
    title: "收件箱",
    description: "昨天留下来的事项先集中落位，再决定是否回到今天。",
  },
  done: {
    title: "已完成",
    description: "回看今天已经收尾的任务，确认节奏和产出。",
  },
};

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "high", label: "高优先级" },
  { value: "medium", label: "中优先级" },
  { value: "low", label: "低优先级" },
];

const priorityBadgeClassNames: Record<TaskPriority, string> = {
  high:
    "border border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20",
  medium:
    "border border-amber-900/10 bg-amber-950/[0.05] text-amber-950/80 dark:border-amber-200/10 dark:bg-amber-50/10 dark:text-amber-100",
  low:
    "border border-border/70 bg-background/80 text-muted-foreground dark:bg-background/30",
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
  const [detailDraft, setDetailDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<TaskPriority>("medium");
  const [timeDraft, setTimeDraft] = useState("");
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
  const totalTasks = tasks.length;
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((doneTasks.length / totalTasks) * 100);
  const nextFocusTask = todayTasks.find((task) => task.scheduledTime) ?? todayTasks[0];

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
        details: detailDraft,
        priority: draftPriority,
        scheduledFor: todayKey,
        scheduledTime: timeDraft,
      }),
      ...current,
    ]);
    setDraft("");
    setDetailDraft("");
    setDraftPriority("medium");
    setTimeDraft("");
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
              scheduledTime: undefined,
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

  function saveTaskEdits(
    taskId: string,
    updates: {
      title: string;
      details: string;
      priority: TaskPriority;
      scheduledFor: string;
      scheduledTime: string;
    },
  ) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? updateStoredTask(task, updates) : task,
      ),
    );
  }

  function updateTaskPriority(taskId: string, priority: TaskPriority) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, priority } : task)),
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_hsl(var(--secondary)/0.45),_transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="planner-panel planner-animate flex flex-col gap-6 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              oneday
            </p>
            <h1 className="font-display mt-3 text-4xl leading-none sm:text-5xl lg:text-[4.5rem]">
              今天只做今天的事
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              一个只服务于当日执行的任务工作台。今天、收件箱与已完成放在同一张桌面上，
              让你在切换之前先看清优先级和节奏。
            </p>
          </div>

          <div className="flex flex-col gap-3 self-start lg:min-w-[290px] lg:self-auto">
            <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/75 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Today
                  </p>
                  <p className="font-display text-lg">{todayKey}</p>
                </div>
              </div>
              <Button
                aria-label={theme === "dark" ? "切换到浅色主题" : "切换到暗色主题"}
                className="rounded-full"
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

            <div className="grid grid-cols-3 gap-3 text-sm">
              <MetricTile label="今日" value={todayTasks.length} />
              <MetricTile label="收件箱" value={inboxTasks.length} />
              <MetricTile label="已完成" value={doneTasks.length} />
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <section className="planner-panel planner-animate planner-delay-1 p-3">
              <nav aria-label="任务视图" className="space-y-1">
                <ViewButton
                  active={view === "today"}
                  count={todayTasks.length}
                  icon={<ListChecks className="size-4" aria-hidden="true" />}
                  label="今日"
                  note="聚焦正在推进的事"
                  onClick={() => setView("today")}
                />
                <ViewButton
                  active={view === "inbox"}
                  count={inboxTasks.length}
                  icon={<Inbox className="size-4" aria-hidden="true" />}
                  label="收件箱"
                  note="重排昨天留下的事"
                  onClick={() => setView("inbox")}
                />
                <ViewButton
                  active={view === "done"}
                  count={doneTasks.length}
                  icon={<Check className="size-4" aria-hidden="true" />}
                  label="已完成"
                  note="回看今天已经收尾的事"
                  onClick={() => setView("done")}
                />
              </nav>
            </section>

            <section className="planner-panel planner-animate planner-delay-2 overflow-hidden">
              <div className="border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Archive className="size-4 text-primary" aria-hidden="true" />
                  日终
                </div>
                <p className="font-display mt-3 text-4xl leading-none">
                  {todayTasks.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  今天还有 {todayTasks.length} 项待完成，当前总完成率 {completionRate}%。
                </p>
              </div>
              <div className="grid gap-3 px-5 py-4 text-sm text-muted-foreground">
                <div className="rounded-[1.25rem] bg-background/75 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em]">Next focus</p>
                  <p className="mt-2 font-medium text-foreground">
                    {nextFocusTask ? "今天已经有焦点任务" : "先把第一件事写下来"}
                  </p>
                  <p className="mt-1 text-xs">
                    {nextFocusTask
                      ? nextFocusTask.scheduledTime
                        ? `${nextFocusTask.scheduledTime} 开始`
                        : "还没有设定具体时间"
                      : "留白也没关系，先把任务记进来"}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-background/75 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em]">Scope</p>
                  <p className="mt-2 font-medium text-foreground">
                    当前总计 {totalTasks} 项任务
                  </p>
                  <p className="mt-1 text-xs">
                    只把真正要处理的事留在今天，其他都先放进收件箱。
                  </p>
                </div>
              </div>
            </section>

            <TagSidebarSection
              availableTags={availableTags}
              baseTaskCount={baseTasks.length}
              selectedTag={selectedTag}
              tagCounts={tagCounts}
              onSelectTag={setSelectedTag}
            />
          </aside>

          <section className="planner-panel planner-animate planner-delay-2 overflow-hidden">
            <div className="border-b border-border/60 px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                    Workspace
                  </p>
                  <h2 className="font-display mt-2 text-3xl sm:text-[2.4rem]">
                    {viewCopy[view].title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selectedTag
                      ? `当前按 #${selectedTag} 筛选，只保留与这组上下文相关的任务。`
                      : viewCopy[view].description}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{visibleTasks.length}</span>
                  <span>项可见任务</span>
                </div>
              </div>
            </div>

            <form className="border-b border-border/60 px-5 py-5 sm:px-7" onSubmit={addTodayTask}>
              <div className="rounded-[1.75rem] border border-border/70 bg-background/75 p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_9rem_auto]">
                  <div className="xl:col-span-1">
                    <label className="sr-only" htmlFor="new-task-title">
                      待办标题
                    </label>
                    <Input
                      id="new-task-title"
                      className="h-12 rounded-[1rem] border-0 bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="添加今日待办，用 #标签 标记分类"
                    />
                  </div>
                  <PrioritySelect
                    ariaLabel="优先级"
                    className="h-12 rounded-[1rem] border-border/70 bg-card/75"
                    onChange={setDraftPriority}
                    value={draftPriority}
                  />
                  <div className="flex h-12 items-center gap-2 rounded-[1rem] border border-border/70 bg-card/75 px-3">
                    <label className="sr-only" htmlFor="new-task-time">
                      当天时间
                    </label>
                    <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="new-task-time"
                      className="h-auto w-full border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                      type="time"
                      value={timeDraft}
                      onChange={(event) => setTimeDraft(event.target.value)}
                    />
                  </div>
                  <Button
                    aria-label="添加今日待办"
                    className="h-12 rounded-[1rem] px-5"
                    type="submit"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    添加今日待办
                  </Button>
                </div>

                <div className="mt-3">
                  <label className="sr-only" htmlFor="new-task-details">
                    待办详情
                  </label>
                  <Textarea
                    id="new-task-details"
                    className="min-h-24 rounded-[1rem] border-border/70 bg-card/65"
                    value={detailDraft}
                    onChange={(event) => setDetailDraft(event.target.value)}
                    placeholder="补充备注、背景或验收标准（可选）"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                直接在文本里写 #工作、#复盘 这样的标签即可，也可以补充详情、设定优先级和当天时间
              </p>
            </form>

            {visibleTasks.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {visibleTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onComplete={completeTask}
                    onChangePriority={updateTaskPriority}
                    onDelete={deleteTask}
                    onMoveToToday={moveToToday}
                    onSave={saveTaskEdits}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState view={view} />
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/75 px-4 py-3 text-center backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl leading-none">{value}</p>
    </div>
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
      aria-label="标签筛选"
      className="planner-panel planner-animate planner-delay-2 p-5"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
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
        <p className="mt-3 text-sm text-muted-foreground">当前视图还没有标签。</p>
      )}
    </section>
  );
}

type ViewButtonProps = {
  active: boolean;
  count: number;
  icon: ReactNode;
  label: string;
  note: string;
  onClick: () => void;
};

function ViewButton({
  active,
  count,
  icon,
  label,
  note,
  onClick,
}: ViewButtonProps) {
  return (
    <button
      className={cn(
        "group flex w-full items-center justify-between rounded-[1.25rem] px-4 py-3 text-left transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-[0_12px_34px_rgba(212,96,60,0.24)]"
          : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            active
              ? "border-primary-foreground/20 bg-primary-foreground/10"
              : "border-border/70 bg-background/70 text-primary group-hover:border-primary/30",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span
            className={cn(
              "mt-1 block text-xs leading-5",
              active ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {note}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "font-display text-2xl leading-none",
          active ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {count}
      </span>
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
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-all duration-200",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_26px_rgba(212,96,60,0.18)]"
          : "border-border/80 bg-background/70 text-muted-foreground hover:border-primary/35 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span className={cn("text-xs", active ? "text-primary-foreground/80" : "")}>
        {count}
      </span>
    </button>
  );
}

type TaskRowProps = {
  task: Task;
  onComplete: (taskId: string) => void;
  onChangePriority: (taskId: string, priority: TaskPriority) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onSave: (
    taskId: string,
    updates: {
      title: string;
      details: string;
      priority: TaskPriority;
      scheduledFor: string;
      scheduledTime: string;
    },
  ) => void;
};

function formatTaskTitleDraft(task: Task): string {
  return [task.title, ...task.tags.map((tag) => `#${tag}`)].join(" ").trim();
}

function TaskRow({
  task,
  onComplete,
  onChangePriority,
  onDelete,
  onMoveToToday,
  onSave,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => formatTaskTitleDraft(task));
  const [detailsDraft, setDetailsDraft] = useState(task.details ?? "");
  const [priorityDraft, setPriorityDraft] = useState(task.priority);
  const [scheduledForDraft, setScheduledForDraft] = useState(task.scheduledFor);
  const [scheduledTimeDraft, setScheduledTimeDraft] = useState(
    task.scheduledTime ?? "",
  );
  const parsedTitleDraft = parseTaskDraft(titleDraft);

  function syncDraftsFromTask() {
    setTitleDraft(formatTaskTitleDraft(task));
    setDetailsDraft(task.details ?? "");
    setPriorityDraft(task.priority);
    setScheduledForDraft(task.scheduledFor);
    setScheduledTimeDraft(task.scheduledTime ?? "");
  }

  useEffect(() => {
    if (isEditing) {
      return;
    }

    syncDraftsFromTask();
  }, [isEditing, task]);

  function startEditing() {
    syncDraftsFromTask();
    setIsEditing(true);
  }

  function cancelEditing() {
    syncDraftsFromTask();
    setIsEditing(false);
  }

  function submitEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!parsedTitleDraft.title) {
      return;
    }

    onSave(task.id, {
      title: titleDraft,
      details: detailsDraft,
      priority: priorityDraft,
      scheduledFor: scheduledForDraft,
      scheduledTime: scheduledTimeDraft,
    });
    setIsEditing(false);
  }

  return (
    <li className="task-row-shell px-5 py-5 sm:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <button
          aria-label={`完成 ${task.title}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/75 text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary disabled:hover:border-border/70 disabled:hover:text-muted-foreground"
          disabled={task.status === "done" || isEditing}
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
          {isEditing ? (
            <form className="rounded-[1.5rem] bg-background/70 p-4 sm:p-5" onSubmit={submitEdits}>
              <div className="space-y-3">
                <div>
                  <label className="sr-only" htmlFor={`task-title-${task.id}`}>
                    待办标题
                  </label>
                  <Input
                    id={`task-title-${task.id}`}
                    className="rounded-[1rem] border-border/70 bg-card/70"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    placeholder="标题里直接写 #标签"
                  />
                </div>
                <div className="grid gap-3 xl:grid-cols-[11rem_9rem_minmax(0,1fr)]">
                  <PrioritySelect
                    ariaLabel="优先级"
                    className="rounded-[1rem] border-border/70 bg-card/70"
                    onChange={setPriorityDraft}
                    value={priorityDraft}
                  />
                  <div className="flex items-center gap-2 rounded-[1rem] border border-border/70 bg-card/70 px-3">
                    <label className="sr-only" htmlFor={`task-time-${task.id}`}>
                      当天时间
                    </label>
                    <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id={`task-time-${task.id}`}
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      type="time"
                      value={scheduledTimeDraft}
                      onChange={(event) => setScheduledTimeDraft(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor={`task-scheduled-for-${task.id}`}>
                      归属日期
                    </label>
                    <Input
                      id={`task-scheduled-for-${task.id}`}
                      className="rounded-[1rem] border-border/70 bg-card/70"
                      type="date"
                      value={scheduledForDraft}
                      onChange={(event) => setScheduledForDraft(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="sr-only" htmlFor={`task-details-${task.id}`}>
                    待办详情
                  </label>
                  <Textarea
                    id={`task-details-${task.id}`}
                    className="min-h-24 rounded-[1rem] border-border/70 bg-card/70"
                    value={detailsDraft}
                    onChange={(event) => setDetailsDraft(event.target.value)}
                    placeholder="补充备注、背景或验收标准（可选）"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                标题中保留或修改 #标签 即可更新标签
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="rounded-full"
                  disabled={!parsedTitleDraft.title}
                  size="sm"
                  type="submit"
                >
                  <Save className="size-4" aria-hidden="true" />
                  保存
                </Button>
                <Button
                  className="rounded-full"
                  onClick={cancelEditing}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <X className="size-4" aria-hidden="true" />
                  取消
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-display break-words text-[1.35rem] leading-tight sm:text-[1.5rem]",
                      task.status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.details ? (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                      {task.details}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <PrioritySelect
                    ariaLabel={`设置 ${task.title} 的优先级`}
                    className="w-full rounded-full border-border/70 bg-card/70 sm:w-36"
                    onChange={(priority) => onChangePriority(task.id, priority)}
                    value={task.priority}
                  />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>归属日期 {task.scheduledFor}</span>
                    {task.scheduledTime ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        {task.scheduledTime}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {task.status !== "today" ? (
                    <Button
                      className="rounded-full"
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
                    aria-label={`编辑 ${task.title}`}
                    className="rounded-full"
                    onClick={startEditing}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <PencilLine className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={`删除 ${task.title}`}
                    className="rounded-full"
                    onClick={() => onDelete(task.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

type PrioritySelectProps = {
  ariaLabel: string;
  className?: string;
  onChange: (priority: TaskPriority) => void;
  value: TaskPriority;
};

function PrioritySelect({
  ariaLabel,
  className,
  onChange,
  value,
}: PrioritySelectProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 items-center rounded-full border border-input bg-card/80",
        className,
      )}
    >
      <Flag
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <select
        aria-label={ariaLabel}
        className="h-full w-full appearance-none rounded-full bg-transparent pl-9 pr-8 text-sm text-foreground outline-none"
        onChange={(event) => onChange(event.target.value as TaskPriority)}
        value={value}
      >
        {priorityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-xs text-muted-foreground">
        ▾
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const label = priorityOptions.find((option) => option.value === priority)?.label;

  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        priorityBadgeClassNames[priority],
      )}
    >
      {label}
    </span>
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
    <div className="flex min-h-[460px] items-center justify-center px-6 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border/70 bg-background/75 text-primary">
          <Inbox className="size-6" aria-hidden="true" />
        </div>
        <p className="font-display mt-5 text-2xl">{copy}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          当前视图里还没有内容。先把最重要的一件事写下来，再决定它属于今天、收件箱还是已完成。
        </p>
      </div>
    </div>
  );
}

export default App;
