import { Hono } from "hono";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors";
import { alumniRoutes } from "./routes/alumni";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { excelRoutes } from "./routes/excel";
import { broadcastRoutes } from "./routes/broadcast";
import { notificationRoutes } from "./routes/notifications";
import { uploadRoutes, photoRoutes } from "./routes/upload";
import { qrRoutes } from "./routes/qr";
import { pushRoutes } from "./routes/push";
import type { AppContext } from "./db/client";

const app = new Hono<AppContext>();

app.use("*", logger());
app.use("*", corsMiddleware);

// API routes
app.route("/api/alumni", alumniRoutes);
app.route("/api/alumni", uploadRoutes);
// Public photo serving — mounted at root so `${APP_BASE_URL}/photos/<key>`
// resolves (the handler lives in upload.ts but must NOT be under /api/alumni).
app.route("/", photoRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/admin", broadcastRoutes);
app.route("/api/admin", notificationRoutes);
app.route("/api/qr", qrRoutes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// SPA fallback: for non-API routes, try ASSETS first, then serve index.html
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status !== 404) return res;

    // SPA fallback: try fetching "/" from ASSETS (works in production with not_found_handling)
    const indexRes = await c.env.ASSETS.fetch(new Request(new URL("/", c.req.url), c.req.raw));
    if (indexRes.status !== 404) return indexRes;
  }

  // Dev mode fallback: fetch index.html from the Vite dev server
  try {
    const devRes = await fetch(new URL("/index.html", c.req.url));
    if (devRes.ok) return devRes;
  } catch { /* not in dev mode */ }

  return c.json({ error: "Not found" }, 404);
});

export default app;
