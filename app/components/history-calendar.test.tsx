import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SummaryCard,
  DayModal,
  CalendarGrid,
  heatmapClass,
  buildCalendarCells,
  type CalendarDay,
} from "./history-calendar";

// CalendarGrid は react-router のフックに依存するためモック
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router",
  );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// ─── heatmapClass ──────────────────────────────────────────────────────────────

describe("heatmapClass", () => {
  test("count=0 はスレートグレー系", () => {
    expect(heatmapClass(0)).toContain("bg-slate-100");
  });

  test("count=1 はスカイ薄色", () => {
    expect(heatmapClass(1)).toContain("bg-sky-100");
  });

  test("count=2 はスカイ薄色", () => {
    expect(heatmapClass(2)).toContain("bg-sky-100");
  });

  test("count=3 はスカイ中色", () => {
    expect(heatmapClass(3)).toContain("bg-sky-200");
  });

  test("count=6 はスカイ濃色", () => {
    expect(heatmapClass(6)).toContain("bg-sky-300");
  });
});

// ─── buildCalendarCells ────────────────────────────────────────────────────────

describe("buildCalendarCells", () => {
  test("2024年1月: 1日は月曜なので先頭パディングなし", () => {
    const cells = buildCalendarCells(2024, 1);
    expect(cells[0]).toBe(1);
  });

  test("2024年2月: 1日は木曜なので先頭に3つのnullがある", () => {
    // 2024-02-01 は木曜（月曜=0換算で3）
    const cells = buildCalendarCells(2024, 2);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBeNull();
    expect(cells[2]).toBeNull();
    expect(cells[3]).toBe(1);
  });

  test("月の日数分の数字が含まれる（1月=31日）", () => {
    const cells = buildCalendarCells(2024, 1);
    const days = cells.filter((c) => c !== null);
    expect(days).toHaveLength(31);
    expect(days[0]).toBe(1);
    expect(days[30]).toBe(31);
  });

  test("うるう年2月は29日分含む", () => {
    const cells = buildCalendarCells(2024, 2);
    const days = cells.filter((c) => c !== null);
    expect(days).toHaveLength(29);
  });

  test("セルの総数は7の倍数", () => {
    expect(buildCalendarCells(2024, 1).length % 7).toBe(0);
    expect(buildCalendarCells(2024, 2).length % 7).toBe(0);
    expect(buildCalendarCells(2024, 3).length % 7).toBe(0);
  });
});

// ─── SummaryCard ──────────────────────────────────────────────────────────────

describe("SummaryCard", () => {
  test("今週と前週の回数が表示される", () => {
    render(<SummaryCard thisWeek={10} lastWeek={5} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("差分がゼロの場合は前週比が非表示", () => {
    render(<SummaryCard thisWeek={5} lastWeek={5} />);
    expect(screen.queryByText(/前週比/)).not.toBeInTheDocument();
  });

  test("差分が正の場合に前週比に+が付く", () => {
    render(<SummaryCard thisWeek={10} lastWeek={5} />);
    expect(screen.getByText(/前週比/)).toHaveTextContent("+5回");
  });

  test("差分が負の場合に前週比がマイナス表示", () => {
    render(<SummaryCard thisWeek={3} lastWeek={8} />);
    expect(screen.getByText(/前週比/)).toHaveTextContent("-5回");
  });
});

// ─── DayModal ─────────────────────────────────────────────────────────────────

const sampleDay: CalendarDay = {
  date: "2024-01-15",
  count: 3,
  byItem: [
    { id: "1", name: "鍵", icon: "🔑", count: 2 },
    { id: "2", name: "窓", icon: "🪟", count: 1 },
  ],
};

describe("DayModal", () => {
  test("日付ラベルが正しく表示される", () => {
    render(<DayModal day={sampleDay} onClose={() => {}} />);
    expect(screen.getByText("1月15日（月）の記録")).toBeInTheDocument();
  });

  test("各アイテム名が表示される", () => {
    render(<DayModal day={sampleDay} onClose={() => {}} />);
    expect(screen.getByText("鍵")).toBeInTheDocument();
    expect(screen.getByText("窓")).toBeInTheDocument();
  });

  test("合計回数が表示される", () => {
    render(<DayModal day={sampleDay} onClose={() => {}} />);
    expect(screen.getByText("合計")).toBeInTheDocument();
    // count=3 が合計欄にある
    const totalSection = screen.getByText("合計").closest("div");
    expect(totalSection).toHaveTextContent("3");
  });

  test("×ボタンをクリックすると onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    render(<DayModal day={sampleDay} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test("オーバーレイをクリックすると onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    render(<DayModal day={sampleDay} onClose={onClose} />);
    // 最外枠のdivをクリック（オーバーレイ）
    const overlay = screen.getByText("1月15日（月）の記録").closest(".fixed");
    if (overlay) await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

describe("CalendarGrid", () => {
  const baseProps = {
    year: 2024,
    month: 1,
    calendarMap: {},
    todayStr: "2024-01-10",
    onDayClick: vi.fn(),
  };

  test("年月が表示される", () => {
    render(<CalendarGrid {...baseProps} />);
    expect(screen.getByText("2024年1月")).toBeInTheDocument();
  });

  test("曜日ヘッダーが月〜日で表示される", () => {
    render(<CalendarGrid {...baseProps} />);
    for (const label of ["月", "火", "水", "木", "金", "土", "日"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test("前の月ナビゲーションボタンが存在する", () => {
    render(<CalendarGrid {...baseProps} />);
    expect(screen.getByRole("button", { name: "前の月" })).toBeInTheDocument();
  });

  test("次の月ボタンは過去月では有効", () => {
    // 2024-01 を表示し、現在を2026年にする → canGoNext=true
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    render(<CalendarGrid {...baseProps} />);
    expect(
      screen.getByRole("button", { name: "次の月" }),
    ).not.toBeDisabled();
    vi.useRealTimers();
  });

  test("次の月ボタンは現在月では無効", () => {
    // CalendarGrid 内で new Date() を使うため vi.setSystemTime で固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T00:00:00Z"));
    render(
      <CalendarGrid
        {...baseProps}
        year={2024}
        month={6}
        todayStr="2024-06-15"
      />,
    );
    expect(screen.getByRole("button", { name: "次の月" })).toBeDisabled();
    vi.useRealTimers();
  });
});
