import { type RouteConfig, route, layout } from "@react-router/dev/routes";
import authenticatedRoutes from "./routes/(authenticated)/routes";

export default [
  route("top", "routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/reset-password", "routes/auth-reset-password.tsx"),
  layout("routes/(authenticated)/layout.tsx", authenticatedRoutes),
  route("api/trigger-cleanup", "routes/api.trriger-cleanup.ts"),
] satisfies RouteConfig;
