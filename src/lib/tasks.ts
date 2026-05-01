export const STORAGE_KEY = "oneday.tasks";

export type TaskStatus = "today" | "inbox" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  scheduledFor: string;
  createdAt: string;
  completedAt?: string;
  tags: string[];
};

type StoredTask = Partial<Task>;

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Extract tags (words starting with #) from a title string.
 * Returns the cleaned title and the extracted tag names.
 */
export function extractTagsFromTitle(raw: string): {
  cleanTitle: string;
  tags: string[];
} {
  const tags: string[] = [];
  const cleanTitle = raw
    .replace(/#([\u4e00-\u9fa5\w]+)/g, (_, tag) => {
      tags.push(tag);
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();

  // If everything was a tag, don't extract and keep original title
  if (!cleanTitle) {
    return { cleanTitle: raw.trim(), tags: [] };
  }

  return {
    cleanTitle,
    tags: [...new Set(tags)],
  };
}

export function createTask(
  title: string,
  scheduledFor = getTodayKey(),
  tags: string[] = [],
): Task {
  return {
    id: createTaskId(),
    title,
    status: "today",
    scheduledFor,
    tags,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Collect all unique tags across a set of tasks.
 */
export function collectTags(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const t of tasks) {
    for (const tag of t.tags) {
      set.add(tag);
    }
  }
  return [...set].sort();
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

    return parsed.filter(isTask);
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

function createTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isTask(value: unknown): value is Task {
  const task = value as StoredTask;

  return (
    isRecord(value) &&
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    isTaskStatus(task.status) &&
    typeof task.scheduledFor === "string" &&
    typeof task.createdAt === "string" &&
    (task.completedAt === undefined || typeof task.completedAt === "string") &&
    (task.tags === undefined ||
      (Array.isArray(task.tags) &&
        task.tags.every((t: unknown) => typeof t === "string")))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "today" || value === "inbox" || value === "done";
}
