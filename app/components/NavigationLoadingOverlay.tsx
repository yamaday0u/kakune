import { useEffect, useState } from "react";
import { useLocation, useNavigation } from "react-router";
import type { Location } from "react-router";

type Navigation = ReturnType<typeof useNavigation>;

// 高速な遷移でオーバーレイがチラつかないよう、表示までに待つ時間（ms）
export const OVERLAY_DELAY_MS = 150;

/**
 * 画面遷移中かどうかを判定する。
 * - GET遷移（リンク・navigate）による読み込み中 → 遷移中
 * - フォーム送信後のリダイレクトで別画面へ移動中 → 遷移中
 * - 同一画面でのフォーム送信・再検証 → 各画面のボタン表示に任せるため対象外
 */
export function isPageTransition(
  navigation: Navigation,
  location: Location,
): boolean {
  if (navigation.state !== "loading") return false;
  if (!navigation.formMethod) return true;
  return navigation.location.pathname !== location.pathname;
}

export default function NavigationLoadingOverlay() {
  const navigation = useNavigation();
  const location = useLocation();
  const transitioning = isPageTransition(navigation, location);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!transitioning) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), OVERLAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [transitioning]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-[1px]"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      <span className="sr-only">読み込み中</span>
    </div>
  );
}
