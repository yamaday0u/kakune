import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppSettings from "./app-settings";

vi.mock("react-router", () => ({
  useLoaderData: vi.fn(),
  useSearchParams: vi.fn(),
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

import { useLoaderData, useSearchParams } from "react-router";

const mockUseLoaderData = vi.mocked(useLoaderData);
const mockUseSearchParams = vi.mocked(useSearchParams);

function renderSettings({
  email = "test@example.com",
  googleFormUrl = "",
  searchParams = new URLSearchParams(),
} = {}) {
  mockUseLoaderData.mockReturnValue({ email, googleFormUrl });
  mockUseSearchParams.mockReturnValue([searchParams, vi.fn()] as ReturnType<
    typeof useSearchParams
  >);
  return render(<AppSettings />);
}

describe("AppSettings", () => {
  test("メールアドレスが表示される", () => {
    renderSettings({ email: "user@example.com" });
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  test("「パスワード変更」リンクが /app/settings/change-password を指している", () => {
    renderSettings();
    const link = screen.getByRole("link", { name: /パスワード変更/ });
    expect(link).toHaveAttribute("href", "/app/settings/change-password");
  });

  test("passwordChanged=1 のとき成功メッセージが表示される", () => {
    renderSettings({ searchParams: new URLSearchParams("passwordChanged=1") });
    expect(screen.getByText("パスワードを変更しました")).toBeInTheDocument();
  });

  test("passwordChanged がないとき成功メッセージは表示されない", () => {
    renderSettings();
    expect(screen.queryByText("パスワードを変更しました")).not.toBeInTheDocument();
  });

  test("passwordChanged=0 のとき成功メッセージは表示されない", () => {
    renderSettings({ searchParams: new URLSearchParams("passwordChanged=0") });
    expect(screen.queryByText("パスワードを変更しました")).not.toBeInTheDocument();
  });

  test("ログアウトボタンが表示される", () => {
    renderSettings();
    expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
  });

  test("googleFormUrl が空のとき「感想・要望」リンクは表示されない", () => {
    renderSettings({ googleFormUrl: "" });
    expect(screen.queryByText("感想・要望を送る")).not.toBeInTheDocument();
  });

  test("googleFormUrl があるとき「感想・要望」リンクが表示される", () => {
    renderSettings({ googleFormUrl: "https://forms.google.com/test" });
    const link = screen.getByRole("link", { name: /感想・要望を送る/ });
    expect(link).toHaveAttribute("href", "https://forms.google.com/test");
  });
});
