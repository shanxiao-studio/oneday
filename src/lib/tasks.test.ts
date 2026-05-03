import { describe, expect, it } from "vitest";
import {
  createTaggedTask,
  filterTasksByTag,
  getTaskTags,
  getTodayKey,
  parseTaskDraft,
  parseStoredTasks,
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

  it("keeps stored task details and normalizes line endings", () => {
    expect(
      parseStoredTasks(
        JSON.stringify([
          {
            ...task,
            details: "第一行\r\n第二行  ",
            scheduledTime: "09:30",
          },
        ]),
      ),
    ).toEqual([
      {
        ...task,
        details: "第一行\n第二行",
        scheduledTime: "09:30",
      },
    ]);
  });

  it("moves unfinished tasks from previous days to the inbox and clears stale time", () => {
    expect(rolloverTasks([task], "2026-04-30")).toEqual([
      {
        ...task,
        status: "inbox",
      },
    ]);

    expect(
      rolloverTasks([{ ...task, scheduledTime: "08:30" }], "2026-04-30"),
    ).toEqual([
      {
        ...task,
        status: "inbox",
      },
    ]);
  });

  it("sorts timed today tasks before untimed tasks", () => {
    const untimed = { ...task, id: "untimed" };
    const later = { ...task, id: "later", scheduledTime: "11:30" };
    const earlier = { ...task, id: "earlier", scheduledTime: "09:15" };

    expect(sortTasks([untimed, later, earlier]).map((item) => item.id)).toEqual([
      "earlier",
      "later",
      "untimed",
    ]);
  });

  it("keeps the newest untimed tasks first", () => {
    const older = { ...task, id: "older", createdAt: "2026-04-29T08:00:00.000Z" };
    const newer = { ...task, id: "newer", createdAt: "2026-04-30T08:00:00.000Z" };

    expect(sortTasks([older, newer]).map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("extracts inline tags from the task draft", () => {
    expect(parseTaskDraft("写周报 #Review，#工作 #review")).toEqual({
      title: "写周报",
      tags: ["Review", "工作"],
    });

    expect(parseTaskDraft("  #生活  ")).toEqual({
      title: "",
      tags: ["生活"],
    });
  });

  it("normalizes tags when creating tasks", () => {
    expect(
      createTaggedTask("Prepare notes #Review", {
        details: "\nContext line 1\r\nContext line 2\n",
        scheduledFor: "2026-04-29",
        scheduledTime: "14:05",
        tags: ["work", " Work ", "#review"],
      }),
    ).toMatchObject({
      details: "Context line 1\nContext line 2",
      title: "Prepare notes",
      tags: ["Review", "work"],
      scheduledFor: "2026-04-29",
      scheduledTime: "14:05",
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
