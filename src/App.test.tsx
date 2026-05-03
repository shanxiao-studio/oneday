import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

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

    expect(screen.getByRole("region", { name: "标签筛选" })).toBeTruthy();
    expect(screen.queryByText("写周报")).toBeTruthy();
    expect(screen.queryByText("买菜")).toBeTruthy();
    expect(screen.queryByText("过 PR")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /#review/i }));

    expect(screen.queryByText("写周报")).toBeTruthy();
    expect(screen.queryByText("过 PR")).toBeTruthy();
    expect(screen.queryByText("买菜")).toBeNull();

    await user.click(screen.getByRole("button", { name: /全部/ }));

    expect(screen.queryByText("买菜")).toBeTruthy();
  });

  it("adds task details and renders them in the task list", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("待办标题"), "准备发布说明 #发布");
    await user.type(
      screen.getByLabelText("待办详情"),
      "补充变更摘要\n列出回滚方案",
    );
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    expect(screen.getByText("准备发布说明")).toBeTruthy();
    expect(screen.getByText(/补充变更摘要\s+列出回滚方案/u)).toBeTruthy();
  });

  it("edits an existing task title, tags, details, and scheduled date", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("待办标题"), "写周报 #工作");
    await user.type(screen.getByLabelText("待办详情"), "整理本周进展");
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    await user.click(screen.getByRole("button", { name: "编辑 写周报" }));

    const titleInput = screen.getByDisplayValue("写周报 #工作");
    await user.clear(titleInput);
    await user.type(titleInput, "更新周报 #复盘");

    const dateInput = screen.getByDisplayValue("2026-05-03");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-05-04");

    const detailInput = screen.getByDisplayValue("整理本周进展");
    await user.clear(detailInput);
    await user.type(detailInput, "补充阻塞项");

    await user.click(screen.getByRole("button", { name: "保存" }));

    const updatedTask = screen.getByText("更新周报").closest("li");

    expect(updatedTask).toBeTruthy();
    expect(screen.getByText("更新周报")).toBeTruthy();
    expect(within(updatedTask!).getByText("补充阻塞项")).toBeTruthy();
    expect(within(updatedTask!).getByText("#复盘")).toBeTruthy();
    expect(screen.queryByText("#工作")).toBeNull();
    expect(within(updatedTask!).getByText("归属日期 2026-05-04")).toBeTruthy();

    const tagRegion = screen.getByRole("region", { name: "标签筛选" });
    await user.click(within(tagRegion).getByRole("button", { name: /#复盘/i }));

    expect(screen.getByText("更新周报")).toBeTruthy();
  });

  it("toggles dark theme and persists the choice", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: "切换到暗色主题" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("oneday-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "切换到浅色主题" }),
    ).toBeTruthy();
  });
});
