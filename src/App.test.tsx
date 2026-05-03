import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("adds task details and a same-day time to the task list", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("待办标题"), "准备发布说明 #发布");
    await user.type(screen.getByLabelText("当天时间"), "14:30");
    await user.type(
      screen.getByLabelText("待办详情"),
      "补充变更摘要\n列出回滚方案",
    );
    await user.click(screen.getByRole("button", { name: "添加今日待办" }));

    expect(screen.getByText("准备发布说明")).toBeTruthy();
    expect(screen.getByText(/补充变更摘要\s+列出回滚方案/u)).toBeTruthy();
    expect(screen.getByText("14:30")).toBeTruthy();
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
