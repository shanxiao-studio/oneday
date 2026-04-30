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

type StoredTask = Partial<Task>;

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createTask(title: string, scheduledFor = getTodayKey()): Task {
  return {
    id: createTaskId(),
    title,
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
    (task.completedAt === undefined || typeof task.completedAt === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "today" || value === "inbox" || value === "done";
}
