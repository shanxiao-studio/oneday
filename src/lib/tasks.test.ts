import { describe, expect, it } from "vitest";
import {
  createTaggedTask,
  filterTasksByTag,
  getTaskTags,
  getTodayKey,
  parseStoredTasks,
  parseTagInput,
  rolloverTasks,
  sortTasks,
  type Task,
} from "./tasks";

const task: Task = {
  id: "task-1",
  title: "Write summary",
  tags: ["work"],
  status: "today",
  scheduledFor: "2026-04-29",
  createdAt: "2026-04-29T08:00:00.000Z",
};

describe("tasks", () => {
  it("formats date keys in local calendar time", () => {
    expect(getTodayKey(new Date(2026, 3, 30))).toBe("2026-04-30");
  });

  it("ignores invalid stored task data", () => {
    expect(parseStoredTasks("not-json")).toEqual([]);
    expect(parseStoredTasks(JSON.stringify([{ ...task }, { id: "bad" }]))).toEqual([
      task,
    ]);
  });

  it("keeps older stored tasks that do not have tags yet", () => {
    expect(
      parseStoredTasks(
        JSON.stringify([
          {
            id: "legacy-task",
            title: "Legacy item",
            status: "today",
            scheduledFor: "2026-04-29",
            createdAt: "2026-04-29T08:00:00.000Z",
          },
        ]),
      ),
    ).toEqual([
      {
        id: "legacy-task",
        title: "Legacy item",
        tags: [],
        status: "today",
        scheduledFor: "2026-04-29",
        createdAt: "2026-04-29T08:00:00.000Z",
      },
    ]);
  });

  it("moves unfinished tasks from previous days to the inbox", () => {
    expect(rolloverTasks([task], "2026-04-30")).toEqual([
      {
        ...task,
        status: "inbox",
      },
    ]);
  });

  it("keeps the newest tasks first", () => {
    const older = { ...task, id: "older", createdAt: "2026-04-29T08:00:00.000Z" };
    const newer = { ...task, id: "newer", createdAt: "2026-04-30T08:00:00.000Z" };

    expect(sortTasks([older, newer]).map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("normalizes tags when creating and parsing tasks", () => {
    expect(parseTagInput(" work, 生活，#Review, work ")).toEqual([
      "work",
      "生活",
      "Review",
    ]);

    expect(
      createTaggedTask("Prepare notes", {
        scheduledFor: "2026-04-29",
        tags: ["work", " Work ", "#review"],
      }),
    ).toMatchObject({
      title: "Prepare notes",
      scheduledFor: "2026-04-29",
      tags: ["work", "review"],
    });
  });

  it("collects and filters tags for task views", () => {
    const taggedTasks: Task[] = [
      task,
      { ...task, id: "task-2", title: "Buy groceries", tags: ["home"] },
      { ...task, id: "task-3", title: "Review notes", tags: ["work", "review"] },
      { ...task, id: "task-4", title: "Review PR", tags: ["Review"] },
    ];

    expect(getTaskTags(taggedTasks)).toEqual(["home", "review", "work"]);
    expect(filterTasksByTag(taggedTasks, "work").map((item) => item.id)).toEqual([
      "task-1",
      "task-3",
    ]);
    expect(filterTasksByTag(taggedTasks, "review").map((item) => item.id)).toEqual([
      "task-3",
      "task-4",
    ]);
  });
});
