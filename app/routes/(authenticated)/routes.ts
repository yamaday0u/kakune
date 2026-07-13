import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/(authenticated)/home.tsx"),
  route("history", "routes/(authenticated)/history.tsx"),
  route("history/item-logs", "routes/(authenticated)/history/item-logs.ts"),
  route("items", "routes/(authenticated)/items.tsx"),
  route("items/:id", "routes/(authenticated)/items/detail.tsx"),
  route("settings", "routes/(authenticated)/settings.tsx"),
  route(
    "settings/change-password",
    "routes/(authenticated)/settings/change-password.tsx",
  ),
];
