export const STORAGE_KEY = "oneday.tasks";

export type TaskStatus = "today" | "inbox" | "done";

export type Task = {
  id: string;
  title: string;
  details?: string;
  tags: string[];
  status: TaskStatus;
  scheduledFor: string;
  createdAt: string;
  completedAt?: string;
};

type StoredTask = Partial<Task>;
type ParsedTaskDraft = {
  title: string;
  tags: string[];
};

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
    details?: string;
    scheduledFor?: string;
    tags?: string[];
  } = {},
): Task {
  const { details, scheduledFor = getTodayKey(), tags = [] } = options;
  const parsedDraft = parseTaskDraft(title);
  const normalizedDetails = normalizeTaskDetails(details);

  return {
    id: createTaskId(),
    title: parsedDraft.title,
    details: normalizedDetails,
    tags: normalizeTags([...parsedDraft.tags, ...tags]),
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

export function parseTaskDraft(value: string): ParsedTaskDraft {
  const tags: string[] = [];
  let title = "";
  let index = 0;

  while (index < value.length) {
    if (value[index] === "#" && isTagStart(value, index)) {
      const tagEnd = findTagEnd(value, index + 1);
      const tag = value.slice(index + 1, tagEnd);

      if (normalizeTag(tag)) {
        tags.push(tag);
        index = tagEnd;
        continue;
      }
    }

    title += value[index];
    index += 1;
  }

  return {
    title: normalizeDraftTitle(title),
    tags: normalizeTags(tags),
  };
}

export function filterTasksByTag(tasks: Task[], tag: string | null): Task[] {
  if (!tag) {
    return tasks;
  }

  const lookupKey = getTagLookupKey(tag);

  return tasks.filter((task) =>
    task.tags.some((taskTag) => getTagLookupKey(taskTag) === lookupKey),
  );
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
    (task.details === undefined || typeof task.details === "string") &&
    isTaskStatus(task.status) &&
    typeof task.scheduledFor === "string" &&
    typeof task.createdAt === "string" &&
    (task.completedAt === undefined || typeof task.completedAt === "string") &&
    isTaskTags(task.tags)
  ) {
    return {
      id: task.id,
      title: task.title,
      details: normalizeTaskDetails(task.details),
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
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((tag) => typeof tag === "string"))
  );
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

function getTagLookupKey(value: string): string {
  return normalizeTag(value).toLocaleLowerCase();
}

function isTagStart(value: string, index: number): boolean {
  return index === 0 || isTagBoundary(value[index - 1]);
}

function findTagEnd(value: string, index: number): number {
  let cursor = index;

  while (cursor < value.length) {
    if (value[cursor] === "#" || isTagBoundary(value[cursor])) {
      break;
    }

    cursor += 1;
  }

  return cursor;
}

function isTagBoundary(value: string): boolean {
  return /[\s,，;；]/u.test(value);
}

function normalizeDraftTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,，;；])/gu, "$1")
    .replace(/[,，;；\s]+$/gu, "")
    .trim();
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, " ");
}

function normalizeTaskDetails(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.replace(/\r\n?/g, "\n").trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
