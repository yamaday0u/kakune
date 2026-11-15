// アプリ全体で重複して使われる文言・定数を集約する

export const APP_NAME = "かくね";
export const APP_ICON_ALT = `${APP_NAME}アイコン`;

/** ページタイトル生成: "ページ名 — かくね" */
export function pageTitle(name: string): string {
  return `${name} — ${APP_NAME}`;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PLACEHOLDER = `${PASSWORD_MIN_LENGTH}文字以上`;

export const TEXT = {
  passwordTooShort: `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`,
  passwordMismatch: "パスワードが一致しません",
  itemNameRequired: "項目名を入力してください",
  processing: "処理中...",
  changePassword: "パスワードを変更",
  close: "閉じる",
  back: "戻る",
  hasPhoto: "写真あり",
} as const;

/** 曜日ラベル（日曜始まり。Date#getDay() のインデックスに対応） */
export const WEEKDAYS_SUN_START = ["日", "月", "火", "水", "木", "金", "土"] as const;
/** 曜日ラベル（月曜始まり） */
export const WEEKDAYS_MON_START = ["月", "火", "水", "木", "金", "土", "日"] as const;
