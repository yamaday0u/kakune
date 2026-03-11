import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppSettingsChangePassword from "./app-settings-change-password";

vi.mock("react-router", () => ({
  useActionData: vi.fn(),
  useNavigation: vi.fn(),
  Form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form {...props}>{children}</form>
  ),
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  data: vi.fn(),
  redirect: vi.fn(),
}));

import { useActionData, useNavigation } from "react-router";

const mockUseActionData = vi.mocked(useActionData);
const mockUseNavigation = vi.mocked(useNavigation);

function renderPage({ actionData = undefined as unknown, submitting = false } = {}) {
  mockUseActionData.mockReturnValue(actionData);
  mockUseNavigation.mockReturnValue({
    state: submitting ? "submitting" : "idle",
  } as ReturnType<typeof useNavigation>);
  return render(<AppSettingsChangePassword />);
}

describe("AppSettingsChangePassword", () => {
  test("「パスワード変更」の見出しが表示される", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "パスワード変更" })).toBeInTheDocument();
  });

  test("設定画面に戻るリンクが表示される", () => {
    renderPage();
    const link = screen.getByRole("link", { name: "戻る" });
    expect(link).toHaveAttribute("href", "/app/settings");
  });

  test("現在のパスワード入力フィールドがある", () => {
    renderPage();
    expect(screen.getByLabelText("現在のパスワード")).toBeInTheDocument();
  });

  test("新しいパスワード入力フィールドがある", () => {
    renderPage();
    expect(screen.getByLabelText("新しいパスワード")).toBeInTheDocument();
  });

  test("新しいパスワード（確認）入力フィールドがある", () => {
    renderPage();
    expect(screen.getByLabelText("新しいパスワード（確認）")).toBeInTheDocument();
  });

  test("送信ボタンが「パスワードを変更」と表示される", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "パスワードを変更" })).toBeInTheDocument();
  });

  test("送信中はボタンが「変更中...」になる", () => {
    renderPage({ submitting: true });
    expect(screen.getByRole("button", { name: "変更中..." })).toBeInTheDocument();
  });

  test("送信中はボタンが disabled になる", () => {
    renderPage({ submitting: true });
    expect(screen.getByRole("button", { name: "変更中..." })).toBeDisabled();
  });

  test("送信していないときボタンは disabled でない", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "パスワードを変更" })).not.toBeDisabled();
  });

  test("エラーがあるときエラーメッセージが表示される", () => {
    renderPage({ actionData: { error: "現在のパスワードが正しくありません" } });
    expect(screen.getByText("現在のパスワードが正しくありません")).toBeInTheDocument();
  });

  test("エラーがないときエラーメッセージは表示されない", () => {
    renderPage();
    expect(
      screen.queryByText("現在のパスワードが正しくありません"),
    ).not.toBeInTheDocument();
  });

  test("パスワードフィールドは type=password", () => {
    renderPage();
    const inputs = screen.getAllByDisplayValue("");
    // 3つの password フィールドすべてが type=password
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs).toHaveLength(3);
  });
});
