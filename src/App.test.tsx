import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { STORAGE_KEY, getTodayKey, type Task } from "./lib/tasks";

describe("App", () => {
  beforeEach(() => {
    const store = new Map<string, string>();

    vi.stubGlobal("localStorage", {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    } satisfies Storage);

    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove("dark");
  });

  it("adds tagged tasks and filters the current view by tag", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.queryByLabelText("标签")).toBeNull();

    await user.type(screen.getByLabelText("待办标题"), "写周报 #Review");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    await user.type(screen.getByLabelText("待办标题"), "买菜 #生活");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    await user.type(screen.getByLabelText("待办标题"), "过 PR #review");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    const tagRegion = screen.getByRole("region", { name: "标签筛选" });
    expect(tagRegion).toBeTruthy();
    expect(screen.queryByText("写周报")).toBeTruthy();
    expect(screen.queryByText("买菜")).toBeTruthy();
    expect(screen.queryByText("过 PR")).toBeTruthy();

    await user.click(within(tagRegion).getByRole("button", { name: /#review/i }));

    expect(screen.queryByText("写周报")).toBeTruthy();
    expect(screen.queryByText("过 PR")).toBeTruthy();
    expect(screen.queryByText("买菜")).toBeNull();

    await user.click(within(tagRegion).getByRole("button", { name: /全部/ }));

    expect(screen.queryByText("买菜")).toBeTruthy();
  });

  it("adds a task with compact metadata controls and opens it in the detail panel", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.queryByLabelText("待办详情")).toBeNull();

    await user.type(screen.getByLabelText("待办标题"), "准备发布说明 #发布");
    await user.type(screen.getByLabelText("当天时间"), "14:30");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    const addedTask = screen.getByText("准备发布说明").closest("li");
    expect(addedTask).toBeTruthy();
    expect(within(addedTask!).getByText("14:30")).toBeTruthy();

    const detailPanel = screen.getByLabelText("任务详情侧栏");
    expect(within(detailPanel).getByDisplayValue("准备发布说明 #发布")).toBeTruthy();
    expect(within(detailPanel).getAllByText("14:30").length).toBeGreaterThan(0);
    expect(within(detailPanel).getByLabelText("待办详情")).toBeTruthy();
  });

  it("moves inbox tasks back to today from the task row", async () => {
    const user = userEvent.setup();
    const todayKey = getTodayKey();
    const yesterday = "2026-05-04";
    const storedTask: Task = {
      id: "inbox-task",
      title: "补昨天的记录",
      details: "留到今天处理",
      tags: ["复盘"],
      priority: "medium",
      status: "today",
      scheduledFor: yesterday,
      scheduledTime: "09:30",
      createdAt: `${todayKey}T08:00:00.000Z`,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([storedTask]));

    render(<App />);

    await user.click(screen.getByRole("button", { name: /收件箱/ }));
    expect(screen.getByText("补昨天的记录")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "今天做" }));

    expect(screen.getByRole("heading", { name: "今日" })).toBeTruthy();
    expect(screen.getByText("补昨天的记录")).toBeTruthy();
  });

  it("supports setting and updating task priority from the task row", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("待办标题"), "高优先级任务");
    await user.selectOptions(screen.getByLabelText("优先级"), "high");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    await user.type(screen.getByLabelText("待办标题"), "低优先级任务");
    await user.selectOptions(screen.getByLabelText("优先级"), "low");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    const taskItems = screen.getAllByRole("listitem");
    expect(taskItems[0].textContent).toContain("高优先级任务");
    expect(taskItems[1].textContent).toContain("低优先级任务");

    await user.click(screen.getByRole("button", { name: "编辑 低优先级任务 的优先级" }));

    const lowPrioritySelect = screen.getByLabelText("设置 低优先级任务 的优先级");
    await user.selectOptions(lowPrioritySelect, "medium");

    expect(lowPrioritySelect).toHaveProperty("value", "medium");
    expect(screen.getAllByText("中优先级").length).toBeGreaterThan(0);
  });

  it("edits task fields directly from the detail panel", async () => {
    const user = userEvent.setup();
    const initialScheduledFor = getTodayKey();
    const updatedScheduledFor = "2026-05-04";

    render(<App />);

    await user.type(screen.getByLabelText("待办标题"), "写周报 #工作");
    await user.selectOptions(screen.getByLabelText("优先级"), "low");
    await user.type(screen.getByLabelText("当天时间"), "09:30");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    await user.click(screen.getByRole("button", { name: "查看 写周报 详情" }));

    const detailPanel = screen.getByLabelText("任务详情侧栏");
    const titleInput = within(detailPanel).getByDisplayValue("写周报 #工作");
    await user.clear(titleInput);
    await user.type(titleInput, "更新周报 #复盘");

    await user.click(within(detailPanel).getByRole("button", { name: "编辑优先级" }));
    await user.selectOptions(within(detailPanel).getByLabelText("详情优先级"), "high");

    await user.click(within(detailPanel).getByRole("button", { name: "编辑时间" }));
    const timeInput = within(detailPanel).getByLabelText("详情时间");
    await user.clear(timeInput);
    await user.type(timeInput, "16:45");

    const dateInput = within(detailPanel).getByDisplayValue(initialScheduledFor);
    await user.clear(dateInput);
    await user.type(dateInput, updatedScheduledFor);

    await user.type(within(detailPanel).getByLabelText("待办详情"), "补充阻塞项");
    await user.click(within(detailPanel).getByRole("button", { name: "保存修改" }));

    const updatedTask = screen.getByText("更新周报").closest("li");
    expect(updatedTask).toBeTruthy();
    expect(screen.getByText("更新周报")).toBeTruthy();
    expect(within(updatedTask!).getByText("补充阻塞项")).toBeTruthy();
    expect(within(updatedTask!).getByText("#复盘")).toBeTruthy();
    expect(screen.queryByText("#工作")).toBeNull();
    expect(within(updatedTask!).getByText(`归属 ${updatedScheduledFor}`)).toBeTruthy();
    expect(within(updatedTask!).getByText("16:45")).toBeTruthy();
    expect(within(detailPanel).getByText("高优先级")).toBeTruthy();

    const tagRegion = screen.getByRole("region", { name: "标签筛选" });
    await user.click(within(tagRegion).getByRole("button", { name: /#复盘/i }));

    expect(screen.getByText("更新周报")).toBeTruthy();
  });

  it("deletes tasks from the detail panel", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("待办标题"), "准备删除的任务");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    expect(screen.queryByRole("button", { name: "删除 准备删除的任务" })).toBeNull();

    const detailPanel = screen.getByLabelText("任务详情侧栏");
    await user.click(within(detailPanel).getByRole("button", { name: "删除" }));

    expect(screen.queryByText("准备删除的任务")).toBeNull();
    expect(screen.getByText("选中一个 TODO")).toBeTruthy();
  });

  it("toggles dark theme and persists the choice", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.queryByText("日终")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "明日复明日，明日何其多" }),
    ).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: "切换到暗色主题" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("oneday-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "切换到浅色主题" }),
    ).toBeTruthy();
  });
});
