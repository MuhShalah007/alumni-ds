import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { rateLimit } from "../middleware/rateLimit";
import { ulid } from "../utils/id";

export const uploadRoutes = new Hono<AppContext>();

// POST /api/alumni/upload-photo — upload photo to R2 or return Base64 fallback
uploadRoutes.post(
  "/upload-photo",
  rateLimit({ prefix: "upload", maxRequests: 20, windowMs: 600_000 }),
  async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return c.json({ error: "File foto tidak ditemukan" }, 400);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "File harus berupa gambar" }, 400);
    }

    // Max 500KB (pre-compression; client should compress to <300KB)
    if (file.size > 500_000) {
      return c.json({ error: "Ukuran foto maksimal 500KB. Mohon kompres terlebih dahulu." }, 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `photos/${ulid()}.${ext}`;

    // Try R2 first
    try {
      if (c.env.PHOTOS) {
        await c.env.PHOTOS.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
        // Return a relative URL so the browser resolves it against the
        // current origin — works in dev (any port) and production alike.
        const url = `/photos/${key.replace(/^photos\//, "")}`;
        return c.json({ url, storage: "r2" });
      }
    } catch {
      // Fall through to base64
    }

    // Fallback: Base64 data URL stored in D1
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    return c.json({ url: dataUrl, storage: "base64" });
  },
);

// POST /api/alumni/upload-background — upload background/cover photo
uploadRoutes.post(
  "/upload-background",
  rateLimit({ prefix: "upload-bg", maxRequests: 20, windowMs: 600_000 }),
  async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return c.json({ error: "File background tidak ditemukan" }, 400);

    if (!file.type.startsWith("image/")) {
      return c.json({ error: "File harus berupa gambar" }, 400);
    }

    if (file.size > 500_000) {
      return c.json({ error: "Ukuran background maksimal 500KB. Mohon kompres terlebih dahulu." }, 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `photos/backgrounds/${ulid()}.${ext}`;

    try {
      if (c.env.PHOTOS) {
        await c.env.PHOTOS.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
        const url = `/photos/${key.replace(/^photos\//, "")}`;
        return c.json({ url, storage: "r2" });
      }
    } catch {
      // Fall through to base64
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    return c.json({ url: dataUrl, storage: "base64" });
  },
);

// GET /photos/* — serve photo from R2.
// Mounted at the app root (NOT under /api/alumni) so that relative URLs of
// the form `/photos/<publicPath>` resolve correctly. The `<publicPath>`
// captured after `/photos/` is re-prefixed with `photos/` to form the R2 key,
// so both profile photos (`<id>.ext`) and backgrounds (`backgrounds/<id>.ext`)
// are served by the same route.
export const photoRoutes = new Hono<AppContext>();

photoRoutes.get("/photos/*", async (c) => {
  const publicPath = c.req.path.replace(/^\/photos\//, "");
  const key = `photos/${publicPath}`;
  if (!c.env.PHOTOS) return c.json({ error: "Storage tidak tersedia" }, 503);

  const object = await c.env.PHOTOS.get(key);
  if (!object) return c.json({ error: "Foto tidak ditemukan" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});
