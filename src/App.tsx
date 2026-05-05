import {
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
type RowEditField = "priority" | "time" | null;
type DetailEditField = "priority" | "time" | null;

const THEME_STORAGE_KEY = "oneday-theme";

const viewCopy: Record<View, { title: string; description: string }> = {
  today: {
    title: "今日",
    description: "只留下真正要做的事。",
  },
  inbox: {
    title: "收件箱",
    description: "先收着，再决定是不是今天做。",
  },
  done: {
    title: "已完成",
    description: "已经收尾的事都在这里。",
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
  medium:
    "border border-zinc-300 bg-zinc-200/90 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100",
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

  function updateTaskTime(taskId: string, scheduledTime: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, scheduledTime: scheduledTime || undefined }
          : task,
      ),
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(255,255,255,0.2)_34%,_transparent_64%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_22%,_transparent_78%,_rgba(255,255,255,0.5)),linear-gradient(90deg,_rgba(15,23,42,0.04)_1px,_transparent_1px),linear-gradient(180deg,_rgba(15,23,42,0.035)_1px,_transparent_1px)] bg-[size:auto,auto,32px_32px,32px_32px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/8 via-transparent to-transparent dark:from-white/8" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6">
        <header className="planner-panel planner-animate px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                OneDay
              </p>
              <h1 className="font-display mt-2 text-2xl leading-[0.96] tracking-[-0.06em] sm:text-3xl">
                明日复明日，明日何其多
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                只留下今天真正要做的事
              </p>
            </div>
            <Button
              aria-label={theme === "dark" ? "切换到浅色主题" : "切换到暗色主题"}
              className="shrink-0 rounded-none border-border/80 bg-background/80"
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

        <section className="grid flex-1 gap-4 py-4 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <section className="planner-panel planner-animate planner-delay-1 p-3">
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
            <div className="border-b border-border/70 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl tracking-[-0.05em] sm:text-[2rem]">
                    {viewCopy[view].title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedTag
                      ? `#${selectedTag} 相关任务`
                      : viewCopy[view].description}
                  </p>
                </div>
                <div className="flex items-center gap-3 border border-border/80 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  <span>{todayKey}</span>
                  <span className="text-foreground">{visibleTasks.length}</span>
                </div>
              </div>
            </div>

            <form className="border-b border-border/70 px-5 py-4 sm:px-6" onSubmit={addTodayTask}>
              <div className="border border-border/80 bg-background/75 p-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)] backdrop-blur-xl">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="sr-only" htmlFor="new-task-title">
                      待办标题
                    </label>
                    <Input
                      id="new-task-title"
                      className="h-11 border-0 border-b border-border/70 bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="添加今日待办，用 #标签 标记分类"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <PrioritySelect
                        ariaLabel="优先级"
                        className="h-8 w-auto min-w-[132px] border-border/70 bg-card/65"
                        compact
                        onChange={setDraftPriority}
                        value={draftPriority}
                      />
                      <div className="flex h-8 items-center gap-2 border border-border/70 bg-card/65 px-2.5">
                        <label className="sr-only" htmlFor="new-task-time">
                          当天时间
                        </label>
                        <Clock3
                          className="size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="new-task-time"
                          className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                          type="time"
                          value={timeDraft}
                          onChange={(event) => setTimeDraft(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    aria-label="添加今日待办"
                    className="h-11 shrink-0 rounded-none bg-foreground text-background hover:bg-foreground/90"
                    size="icon"
                    type="submit"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </form>

            {visibleTasks.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {visibleTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    isSelected={selectedTaskId === task.id}
                    task={task}
                    onComplete={completeTask}
                    onChangePriority={updateTaskPriority}
                    onChangeTime={updateTaskTime}
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
      aria-label="标签筛选"
      className="planner-panel planner-animate planner-delay-2 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Tags className="size-4 text-foreground" aria-hidden="true" />
        标签
      </div>
      {availableTags.length > 0 ? (
        <div className="mt-4 space-y-2">
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
        "group flex w-full items-center justify-between px-3 py-3 text-left transition-all duration-200",
        active
          ? "bg-foreground text-background shadow-[0_22px_50px_rgba(15,23,42,0.12)]"
          : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center border transition-colors",
            active
              ? "border-white/15 bg-white/10"
              : "border-border/70 bg-background/70 text-foreground group-hover:border-foreground/20",
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
        "flex w-full items-center justify-between border px-3 py-2.5 text-left text-sm transition-all duration-200",
        active
          ? "border-foreground bg-foreground text-background shadow-[0_10px_26px_rgba(15,23,42,0.12)]"
          : "border-border/80 bg-background/70 text-muted-foreground hover:border-foreground/25 hover:text-foreground",
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
  onChangeTime: (taskId: string, scheduledTime: string) => void;
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
  onChangeTime,
  onMoveToToday,
  onOpenDetails,
}: TaskRowProps) {
  const [editField, setEditField] = useState<RowEditField>(null);

  useEffect(() => {
    setEditField(null);
  }, [task.id, task.priority, task.scheduledTime]);

  return (
    <li
      className={cn(
        "task-row-shell px-5 py-4 transition-colors sm:px-6",
        isSelected && "bg-foreground/[0.03]",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={`完成 ${task.title}`}
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center border border-border/70 bg-background/80 text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground disabled:hover:border-border/70 disabled:hover:text-muted-foreground"
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <button
                  aria-label={`查看 ${task.title} 详情`}
                  className="min-w-0 flex-1 p-0.5 text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenDetails(task.id)}
                  type="button"
                >
                  <p
                    className={cn(
                      "break-words text-[1.05rem] font-medium leading-tight tracking-[-0.04em] sm:text-[1.15rem]",
                      task.status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.details ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">
                      {task.details}
                    </p>
                  ) : null}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-border/70 bg-background/75 px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:w-[220px] lg:flex-col lg:items-end">
              {editField === "priority" ? (
                <PrioritySelect
                  ariaLabel={`设置 ${task.title} 的优先级`}
                  className="w-full border-border/70 bg-card/70 lg:w-[180px]"
                  onChange={(priority) => {
                    onChangePriority(task.id, priority);
                    setEditField(null);
                  }}
                  value={task.priority}
                />
              ) : (
                <MetaPillButton
                  ariaLabel={`编辑 ${task.title} 的优先级`}
                  icon={<Flag className="size-3.5" aria-hidden="true" />}
                  onClick={() => setEditField("priority")}
                >
                  {getPriorityLabel(task.priority)}
                </MetaPillButton>
              )}

              {editField === "time" ? (
                <div className="flex h-10 w-full items-center gap-2 border border-border/70 bg-card/70 px-3 lg:w-[180px]">
                  <Clock3 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <label className="sr-only" htmlFor={`task-time-${task.id}`}>
                    设置 {task.title} 的时间
                  </label>
                  <Input
                    autoFocus
                    id={`task-time-${task.id}`}
                    className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                    onBlur={() => setEditField(null)}
                    onChange={(event) => onChangeTime(task.id, event.target.value)}
                    type="time"
                    value={task.scheduledTime ?? ""}
                  />
                </div>
              ) : (
                <MetaPillButton
                  ariaLabel={`编辑 ${task.title} 的时间`}
                  icon={<Clock3 className="size-3.5" aria-hidden="true" />}
                  onClick={() => setEditField("time")}
                >
                  {task.scheduledTime || "未安排"}
                </MetaPillButton>
              )}

              {task.status !== "today" ? (
                <Button
                  aria-label={`将 ${task.title} 移到今天`}
                  className="rounded-none border-border/80 bg-background/70"
                  onClick={() => onMoveToToday(task.id)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function MetaPillButton({
  ariaLabel,
  children,
  icon,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex h-9 items-center gap-2 border border-border/70 bg-background/80 px-3 text-sm text-foreground transition-colors hover:border-foreground/25 hover:bg-background lg:min-w-[140px] lg:justify-between"
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span>{children}</span>
      </span>
    </button>
  );
}

type PrioritySelectProps = {
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  onChange: (priority: TaskPriority) => void;
  value: TaskPriority;
};

function PrioritySelect({
  ariaLabel,
  className,
  compact = false,
  onChange,
  value,
}: PrioritySelectProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 items-center border border-input bg-card/80",
        className,
      )}
    >
      <Flag
        className={cn(
          "pointer-events-none absolute left-3 text-muted-foreground",
          compact ? "size-3.5" : "size-4",
        )}
        aria-hidden="true"
      />
      <select
        aria-label={ariaLabel}
        className={cn(
          "h-full w-full appearance-none bg-transparent text-foreground outline-none",
          compact ? "pl-8 pr-7 text-xs" : "pl-9 pr-8 text-sm",
        )}
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
  return (
    <span
      className={cn(
        "px-3 py-1 text-xs font-medium",
        priorityBadgeClassNames[priority],
      )}
    >
      {getPriorityLabel(priority)}
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
  const [editField, setEditField] = useState<DetailEditField>(null);
  const parsedTitleDraft = parseTaskDraft(titleDraft);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task) {
      setTitleDraft("");
      setDetailsDraft("");
      setPriorityDraft("medium");
      setScheduledForDraft("");
      setScheduledTimeDraft("");
      setEditField(null);
      return;
    }

    setTitleDraft(formatTaskTitleDraft(task));
    setDetailsDraft(task.details ?? "");
    setPriorityDraft(task.priority);
    setScheduledForDraft(task.scheduledFor);
    setScheduledTimeDraft(task.scheduledTime ?? "");
    setEditField(null);
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
      className="planner-panel planner-animate planner-delay-2 overflow-hidden xl:sticky xl:top-4 xl:self-start"
    >
      {task ? (
        <form className="flex h-full flex-col" onSubmit={submitEdits}>
          <div className="border-b border-border/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor="detail-task-title">
                  编辑待办标题
                </label>
                <Input
                  id="detail-task-title"
                  ref={titleInputRef}
                  className="font-display h-auto border-0 border-b border-border/70 bg-transparent px-0 py-0 text-3xl tracking-[-0.05em] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  placeholder="标题里直接写 #标签"
                />
              </div>
              <Button
                aria-label="收起详情"
                className="rounded-none"
                onClick={onClearSelection}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {editField === "priority" ? (
                <PrioritySelect
                  ariaLabel="详情优先级"
                  className="w-full border-border/70 bg-card/70 sm:w-40"
                  onChange={(priority) => {
                    setPriorityDraft(priority);
                    setEditField(null);
                  }}
                  value={priorityDraft}
                />
              ) : (
                <button
                  aria-label="编辑优先级"
                  className="border border-border/70 bg-background/75 px-1 py-1"
                  onClick={() => setEditField("priority")}
                  type="button"
                >
                  <PriorityBadge priority={priorityDraft} />
                </button>
              )}

              {editField === "time" ? (
                <div className="flex h-10 items-center gap-2 border border-border/70 bg-card/70 px-3 sm:w-36">
                  <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                  <label className="sr-only" htmlFor="detail-task-time">
                    详情时间
                  </label>
                  <Input
                    autoFocus
                    id="detail-task-time"
                    className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                    onBlur={() => setEditField(null)}
                    onChange={(event) => setScheduledTimeDraft(event.target.value)}
                    type="time"
                    value={scheduledTimeDraft}
                  />
                </div>
              ) : (
                <MetaPillButton
                  ariaLabel="编辑时间"
                  icon={<Clock3 className="size-3.5" aria-hidden="true" />}
                  onClick={() => setEditField("time")}
                >
                  {scheduledTimeDraft || "未安排"}
                </MetaPillButton>
              )}

              <button
                aria-label="编辑标签"
                className="inline-flex min-h-10 items-center gap-2 border border-border/70 bg-background/75 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                onClick={() => titleInputRef.current?.focus()}
                type="button"
              >
                <Tags className="size-3.5" aria-hidden="true" />
                <span className="flex flex-wrap items-center gap-1.5">
                  {parsedTitleDraft.tags.length > 0 ? (
                    parsedTitleDraft.tags.map((tag) => (
                      <span key={tag} className="font-medium text-foreground">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span>添加标签</span>
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-5 px-5 py-5">
            <section className="border border-border/70 bg-background/65 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                详情
              </p>
              <label className="sr-only" htmlFor="detail-task-details">
                待办详情
              </label>
              <Textarea
                id="detail-task-details"
                className="mt-3 min-h-28 border-border/70 bg-card/70"
                value={detailsDraft}
                onChange={(event) => setDetailsDraft(event.target.value)}
                placeholder="补充背景、拆解步骤或验收标准（可选）"
              />
            </section>

            <section className="border border-border/70 bg-background/65 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                归属日期
              </p>
              <div className="mt-3 flex h-10 items-center gap-2 border border-border/70 bg-card/70 px-3">
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
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

            <section className="border border-border/70 bg-background/65 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                保存与操作
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="rounded-none bg-foreground text-background hover:bg-foreground/90"
                  disabled={!parsedTitleDraft.title}
                  size="sm"
                  type="submit"
                >
                  <Save className="size-4" aria-hidden="true" />
                  保存修改
                </Button>
                {task.status !== "done" ? (
                  <Button
                    className="rounded-none bg-foreground text-background hover:bg-foreground/90"
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
                    className="rounded-none border-border/80 bg-background/70"
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
                  aria-label={`删除 ${task.title}`}
                  className="rounded-none"
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
            <div className="mx-auto flex size-14 items-center justify-center border border-border/70 bg-background/75 text-foreground">
              <ListChecks className="size-5" aria-hidden="true" />
            </div>
            <h3 className="font-display mt-5 text-2xl tracking-[-0.04em]">
              选中一个 TODO
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              点击列表里的任务后，右侧会显示它的详情、时间、标签和当前状态。
            </p>
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
    <div className="border border-border/70 bg-background/65 p-4">
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

function getPriorityLabel(priority: TaskPriority) {
  return priorityOptions.find((option) => option.value === priority)?.label ?? "中优先级";
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
        <div className="mx-auto flex size-16 items-center justify-center border border-border/70 bg-background/75 text-foreground">
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
