import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app-home.tsx"),
    route("items", "routes/app-items.tsx"),
    route("items/:id", "routes/app-item-detail.tsx"),
    route("settings", "routes/app-settings.tsx"),
  ]),
] satisfies RouteConfig;
