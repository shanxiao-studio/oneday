import { describe, expect, it } from "vitest";
import {
  getTodayKey,
  parseStoredTasks,
  rolloverTasks,
  sortTasks,
  type Task,
} from "./tasks";

const task: Task = {
  id: "task-1",
  title: "Write summary",
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
});
