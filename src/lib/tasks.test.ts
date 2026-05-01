import { describe, expect, it } from "vitest";
import {
  collectTags,
  createTask,
  extractTagsFromTitle,
  getTodayKey,
  parseStoredTasks,
  rolloverTasks,
  sortTasks,
  type Task,
} from "./tasks";

const baseTask: Task = {
  id: "task-1",
  title: "Write summary",
  status: "today",
  scheduledFor: "2026-04-29",
  createdAt: "2026-04-29T08:00:00.000Z",
  tags: [],
};

describe("tasks", () => {
  it("formats date keys in local calendar time", () => {
    expect(getTodayKey(new Date(2026, 3, 30))).toBe("2026-04-30");
  });

  it("ignores invalid stored task data", () => {
    expect(parseStoredTasks("not-json")).toEqual([]);
    expect(
      parseStoredTasks(
        JSON.stringify([{ ...baseTask }, { id: "bad" }]),
      ),
    ).toEqual([baseTask]);
  });

  it("moves unfinished tasks from previous days to the inbox", () => {
    expect(rolloverTasks([baseTask], "2026-04-30")).toEqual([
      {
        ...baseTask,
        status: "inbox",
      },
    ]);
  });

  it("keeps the newest tasks first", () => {
    const older = {
      ...baseTask,
      id: "older",
      createdAt: "2026-04-29T08:00:00.000Z",
    };
    const newer = {
      ...baseTask,
      id: "newer",
      createdAt: "2026-04-30T08:00:00.000Z",
    };

    expect(sortTasks([older, newer]).map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  describe("extractTagsFromTitle", () => {
    it("extracts nothing when there is no tag", () => {
      expect(extractTagsFromTitle("Buy milk")).toEqual({
        cleanTitle: "Buy milk",
        tags: [],
      });
    });

    it("extracts a single tag after the title", () => {
      expect(extractTagsFromTitle("Buy milk #groceries")).toEqual({
        cleanTitle: "Buy milk",
        tags: ["groceries"],
      });
    });

    it("extracts multiple tags", () => {
      expect(extractTagsFromTitle("写总结 #工作 #重要")).toEqual({
        cleanTitle: "写总结",
        tags: ["工作", "重要"],
      });
    });

    it("deduplicates repeated tags", () => {
      expect(extractTagsFromTitle("test #tag #tag")).toEqual({
        cleanTitle: "test",
        tags: ["tag"],
      });
    });

    it("preserves original title when only tags are given", () => {
      expect(extractTagsFromTitle("#tag")).toEqual({
        cleanTitle: "#tag",
        tags: [],
      });
    });

    it("handles tag in the middle", () => {
      expect(extractTagsFromTitle("Buy #groceries milk")).toEqual({
        cleanTitle: "Buy milk",
        tags: ["groceries"],
      });
    });
  });

  describe("createTask", () => {
    it("creates a task with empty tags by default", () => {
      const task = createTask("Hello", "2026-05-01");
      expect(task.tags).toEqual([]);
    });

    it("creates a task with provided tags", () => {
      const task = createTask("Hello", "2026-05-01", ["work", "urgent"]);
      expect(task.tags).toEqual(["work", "urgent"]);
    });

    it("preserves tags through serialization round-trip", () => {
      const task = createTask("Hello", "2026-05-01", ["work"]);
      const stored = JSON.stringify([task]);
      const loaded = parseStoredTasks(stored);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].tags).toEqual(["work"]);
    });
  });

  describe("collectTags", () => {
    it("returns empty array for no tasks", () => {
      expect(collectTags([])).toEqual([]);
    });

    it("collects unique tags across tasks", () => {
      const tasks = [
        { ...baseTask, tags: ["work"] },
        { ...baseTask, id: "t2", tags: ["personal", "work"] },
      ];
      expect(collectTags(tasks)).toEqual(["personal", "work"]);
    });
  });

  describe("backward compatibility", () => {
    it("accepts stored tasks without a tags field", () => {
      const raw = JSON.stringify([
        {
          id: "legacy",
          title: "Old task",
          status: "today",
          scheduledFor: "2026-04-29",
          createdAt: "2026-04-29T08:00:00.000Z",
        },
      ]);
      const tasks = parseStoredTasks(raw);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].tags).toBeUndefined();
    });
  });
});
