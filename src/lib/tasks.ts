export const STORAGE_KEY = "oneday.tasks";

export type TaskStatus = "today" | "inbox" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  scheduledFor: string;
  createdAt: string;
  completedAt?: string;
};

const taskStatuses = new Set<TaskStatus>(["today", "inbox", "done"]);

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createTask(title: string, todayKey = getTodayKey()): Task {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title,
    status: "today",
    scheduledFor: todayKey,
    createdAt: now,
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
    };
  });
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const leftTime = Date.parse(left.completedAt ?? left.createdAt);
    const rightTime = Date.parse(right.completedAt ?? right.createdAt);

    return rightTime - leftTime;
  });
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    taskStatuses.has(value.status as TaskStatus) &&
    typeof value.scheduledFor === "string" &&
    typeof value.createdAt === "string" &&
    (value.completedAt === undefined || typeof value.completedAt === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
