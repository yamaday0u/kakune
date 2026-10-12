import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { Location } from "react-router";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigation: vi.fn(),
    useLocation: vi.fn(),
  };
});

import { useLocation, useNavigation } from "react-router";
import NavigationLoadingOverlay, {
  isPageTransition,
  OVERLAY_DELAY_MS,
} from "./NavigationLoadingOverlay";

const mockUseNavigation = vi.mocked(useNavigation);
const mockUseLocation = vi.mocked(useLocation);

type Navigation = ReturnType<typeof useNavigation>;

const loc = (pathname: string) => ({ pathname }) as Location;
const idle = { state: "idle" } as Navigation;
const loading = (pathname: string, formMethod?: string) =>
  ({ state: "loading", location: loc(pathname), formMethod }) as Navigation;

// ─── isPageTransition ─────────────────────────────────────────────────────────

describe("isPageTransition", () => {
  test("idle のときは遷移中ではない", () => {
    expect(isPageTransition(idle, loc("/"))).toBe(false);
  });

  test("リンクによる読み込み中は遷移中", () => {
    expect(isPageTransition(loading("/history"), loc("/"))).toBe(true);
  });

  test("同一パスのGET遷移（クエリ変更）も遷移中", () => {
    expect(isPageTransition(loading("/history"), loc("/history"))).toBe(true);
  });

  test("フォーム送信中（submitting）は対象外", () => {
    const nav = {
      state: "submitting",
      location: loc("/items"),
      formMethod: "POST",
    } as Navigation;
    expect(isPageTransition(nav, loc("/items"))).toBe(false);
  });

  test("同一画面でのフォーム送信後の再検証は対象外", () => {
    expect(isPageTransition(loading("/items", "POST"), loc("/items"))).toBe(
      false,
    );
  });

  test("フォーム送信後に別画面へリダイレクト中は遷移中", () => {
    expect(isPageTransition(loading("/", "POST"), loc("/login"))).toBe(true);
  });
});

// ─── NavigationLoadingOverlay ─────────────────────────────────────────────────

describe("NavigationLoadingOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseLocation.mockReturnValue(loc("/"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("idle のときは表示しない", () => {
    mockUseNavigation.mockReturnValue(idle);
    render(<NavigationLoadingOverlay />);
    act(() => vi.advanceTimersByTime(OVERLAY_DELAY_MS));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("遷移中は遅延後に表示し、完了すると消える", () => {
    mockUseNavigation.mockReturnValue(loading("/history"));
    const { rerender } = render(<NavigationLoadingOverlay />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(OVERLAY_DELAY_MS));
    expect(screen.getByRole("status")).toBeInTheDocument();

    mockUseNavigation.mockReturnValue(idle);
    rerender(<NavigationLoadingOverlay />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("遅延時間内に遷移が完了した場合は表示しない", () => {
    mockUseNavigation.mockReturnValue(loading("/history"));
    const { rerender } = render(<NavigationLoadingOverlay />);
    act(() => vi.advanceTimersByTime(OVERLAY_DELAY_MS - 50));

    mockUseNavigation.mockReturnValue(idle);
    rerender(<NavigationLoadingOverlay />);
    act(() => vi.advanceTimersByTime(OVERLAY_DELAY_MS));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
