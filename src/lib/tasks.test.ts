import { describe, expect, it, vi } from "vitest";
import {
  createTask,
  getTodayKey,
  parseStoredTasks,
  rolloverTasks,
  sortTasks,
  type Task,
} from "./tasks";

const baseTask: Task = {
  id: "task-1",
  title: "Write notes",
  status: "today",
  scheduledFor: "2026-04-29",
  createdAt: "2026-04-29T08:00:00.000Z",
};

describe("tasks", () => {
  it("formats local dates as yyyy-mm-dd", () => {
    expect(getTodayKey(new Date(2026, 3, 5))).toBe("2026-04-05");
  });

  it("creates a task for today", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000000",
    );

    expect(createTask("Read brief", "2026-04-30")).toMatchObject({
      id: "00000000-0000-4000-8000-000000000000",
      title: "Read brief",
      status: "today",
      scheduledFor: "2026-04-30",
    });
  });

  it("ignores invalid stored data", () => {
    expect(parseStoredTasks(null)).toEqual([]);
    expect(parseStoredTasks("{bad json")).toEqual([]);
    expect(parseStoredTasks(JSON.stringify([{ id: "missing-fields" }]))).toEqual(
      [],
    );
  });

  it("keeps only valid stored tasks", () => {
    expect(
      parseStoredTasks(JSON.stringify([baseTask, { ...baseTask, status: "bad" }])),
    ).toEqual([baseTask]);
  });

  it("moves unfinished previous-day tasks to the inbox", () => {
    const doneTask: Task = {
      ...baseTask,
      id: "done-task",
      status: "done",
      completedAt: "2026-04-29T09:00:00.000Z",
    };
    const currentTask: Task = {
      ...baseTask,
      id: "current-task",
      scheduledFor: "2026-04-30",
    };

    expect(rolloverTasks([baseTask, doneTask, currentTask], "2026-04-30")).toEqual([
      { ...baseTask, status: "inbox" },
      doneTask,
      currentTask,
    ]);
  });

  it("sorts newest activity first without mutating input", () => {
    const older: Task = {
      ...baseTask,
      id: "older",
      createdAt: "2026-04-29T08:00:00.000Z",
    };
    const newer: Task = {
      ...baseTask,
      id: "newer",
      createdAt: "2026-04-30T08:00:00.000Z",
    };
    const tasks = [older, newer];

    expect(sortTasks(tasks).map((task) => task.id)).toEqual(["newer", "older"]);
    expect(tasks).toEqual([older, newer]);
  });
});
