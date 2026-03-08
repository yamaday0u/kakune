import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { WelcomeToast } from "./app-home";

describe("WelcomeToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("最初は表示されている", () => {
    render(<WelcomeToast />);
    expect(screen.getByText("ようこそ、かくねへ！")).toBeInTheDocument();
  });

  test("サブテキストも表示されている", () => {
    render(<WelcomeToast />);
    expect(
      screen.getByText("確認項目を追加して使い始めましょう"),
    ).toBeInTheDocument();
  });

  test("最初は opacity-100 クラスがある", () => {
    render(<WelcomeToast />);
    const wrapper = screen
      .getByText("ようこそ、かくねへ！")
      .closest(".fixed");
    expect(wrapper).toHaveClass("opacity-100");
  });

  test("3500ms 後に opacity-0 クラスになる", async () => {
    render(<WelcomeToast />);
    const wrapper = screen
      .getByText("ようこそ、かくねへ！")
      .closest(".fixed");

    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    expect(wrapper).toHaveClass("opacity-0");
  });

  test("3499ms では まだ opacity-100", async () => {
    render(<WelcomeToast />);
    const wrapper = screen
      .getByText("ようこそ、かくねへ！")
      .closest(".fixed");

    await act(async () => {
      vi.advanceTimersByTime(3499);
    });

    expect(wrapper).toHaveClass("opacity-100");
  });
});
