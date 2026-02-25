import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app-home.tsx"),
    route("history", "routes/app-history.tsx"),
    route("items", "routes/app-items.tsx"),
    route("items/:id", "routes/app-item-detail.tsx"),
    route("settings", "routes/app-settings.tsx"),
  ]),
  route("api/trigger-cleanup", "routes/api.trriger-cleanup.ts"),
] satisfies RouteConfig;
