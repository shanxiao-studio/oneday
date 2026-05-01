export const STORAGE_KEY = "oneday.tasks";

export type TaskStatus = "today" | "inbox" | "done";

export type Task = {
  id: string;
  title: string;
  tags: string[];
  status: TaskStatus;
  scheduledFor: string;
  createdAt: string;
  completedAt?: string;
};

type StoredTask = Partial<Task>;

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createTask(title: string, scheduledFor = getTodayKey()): Task {
  return createTaggedTask(title, { scheduledFor });
}

export function createTaggedTask(
  title: string,
  options: {
    scheduledFor?: string;
    tags?: string[];
  } = {},
): Task {
  const { scheduledFor = getTodayKey(), tags = [] } = options;

  return {
    id: createTaskId(),
    title,
    tags: normalizeTags(tags),
    status: "today",
    scheduledFor,
    createdAt: new Date().toISOString(),
  };
}

export function parseStoredTasks(value: string | null): Task[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((task) => {
      const normalizedTask = parseStoredTask(task);

      return normalizedTask ? [normalizedTask] : [];
    });
  } catch {
    return [];
  }
}

export function rolloverTasks(tasks: Task[], todayKey = getTodayKey()): Task[] {
  return tasks.map((task) => {
    if (task.status !== "today" || task.scheduledFor === todayKey) {
      return task;
    }

    return {
      ...task,
      status: "inbox",
      completedAt: undefined,
    };
  });
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((first, second) => {
    const firstTime = Date.parse(first.completedAt ?? first.createdAt);
    const secondTime = Date.parse(second.completedAt ?? second.createdAt);

    return secondTime - firstTime;
  });
}

export function parseTagInput(value: string): string[] {
  return normalizeTags(value.split(/[,\n，]/));
}

export function filterTasksByTag(tasks: Task[], tag: string | null): Task[] {
  if (!tag) {
    return tasks;
  }

  return tasks.filter((task) => task.tags.includes(tag));
}

export function getTaskTags(tasks: Task[]): string[] {
  return normalizeTags(tasks.flatMap((task) => task.tags)).sort((first, second) =>
    first.localeCompare(second, "zh-Hans-CN"),
  );
}

function createTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseStoredTask(value: unknown): Task | null {
  const task = value as StoredTask;

  if (
    isRecord(value) &&
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    isTaskStatus(task.status) &&
    typeof task.scheduledFor === "string" &&
    typeof task.createdAt === "string" &&
    (task.completedAt === undefined || typeof task.completedAt === "string") &&
    isTaskTags(task.tags)
  ) {
    return {
      id: task.id,
      title: task.title,
      tags: normalizeTags(task.tags ?? []),
      status: task.status,
      scheduledFor: task.scheduledFor,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "today" || value === "inbox" || value === "done";
}

function isTaskTags(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((tag) => typeof tag === "string"));
}

function normalizeTags(tags: readonly string[]): string[] {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of tags) {
    const normalizedTag = normalizeTag(rawTag);

    if (!normalizedTag) {
      continue;
    }

    const lookupKey = normalizedTag.toLocaleLowerCase();

    if (seen.has(lookupKey)) {
      continue;
    }

    seen.add(lookupKey);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, " ");
}
