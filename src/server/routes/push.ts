import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { ulid } from "../utils/id";

export const pushRoutes = new Hono<AppContext>();

// POST /api/push/subscribe — register Web Push subscription
pushRoutes.post("/subscribe", async (c) => {
  const body = await c.req.json<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    alumniId?: string;
  }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "Data subscription tidak lengkap" }, 400);
  }

  const id = ulid();

  // Upsert: if endpoint exists, update; otherwise insert
  const existing = await c.env.DB.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?")
    .bind(body.endpoint)
    .first();

  if (existing) {
    await c.env.DB.prepare(
      "UPDATE push_subscriptions SET p256dh = ?, auth = ?, alumni_id = ? WHERE endpoint = ?",
    )
      .bind(body.keys.p256dh, body.keys.auth, body.alumniId ?? null, body.endpoint)
      .run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, alumni_id) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(id, body.endpoint, body.keys.p256dh, body.keys.auth, body.alumniId ?? null)
      .run();
  }

  return c.json({ success: true });
});

// POST /api/push/unsubscribe
pushRoutes.post("/unsubscribe", async (c) => {
  const body = await c.req.json<{ endpoint: string }>();
  if (!body.endpoint) return c.json({ error: "Endpoint wajib diisi" }, 400);

  await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(body.endpoint).run();
  return c.json({ success: true });
});
