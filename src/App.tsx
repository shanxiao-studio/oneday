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

const viewCopy: Record<View, { title: string; description: string }> = {
  today: {
    title: "今日",
    description: "排好今天的顺序。",
  },
  inbox: {
    title: "收件箱",
    description: "先收着，再决定。",
  },
  done: {
    title: "已完成",
    description: "回看已经完成的事。",
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

    setTasks((current) => [
      createTaggedTask(draft, {
        priority: draftPriority,
        scheduledFor: todayKey,
        scheduledTime: timeDraft,
      }),
      ...current,
    ]);
    setDraft("");
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(255,255,255,0.2)_34%,_transparent_64%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_22%,_transparent_78%,_rgba(255,255,255,0.5)),linear-gradient(90deg,_rgba(15,23,42,0.04)_1px,_transparent_1px),linear-gradient(180deg,_rgba(15,23,42,0.035)_1px,_transparent_1px)] bg-[size:auto,auto,32px_32px,32px_32px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/8 via-transparent to-transparent dark:from-white/8" />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="font-display text-2xl tracking-[-0.08em] sm:text-[1.75rem]">
              OneDay
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
              明日复明日，明日何其多。
            </p>
          </div>
          <Button
            aria-label={theme === "dark" ? "切换到浅色主题" : "切换到暗色主题"}
            className="border-border/80 bg-background/80"
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
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-4 pb-4 pt-20 sm:px-6 lg:px-8">
        <section className="grid flex-1 gap-4 py-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
            <section className="planner-panel planner-animate px-3 py-3">
              <nav aria-label="任务视图" className="flex flex-col gap-1">
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

            <section className="planner-panel planner-animate planner-delay-1 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                概览
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <MetricTile label="今日" value={todayTasks.length} />
                <MetricTile label="收件箱" value={inboxTasks.length} />
                <MetricTile label="已完成" value={doneTasks.length} />
              </dl>
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
            <div className="border-b border-border/70 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    <span className="border border-border/80 bg-background/75 px-2.5 py-1">
                      Today {todayKey}
                    </span>
                    <span className="border border-border/80 bg-background/75 px-2.5 py-1">
                      {viewCopy[view].title}
                    </span>
                  </div>
                  <h2 className="font-display mt-4 text-3xl tracking-[-0.06em] sm:text-[2.5rem]">
                    {viewCopy[view].title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selectedTag
                      ? `#${selectedTag} 相关任务`
                      : viewCopy[view].description}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start border border-border/80 bg-background/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="text-foreground">{visibleTasks.length}</span>
                  <span>Visible items</span>
                </div>
              </div>
            </div>

            <form className="border-b border-border/70 px-5 py-5 sm:px-6" onSubmit={addTodayTask}>
              <div className="border border-border/80 bg-background/78 p-4 shadow-[0_16px_48px_rgba(15,23,42,0.04)] backdrop-blur-md sm:p-5">
                <div>
                  <label className="sr-only" htmlFor="new-task-title">
                    待办标题
                  </label>
                  <Input
                    id="new-task-title"
                    className="h-12 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="添加今日待办，用 #标签 标记分类"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <PrioritySelect
                      ariaLabel="优先级"
                      className="h-10 min-w-[10rem] border-border/70 bg-card/75"
                      onChange={setDraftPriority}
                      value={draftPriority}
                    />
                    <div className="flex h-10 min-w-[9rem] items-center gap-2 border border-border/70 bg-card/75 px-3">
                      <label className="sr-only" htmlFor="new-task-time">
                        当天时间
                      </label>
                      <Clock3
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="new-task-time"
                        className="h-auto w-full border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                        type="time"
                        value={timeDraft}
                        onChange={(event) => setTimeDraft(event.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    aria-label="添加今日待办"
                    className="h-10 bg-foreground px-5 text-background hover:bg-foreground/90"
                    type="submit"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    添加今日待办
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                标题里写 #标签；时间和优先级收在下方，备注放到详情里再补。
              </p>
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
                    onDelete={deleteTask}
                    onMoveToToday={moveToToday}
                    onOpenDetails={setSelectedTaskId}
                    onSave={saveTaskEdits}
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

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/80 bg-background/80 px-3 py-3 text-left">
      <dt className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-semibold leading-none tracking-[-0.06em] text-foreground">
        {value}
      </dd>
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
      className="planner-panel planner-animate planner-delay-2 px-4 py-4"
    >
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
        "group flex w-full items-center justify-between px-4 py-3 text-left transition-all duration-200",
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
            "mt-0.5 flex size-9 shrink-0 items-center justify-center border transition-colors",
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
        "inline-flex h-10 items-center gap-2 border px-4 text-sm transition-all duration-200",
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
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onOpenDetails: (taskId: string) => void;
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

type TaskEditorDraft = {
  title: string;
  details: string;
  priority: TaskPriority;
  scheduledFor: string;
  scheduledTime: string;
};

function createTaskEditorDraft(task: Task): TaskEditorDraft {
  return {
    title: formatTaskTitleDraft(task),
    details: task.details ?? "",
    priority: task.priority,
    scheduledFor: task.scheduledFor,
    scheduledTime: task.scheduledTime ?? "",
  };
}

type TaskEditorFieldsProps = {
  details: string;
  detailsClassName?: string;
  detailsPlaceholder?: string;
  idPrefix: string;
  metaGridClassName?: string;
  onDetailsChange: (value: string) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onScheduledForChange: (value: string) => void;
  onScheduledTimeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  priority: TaskPriority;
  scheduledFor: string;
  scheduledTime: string;
  title: string;
  titleClassName?: string;
  titlePlaceholder?: string;
};

function TaskEditorFields({
  details,
  detailsClassName,
  detailsPlaceholder = "补充备注、背景或验收标准（可选）",
  idPrefix,
  metaGridClassName,
  onDetailsChange,
  onPriorityChange,
  onScheduledForChange,
  onScheduledTimeChange,
  onTitleChange,
  priority,
  scheduledFor,
  scheduledTime,
  title,
  titleClassName,
  titlePlaceholder = "标题里直接写 #标签",
}: TaskEditorFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="sr-only" htmlFor={`${idPrefix}-title`}>
          待办标题
        </label>
        <Input
          id={`${idPrefix}-title`}
          className={cn("border-border/70 bg-card/70", titleClassName)}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={titlePlaceholder}
        />
      </div>
      <div
        className={cn(
          "grid gap-3 xl:grid-cols-[11rem_9rem_minmax(0,1fr)]",
          metaGridClassName,
        )}
      >
        <PrioritySelect
          ariaLabel="优先级"
          className="border-border/70 bg-card/70"
          onChange={onPriorityChange}
          value={priority}
        />
        <div className="flex items-center gap-2 border border-border/70 bg-card/70 px-3">
          <label className="sr-only" htmlFor={`${idPrefix}-time`}>
            当天时间
          </label>
          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id={`${idPrefix}-time`}
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            type="time"
            value={scheduledTime}
            onChange={(event) => onScheduledTimeChange(event.target.value)}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`${idPrefix}-scheduled-for`}>
            归属日期
          </label>
          <Input
            id={`${idPrefix}-scheduled-for`}
            className="border-border/70 bg-card/70"
            type="date"
            value={scheduledFor}
            onChange={(event) => onScheduledForChange(event.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="sr-only" htmlFor={`${idPrefix}-details`}>
          待办详情
        </label>
        <Textarea
          id={`${idPrefix}-details`}
          className={cn("min-h-24 border-border/70 bg-card/70", detailsClassName)}
          value={details}
          onChange={(event) => onDetailsChange(event.target.value)}
          placeholder={detailsPlaceholder}
        />
      </div>
    </div>
  );
}

function TaskRow({
  isSelected,
  task,
  onComplete,
  onChangePriority,
  onDelete,
  onMoveToToday,
  onOpenDetails,
  onSave,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => createTaskEditorDraft(task).title);
  const [detailsDraft, setDetailsDraft] = useState(
    () => createTaskEditorDraft(task).details,
  );
  const [priorityDraft, setPriorityDraft] = useState(
    () => createTaskEditorDraft(task).priority,
  );
  const [scheduledForDraft, setScheduledForDraft] = useState(
    () => createTaskEditorDraft(task).scheduledFor,
  );
  const [scheduledTimeDraft, setScheduledTimeDraft] = useState(
    () => createTaskEditorDraft(task).scheduledTime,
  );
  const parsedTitleDraft = parseTaskDraft(titleDraft);

  function syncDraftsFromTask() {
    const nextDraft = createTaskEditorDraft(task);

    setTitleDraft(nextDraft.title);
    setDetailsDraft(nextDraft.details);
    setPriorityDraft(nextDraft.priority);
    setScheduledForDraft(nextDraft.scheduledFor);
    setScheduledTimeDraft(nextDraft.scheduledTime);
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
    <li
      className={cn(
        "task-row-shell px-5 py-5 transition-colors sm:px-7",
        isSelected && "bg-foreground/[0.03]",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <button
          aria-label={`完成 ${task.title}`}
          className="flex size-11 shrink-0 items-center justify-center border border-border/70 bg-background/80 text-muted-foreground transition-all duration-200 hover:border-foreground hover:text-foreground disabled:hover:border-border/70 disabled:hover:text-muted-foreground"
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
            <form
              className="border border-border/80 bg-background/70 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-5"
              onSubmit={submitEdits}
            >
              <TaskEditorFields
                details={detailsDraft}
                idPrefix={`task-${task.id}`}
                onDetailsChange={setDetailsDraft}
                onPriorityChange={setPriorityDraft}
                onScheduledForChange={setScheduledForDraft}
                onScheduledTimeChange={setScheduledTimeDraft}
                onTitleChange={setTitleDraft}
                priority={priorityDraft}
                scheduledFor={scheduledForDraft}
                scheduledTime={scheduledTimeDraft}
                title={titleDraft}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                #标签会跟随标题保存
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="bg-foreground text-background hover:bg-foreground/90"
                  disabled={!parsedTitleDraft.title}
                  size="sm"
                  type="submit"
                >
                  <Save className="size-4" aria-hidden="true" />
                  保存
                </Button>
                <Button
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
                  <button
                    aria-label={`查看 ${task.title} 详情`}
                    className="w-full p-1 text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpenDetails(task.id)}
                    type="button"
                  >
                    <p
                      className={cn(
                        "break-words text-[1.2rem] font-medium leading-tight tracking-[-0.04em] sm:text-[1.35rem]",
                        task.status === "done" && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    {task.details ? (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                        {task.details}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        查看时间、标签和备注详情
                      </p>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-border/70 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground"
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
                    className="w-full border-border/70 bg-card/70 sm:w-36"
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
                      className="border-border/80 bg-background/70"
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
                    onClick={startEditing}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    编辑
                  </Button>
                  <Button
                    aria-label={`删除 ${task.title}`}
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
        "relative flex h-10 items-center border border-input bg-card/80",
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
        "px-3 py-1 text-xs font-medium",
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

  function syncDraftsFromTask(nextTask: Task | null) {
    if (!nextTask) {
      setTitleDraft("");
      setDetailsDraft("");
      setPriorityDraft("medium");
      setScheduledForDraft("");
      setScheduledTimeDraft("");
      return;
    }

    const nextDraft = createTaskEditorDraft(nextTask);

    setTitleDraft(nextDraft.title);
    setDetailsDraft(nextDraft.details);
    setPriorityDraft(nextDraft.priority);
    setScheduledForDraft(nextDraft.scheduledFor);
    setScheduledTimeDraft(nextDraft.scheduledTime);
  }

  useEffect(() => {
    syncDraftsFromTask(task);
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
      className="planner-panel planner-animate planner-delay-2 overflow-hidden xl:sticky xl:top-20 xl:self-start"
    >
      {task ? (
        <form className="flex h-full flex-col" onSubmit={submitEdits}>
          <div className="border-b border-border/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Detail
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  点击任务后，可直接修改标题、标签、时间和备注。
                </p>
              </div>
              <Button
                aria-label="收起详情"
                onClick={onClearSelection}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-5 px-5 py-5">
            <section className="border border-border/70 bg-background/65 p-4">
              <TaskEditorFields
                details={detailsDraft}
                detailsClassName="min-h-32"
                idPrefix={`task-detail-${task.id}`}
                metaGridClassName="sm:grid-cols-2 xl:grid-cols-1"
                onDetailsChange={setDetailsDraft}
                onPriorityChange={setPriorityDraft}
                onScheduledForChange={setScheduledForDraft}
                onScheduledTimeChange={setScheduledTimeDraft}
                onTitleChange={setTitleDraft}
                priority={priorityDraft}
                scheduledFor={scheduledForDraft}
                scheduledTime={scheduledTimeDraft}
                title={titleDraft}
                titleClassName="h-auto border-0 bg-transparent px-0 text-3xl font-display tracking-[-0.05em] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
              />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={priorityDraft} />
                {parsedTitleDraft.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-border/70 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                标题里继续写 #标签，保存后会自动整理。
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
                保存修改
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="bg-foreground text-background hover:bg-foreground/90"
                  disabled={!parsedTitleDraft.title}
                  size="sm"
                  type="submit"
                >
                  <Save className="size-4" aria-hidden="true" />
                  保存
                </Button>
                <Button
                  onClick={() => syncDraftsFromTask(task)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  重置
                </Button>
              </div>
            </section>

            <section className="border border-border/70 bg-background/65 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                任务操作
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
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
                    className="border-border/80 bg-background/70"
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
              点击列表里的任务后，右侧会显示它的备注、时间、标签和当前状态。
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
