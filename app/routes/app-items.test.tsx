import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconPicker } from "./app-items";

const PRESET_ICONS = [
  "🔑", "🔒", "🚪", "🪟", "🔥", "💡", "⚡", "🚿",
  "🚰", "🚗", "🎒", "💼", "🏠", "📱", "✔️",
];

describe("IconPicker", () => {
  test("全プリセットアイコンが表示される", () => {
    render(<IconPicker name="icon" value="🔑" onChange={() => {}} />);
    for (const emoji of PRESET_ICONS) {
      expect(screen.getByRole("button", { name: emoji })).toBeInTheDocument();
    }
  });

  test("アイコンをクリックすると onChange が呼ばれる", async () => {
    const onChange = vi.fn();
    render(<IconPicker name="icon" value="🔑" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "🔒" }));
    expect(onChange).toHaveBeenCalledWith("🔒");
  });

  test("onChange は選択したアイコンの値で呼ばれる", async () => {
    const onChange = vi.fn();
    render(<IconPicker name="icon" value="🔑" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "🏠" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("🏠");
  });

  test("選択中のアイコンに bg-slate-300 クラスがある", () => {
    render(<IconPicker name="icon" value="🔑" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "🔑" })).toHaveClass(
      "bg-slate-300",
    );
  });

  test("選択中でないアイコンは bg-slate-100 クラス", () => {
    render(<IconPicker name="icon" value="🔑" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "🔒" })).toHaveClass(
      "bg-slate-100",
    );
  });

  test("hidden input に現在の値がセットされる", () => {
    const { container } = render(
      <IconPicker name="icon" value="🔒" onChange={() => {}} />,
    );
    const input = container.querySelector('input[type="hidden"][name="icon"]');
    expect(input).toHaveValue("🔒");
  });

  test("name prop が hidden input に反映される", () => {
    const { container } = render(
      <IconPicker name="my-icon" value="🔑" onChange={() => {}} />,
    );
    const input = container.querySelector('input[type="hidden"][name="my-icon"]');
    expect(input).toBeInTheDocument();
  });
});
