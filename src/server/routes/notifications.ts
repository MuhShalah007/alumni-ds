import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { authMiddleware } from "../middleware/auth";
import { ulid } from "../utils/id";
import { sanitizeText } from "../utils/sanitize";

export const notificationRoutes = new Hono<AppContext>();

notificationRoutes.use("*", authMiddleware);

// Helper: check if a notification is visible to the current admin session
function isVisibleTo(session: { role: string; assignedGender: string; assignedUnit: string | null }, n: {
  target_role: string;
  target_gender: string | null;
  target_unit: string | null;
}): boolean {
  if (n.target_role === "all") return true;
  if (n.target_role === session.role) return true;
  // admin_unit sees notifications targeted to admin_unit or all
  if (session.role === "admin_unit" && n.target_role === "admin_unit") {
    if (n.target_gender && n.target_gender !== "all" && n.target_gender !== session.assignedGender) return false;
    if (n.target_unit && n.target_unit !== session.assignedUnit) return false;
    return true;
  }
  return false;
}

// GET /api/admin/notifications — list notifications visible to current admin
notificationRoutes.get("/notifications", async (c) => {
  const session = c.get("admin")!;

  const rows = await c.env.DB.prepare(
    `SELECT n.id, n.type, n.judul, n.pesan, n.target_role, n.target_gender, n.target_unit, n.is_pinned, n.created_by, n.created_at,
       a.nama_lengkap as created_by_name,
       CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read
     FROM notifications n
     LEFT JOIN admins a ON n.created_by = a.id
     LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?
     ORDER BY n.is_pinned DESC, n.created_at DESC`,
  )
    .bind(session.adminId)
    .all();

  const filtered = rows.results.filter((n: Record<string, unknown>) =>
    isVisibleTo(session, {
      target_role: n.target_role as string,
      target_gender: n.target_gender as string | null,
      target_unit: n.target_unit as string | null,
    }),
  );

  return c.json({ data: filtered });
});

// GET /api/admin/notifications/unread-count — unread notification count
notificationRoutes.get("/notifications/unread-count", async (c) => {
  const session = c.get("admin")!;

  const rows = await c.env.DB.prepare(
    `SELECT n.id, n.target_role, n.target_gender, n.target_unit,
       CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read
     FROM notifications n
     LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?`,
  )
    .bind(session.adminId)
    .all();

  const unread = rows.results.filter((n: Record<string, unknown>) =>
    isVisibleTo(session, {
      target_role: n.target_role as string,
      target_gender: n.target_gender as string | null,
      target_unit: n.target_unit as string | null,
    }) && n.is_read === 0,
  ).length;

  return c.json({ count: unread });
});

// POST /api/admin/notifications — create notification (super_admin or admin_putra/putri)
notificationRoutes.post("/notifications", async (c) => {
  const session = c.get("admin")!;
  const body = await c.req.json<{
    type?: string;
    judul: string;
    pesan: string;
    targetRole?: string;
    targetGender?: string;
    targetUnit?: string;
    isPinned?: boolean;
  }>();

  if (!body.judul?.trim() || !body.pesan?.trim()) {
    return c.json({ error: "Judul dan pesan wajib diisi" }, 400);
  }

  const type = body.type === "chat" || body.type === "system" ? body.type : "pengumuman";
  const targetRole = body.targetRole || "all";
  const targetGender = body.targetGender || "all";
  const targetUnit = body.targetUnit || null;

  // Scope: admin_putra can only target putra, admin_putri only putri
  if (session.role === "admin_putra" && targetGender === "putri") {
    return c.json({ error: "Anda tidak dapat mengirim notifikasi ke admin putri" }, 403);
  }
  if (session.role === "admin_putri" && targetGender === "putra") {
    return c.json({ error: "Anda tidak dapat mengirim notifikasi ke admin putra" }, 403);
  }

  const id = ulid();
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, target_unit, is_pinned, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      type,
      sanitizeText(body.judul),
      sanitizeText(body.pesan),
      targetRole,
      targetGender === "all" ? null : targetGender,
      targetUnit,
      body.isPinned ? 1 : 0,
      session.adminId,
    )
    .run();

  return c.json({ success: true, id });
});

// PATCH /api/admin/notifications/:id/read — mark as read
notificationRoutes.patch("/notifications/:id/read", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;

  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO notification_reads (id, notification_id, admin_id) VALUES (?, ?, ?)`,
  )
    .bind(ulid(), id, session.adminId)
    .run();

  return c.json({ success: true });
});

// PATCH /api/admin/notifications/read-all — mark all visible as read
notificationRoutes.patch("/notifications/read-all", async (c) => {
  const session = c.get("admin")!;

  const rows = await c.env.DB.prepare(
    `SELECT n.id, n.target_role, n.target_gender, n.target_unit,
       CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read
     FROM notifications n
     LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.admin_id = ?`,
  )
    .bind(session.adminId)
    .all();

  const unread = rows.results.filter((n: Record<string, unknown>) =>
    isVisibleTo(session, {
      target_role: n.target_role as string,
      target_gender: n.target_gender as string | null,
      target_unit: n.target_unit as string | null,
    }) && n.is_read === 0,
  );

  for (const n of unread) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO notification_reads (id, notification_id, admin_id) VALUES (?, ?, ?)`,
    )
      .bind(ulid(), n.id as string, session.adminId)
      .run();
  }

  return c.json({ success: true, marked: unread.length });
});

// DELETE /api/admin/notifications/:id — delete (only creator or super_admin)
notificationRoutes.delete("/notifications/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;

  const notif = await c.env.DB.prepare(
    "SELECT created_by FROM notifications WHERE id = ?",
  )
    .bind(id)
    .first<{ created_by: string | null }>();

  if (!notif) return c.json({ error: "Notifikasi tidak ditemukan" }, 404);
  if (notif.created_by !== session.adminId && session.role !== "super_admin") {
    return c.json({ error: "Anda tidak dapat menghapus notifikasi ini" }, 403);
  }

  await c.env.DB.prepare("DELETE FROM notifications WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});
