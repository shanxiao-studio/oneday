import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Flag,
  Inbox,
  ListChecks,
  Moon,
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

const viewCopy: Record<View, { title: string }> = {
  today: {
    title: "今日",
  },
  inbox: {
    title: "收件箱",
  },
  done: {
    title: "已完成",
  },
};

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "high", label: "高优先级" },
  { value: "medium", label: "中优先级" },
  { value: "low", label: "低优先级" },
];

const priorityBadgeClassNames: Record<TaskPriority, string> = {
  high:
    "border border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950",
  medium: "border border-zinc-300 bg-zinc-200/90 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100",
  low: "border border-border/80 bg-background/90 text-muted-foreground dark:bg-zinc-900/80",
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
  const [draftPriority, setDraftPriority] = useState<TaskPriority>("medium");
  const [timeDraft, setTimeDraft] = useState("");
  const [view, setView] = useState<View>("today");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, visibleTasks],
  );
  useEffect(() => {
    if (selectedTag && !availableTags.includes(selectedTag)) {
      setSelectedTag(null);
    }
  }, [availableTags, selectedTag]);

  useEffect(() => {
    if (selectedTaskId && !visibleTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, visibleTasks]);

  function addTodayTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedDraft = parseTaskDraft(draft);
    if (!parsedDraft.title) {
      return;
    }

    const newTask = createTaggedTask(draft, {
      priority: draftPriority,
      scheduledFor: todayKey,
      scheduledTime: timeDraft,
    });

    setTasks((current) => [newTask, ...current]);
    setDraft("");
    setDraftPriority("medium");
    setTimeDraft("");
    setSelectedTag(null);
    setSelectedTaskId(newTask.id);
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="planner-animate border-b border-border pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(2.8rem,8vw,5.5rem)] leading-[0.88] tracking-[-0.09em]">
                OneDay
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-[0.95rem]">
                只留今天真正要做的事
              </p>
            </div>
            <Button
              aria-label={theme === "dark" ? "切换到浅色主题" : "切换到暗色主题"}
              className="mt-1 border-border bg-card text-foreground hover:bg-accent"
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

        <section className="mt-4 flex-1 border border-border bg-border">
          <div className="grid h-full min-h-[calc(100vh-10rem)] gap-px bg-border lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
            <aside className="planner-animate planner-delay-1 bg-card p-4 sm:p-5">
              <nav aria-label="任务视图" className="space-y-1">
                <ViewButton
                  active={view === "today"}
                  count={todayTasks.length}
                  icon={<ListChecks className="size-4" aria-hidden="true" />}
                  label="今日"
                  note="正在推进"
                  onClick={() => setView("today")}
                />
                <ViewButton
                  active={view === "inbox"}
                  count={inboxTasks.length}
                  icon={<Inbox className="size-4" aria-hidden="true" />}
                  label="收件箱"
                  note="暂存待排"
                  onClick={() => setView("inbox")}
                />
                <ViewButton
                  active={view === "done"}
                  count={doneTasks.length}
                  icon={<Check className="size-4" aria-hidden="true" />}
                  label="已完成"
                  note="已经收尾"
                  onClick={() => setView("done")}
                />
              </nav>

              <TagSidebarSection
                availableTags={availableTags}
                baseTaskCount={baseTasks.length}
                selectedTag={selectedTag}
                tagCounts={tagCounts}
                onSelectTag={setSelectedTag}
              />
            </aside>

            <section className="planner-animate planner-delay-2 bg-card">
              <div className="border-b border-border px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      {selectedTag ? `标签 #${selectedTag}` : "当前视图"}
                    </p>
                    <h2 className="font-display mt-2 text-[2rem] leading-none tracking-[-0.06em] sm:text-[2.4rem]">
                      {viewCopy[view].title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{visibleTasks.length} 项</span>
                    <span>Today {todayKey}</span>
                  </div>
                </div>
              </div>

              <form className="border-b border-border px-4 py-4 sm:px-6" onSubmit={addTodayTask}>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="min-w-0 flex-1">
                    <label className="sr-only" htmlFor="new-task-title">
                      待办标题
                    </label>
                    <Input
                      id="new-task-title"
                      className="h-11 border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="添加今日待办，用 #标签 标记分类"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <PrioritySelect
                      ariaLabel="优先级"
                      className="h-11 w-full sm:w-36"
                      onChange={setDraftPriority}
                      value={draftPriority}
                    />
                    <div className="flex h-11 w-full items-center gap-2 border border-border px-3 sm:w-32">
                      <label className="sr-only" htmlFor="new-task-time">
                        当天时间
                      </label>
                      <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="new-task-time"
                        className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                        type="time"
                        value={timeDraft}
                        onChange={(event) => setTimeDraft(event.target.value)}
                      />
                    </div>
                    <Button
                      aria-label="添加今日待办"
                      className="h-11 bg-foreground px-4 text-background hover:bg-foreground/90"
                      type="submit"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      添加今日待办
                    </Button>
                  </div>
                </div>
              </form>

              {visibleTasks.length > 0 ? (
                <ul className="divide-y divide-border">
                  {visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      isSelected={selectedTaskId === task.id}
                      task={task}
                      onComplete={completeTask}
                      onChangePriority={updateTaskPriority}
                      onDelete={deleteTask}
                      onMoveToToday={moveToToday}
                      onOpenDetails={setSelectedTaskId}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState view={view} />
              )}
            </section>

            <TaskDetailPanel
              task={selectedTask}
              onClearSelection={() => setSelectedTaskId(null)}
              onComplete={completeTask}
              onDelete={deleteTask}
              onMoveToToday={moveToToday}
              onSave={saveTaskEdits}
            />
          </div>
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
    <section aria-label="标签筛选" className="mt-6 border-t border-border pt-6">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Tags className="size-4 text-foreground" aria-hidden="true" />
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
        "group flex w-full items-center justify-between border px-3 py-3 text-left transition-colors duration-200",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center border transition-colors",
            active
              ? "border-white/20 bg-white/10"
              : "border-border bg-background text-foreground group-hover:border-foreground/20",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span
            className={cn(
              "mt-1 block text-xs leading-5",
              active ? "text-background/70" : "text-muted-foreground",
            )}
          >
            {note}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "font-display text-2xl leading-none",
          active ? "text-background" : "text-foreground",
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
        "inline-flex h-9 items-center gap-2 border px-3 text-sm transition-colors duration-200",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
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
  isSelected: boolean;
  task: Task;
  onComplete: (taskId: string) => void;
  onChangePriority: (taskId: string, priority: TaskPriority) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onOpenDetails: (taskId: string) => void;
};

function formatTaskTitleDraft(task: Task): string {
  return [task.title, ...task.tags.map((tag) => `#${tag}`)].join(" ").trim();
}

function TaskRow({
  isSelected,
  task,
  onComplete,
  onChangePriority,
  onDelete,
  onMoveToToday,
  onOpenDetails,
}: TaskRowProps) {
  return (
    <li
      className={cn(
        "task-row-shell px-4 py-4 transition-colors sm:px-6",
        isSelected && "bg-foreground/[0.04]",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <button
          aria-label={`完成 ${task.title}`}
          className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground transition-colors duration-200 hover:border-foreground hover:text-foreground disabled:hover:border-border disabled:hover:text-muted-foreground"
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <button
                aria-label={`查看 ${task.title} 详情`}
                className="w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpenDetails(task.id)}
                type="button"
              >
                <p
                  className={cn(
                    "break-words text-[1.05rem] font-medium leading-tight tracking-[-0.03em] sm:text-[1.15rem]",
                    task.status === "done" && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </p>
                {task.details ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {task.details}
                  </p>
                ) : null}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-border bg-background px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <PrioritySelect
                ariaLabel={`设置 ${task.title} 的优先级`}
                className="w-full sm:w-36"
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
                  className="border-border bg-background"
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
                className="border border-transparent hover:border-border"
                onClick={() => onDelete(task.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
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
        "relative flex h-10 items-center border border-input bg-card",
        className,
      )}
    >
      <Flag
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <select
        aria-label={ariaLabel}
        className="h-full w-full appearance-none bg-transparent pl-9 pr-8 text-sm text-foreground outline-none"
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
        "border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
        priorityBadgeClassNames[priority],
      )}
    >
      {label}
    </span>
  );
}

type TaskDetailPanelProps = {
  task: Task | null;
  onClearSelection: () => void;
  onComplete: (taskId: string) => void;
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

function TaskDetailPanel({
  task,
  onClearSelection,
  onComplete,
  onDelete,
  onMoveToToday,
  onSave,
}: TaskDetailPanelProps) {
  const [titleDraft, setTitleDraft] = useState("");
  const [detailsDraft, setDetailsDraft] = useState("");
  const [priorityDraft, setPriorityDraft] = useState<TaskPriority>("medium");
  const [scheduledForDraft, setScheduledForDraft] = useState("");
  const [scheduledTimeDraft, setScheduledTimeDraft] = useState("");
  const parsedTitleDraft = parseTaskDraft(titleDraft);

  useEffect(() => {
    if (!task) {
      setTitleDraft("");
      setDetailsDraft("");
      setPriorityDraft("medium");
      setScheduledForDraft("");
      setScheduledTimeDraft("");
      return;
    }

    setTitleDraft(formatTaskTitleDraft(task));
    setDetailsDraft(task.details ?? "");
    setPriorityDraft(task.priority);
    setScheduledForDraft(task.scheduledFor);
    setScheduledTimeDraft(task.scheduledTime ?? "");
  }, [task]);

  function submitEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!task || !parsedTitleDraft.title) {
      return;
    }

    onSave(task.id, {
      title: titleDraft,
      details: detailsDraft,
      priority: priorityDraft,
      scheduledFor: scheduledForDraft,
      scheduledTime: scheduledTimeDraft,
    });
  }

  return (
    <aside
      aria-label="任务详情侧栏"
      className="planner-animate planner-delay-2 bg-card"
    >
      {task ? (
        <form className="flex h-full flex-col" onSubmit={submitEdits}>
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Detail
                </p>
                <label className="sr-only" htmlFor="detail-task-title">
                  编辑待办标题
                </label>
                <Input
                  id="detail-task-title"
                  className="font-display mt-3 h-auto border-x-0 border-t-0 border-b border-border bg-transparent px-0 py-0 text-[2rem] tracking-[-0.05em] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  placeholder="标题里直接写 #标签"
                />
              </div>
              <Button
                aria-label="收起详情"
                className="border border-transparent hover:border-border"
                onClick={onClearSelection}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={priorityDraft} />
              {parsedTitleDraft.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-border bg-background px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <section className="border-b border-border px-4 py-4 sm:px-5">
              <div className="grid gap-3">
                <PrioritySelect
                  ariaLabel="详情优先级"
                  className="w-full"
                  onChange={setPriorityDraft}
                  value={priorityDraft}
                />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="flex h-10 items-center gap-2 border border-border px-3">
                    <CalendarDays
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <label className="sr-only" htmlFor="detail-task-date">
                      归属日期
                    </label>
                    <Input
                      id="detail-task-date"
                      className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                      type="date"
                      value={scheduledForDraft}
                      onChange={(event) => setScheduledForDraft(event.target.value)}
                    />
                  </div>
                  <div className="flex h-10 items-center gap-2 border border-border px-3">
                    <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                    <label className="sr-only" htmlFor="detail-task-time">
                      当天时间
                    </label>
                    <Input
                      id="detail-task-time"
                      className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                      type="time"
                      value={scheduledTimeDraft}
                      onChange={(event) => setScheduledTimeDraft(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="border-b border-border px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                备注
              </p>
              <label className="sr-only" htmlFor="detail-task-details">
                待办详情
              </label>
              <Textarea
                id="detail-task-details"
                className="mt-3 min-h-28 border-border bg-card"
                value={detailsDraft}
                onChange={(event) => setDetailsDraft(event.target.value)}
                placeholder="补充备注、背景或验收标准（可选）"
              />
            </section>

            <section className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-1">
              <DetailMetric
                icon={<CalendarDays className="size-4" aria-hidden="true" />}
                label="归属日期"
                value={formatScheduledDate(scheduledForDraft)}
              />
              <DetailMetric
                icon={<Clock3 className="size-4" aria-hidden="true" />}
                label="当天时间"
                value={scheduledTimeDraft || "暂未安排"}
              />
              <DetailMetric
                icon={<ListChecks className="size-4" aria-hidden="true" />}
                label="状态"
                value={getTaskStatusLabel(task)}
              />
              <DetailMetric
                icon={<CalendarDays className="size-4" aria-hidden="true" />}
                label="创建于"
                value={formatTimestamp(task.createdAt)}
              />
            </section>

            <section className="px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                保存与操作
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="bg-foreground text-background hover:bg-foreground/90"
                  disabled={!parsedTitleDraft.title}
                  size="sm"
                  type="submit"
                >
                  <Save className="size-4" aria-hidden="true" />
                  保存修改
                </Button>
                {task.status !== "done" ? (
                  <Button
                    className="bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => onComplete(task.id)}
                    size="sm"
                    type="button"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    完成
                  </Button>
                ) : null}
                {task.status !== "today" ? (
                  <Button
                    className="border-border bg-background"
                    onClick={() => onMoveToToday(task.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    移到今天
                  </Button>
                ) : null}
                <Button
                  className="border-border bg-background"
                  onClick={() => onDelete(task.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  删除
                </Button>
              </div>
            </section>
          </div>
        </form>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center px-6 py-10 text-center">
          <div className="max-w-xs">
            <div className="mx-auto flex size-14 items-center justify-center border border-border bg-background text-foreground">
              <ListChecks className="size-5" aria-hidden="true" />
            </div>
            <h3 className="font-display mt-5 text-2xl tracking-[-0.04em]">
              选中一个 TODO
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">右侧会在这里展开编辑。</p>
          </div>
        </div>
      )}
    </aside>
  );
}

function DetailMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function getTaskStatusLabel(task: Task) {
  if (task.status === "done") {
    return task.completedAt ? `已完成 · ${formatTimestamp(task.completedAt)}` : "已完成";
  }

  return task.status === "today" ? "今日" : "收件箱";
}

function formatScheduledDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(date);
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
  }).format(date);
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
        <div className="mx-auto flex size-16 items-center justify-center border border-border bg-background text-foreground">
          <Inbox className="size-6" aria-hidden="true" />
        </div>
        <p className="font-display mt-5 text-2xl">{copy}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">先写下下一件事。</p>
      </div>
    </div>
  );
}

export default App;
