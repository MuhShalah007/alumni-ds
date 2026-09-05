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
        const url = `${c.env.APP_BASE_URL}/photos/${key}`;
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

// GET /photos/:key — serve photo from R2
uploadRoutes.get("/photos/:key", async (c) => {
  const key = `photos/${c.req.param("key")}`;
  if (!c.env.PHOTOS) return c.json({ error: "Storage tidak tersedia" }, 503);

  const object = await c.env.PHOTOS.get(key);
  if (!object) return c.json({ error: "Foto tidak ditemukan" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});
