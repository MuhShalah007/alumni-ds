import { Hono } from "hono";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { alumni, admins, activityLogs } from "../db/schema";
import type { AppContext, Database } from "../db/client";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth";
import { alumniScope, fetchScopedAlumni } from "../utils/scope";
import { hashPassword } from "../utils/password";
import { ulid, uuid } from "../utils/id";
import { createAdminSchema } from "../utils/validation";
import { sanitizeText } from "../utils/sanitize";

export const adminRoutes = new Hono<AppContext>();

// All admin routes require authentication
adminRoutes.use("*", authMiddleware);

// GET /api/admin/me — current admin info
adminRoutes.get("/me", (c) => {
  const admin = c.get("admin")!;
  return c.json({ admin });
});

// GET /api/admin/alumni — list alumni with pagination, filters, scope
adminRoutes.get("/alumni", async (c) => {
  const session = c.get("admin")!;
  const scope = alumniScope(session);

  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;

  const gender = c.req.query("gender");
  const angkatan = c.req.query("angkatan");
  const unit = c.req.query("unit");
  const status = c.req.query("status");
  const search = c.req.query("search");

  // Build WHERE clause using raw D1 with scope from alumniScope
  let whereSql = "WHERE 1=1";
  const d1Params: (string | number)[] = [];

  if (scope.whereSql) {
    whereSql += scope.whereSql;
    d1Params.push(...scope.params);
  }
  if (gender) {
    whereSql += " AND gender = ?";
    d1Params.push(gender);
  }
  if (angkatan) {
    whereSql += " AND angkatan = ?";
    d1Params.push(angkatan);
  }
  if (unit) {
    whereSql += " AND unit = ?";
    d1Params.push(unit);
  }
  if (status) {
    whereSql += " AND status_verifikasi = ?";
    d1Params.push(status);
  }
  if (search) {
    whereSql += " AND (nama_lengkap LIKE ? OR nama_panggilan LIKE ?)";
    d1Params.push(`%${search}%`, `%${search}%`);
  }

  // Count total
  const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM alumni ${whereSql}`)
    .bind(...d1Params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  // Fetch page
  const rows = await c.env.DB.prepare(
    `SELECT id, nama_lengkap, nama_panggilan, gender, unit, kelas_nihai, angkatan, tahun_lulus, no_hp, status_verifikasi, privacy_level, foto_url, created_at FROM alumni ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...d1Params, limit, offset)
    .all();

  return c.json({
    data: rows.results,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/admin/alumni/:id — detail
adminRoutes.get("/alumni/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;

  // Scope check
  const accessCheck = await fetchScopedAlumni(c.env.DB, session, id);
  if (!accessCheck) return c.json({ error: "Alumni tidak ditemukan atau di luar scope" }, 404);

  const row = await c.env.DB.prepare("SELECT id, nama_lengkap, nama_pondok, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, tahun_masuk, nama_angkatan, alamat, no_hp, email, motto, kesan_pesan, momen_berkesan, foto_url, sosial_media, status_aktivitas, detail_aktivitas, privacy_level, photo_privacy, status_verifikasi, verified_by, verified_at, created_at, updated_at FROM alumni WHERE id = ?")
    .bind(id)
    .first();

  if (!row) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  const result = {
    ...row,
    sosial_media: row.sosial_media ? JSON.parse(row.sosial_media as string) : null,
  };

  return c.json({ alumni: result });
});

// PUT /api/admin/alumni/:id — admin edit
adminRoutes.put("/alumni/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;
  const body = await c.req.json();

  const accessCheck = await fetchScopedAlumni(c.env.DB, session, id);
  if (!accessCheck) return c.json({ error: "Alumni di luar scope Anda" }, 403);

  // Build dynamic update from body
  const fieldMap: Record<string, string> = {
    namaLengkap: "nama_lengkap",
    namaPondok: "nama_pondok",
    namaPanggilan: "nama_panggilan",
    tempatLahir: "tempat_lahir",
    tanggalLahir: "tanggal_lahir",
    gender: "gender",
    unit: "unit",
    kelasNihai: "kelas_nihai",
    angkatan: "angkatan",
    tahunLulus: "tahun_lulus",
    tahunMasuk: "tahun_masuk",
    namaAngkatan: "nama_angkatan",
    alamat: "alamat",
    noHp: "no_hp",
    email: "email",
    motto: "motto",
    kesanPesan: "kesan_pesan",
    momenBerkesan: "momen_berkesan",
    fotoUrl: "foto_url",
    statusAktivitas: "status_aktivitas",
    detailAktivitas: "detail_aktivitas",
    privacyLevel: "privacy_level",
    statusVerifikasi: "status_verifikasi",
  };

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in body) {
      const val = body[camel];
      const sanitized = ["motto", "kesanPesan", "momenBerkesan"].includes(camel) && typeof val === "string"
        ? sanitizeText(val)
        : val;
      updates.push(`${snake} = ?`);
      values.push(sanitized);
    }
  }

  if ("sosialMedia" in body) {
    updates.push("sosial_media = ?");
    values.push(body.sosialMedia ? JSON.stringify(body.sosialMedia) : null);
  }

  if (updates.length === 0) return c.json({ success: true, message: "Tidak ada perubahan" });

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await c.env.DB.prepare(`UPDATE alumni SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  // Log activity
  await c.env.DB.prepare("INSERT INTO activity_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)")
    .bind(ulid(), session.adminId, "UPDATE_BIODATA", JSON.stringify({ alumniId: id }))
    .run();

  return c.json({ success: true, message: "Data alumni diperbarui" });
});

// DELETE /api/admin/alumni/:id
adminRoutes.delete("/alumni/:id", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;

  const accessCheck = await fetchScopedAlumni(c.env.DB, session, id);
  if (!accessCheck) return c.json({ error: "Alumni di luar scope Anda" }, 403);

  await c.env.DB.prepare("DELETE FROM alumni WHERE id = ?").bind(id).run();

  await c.env.DB.prepare("INSERT INTO activity_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)")
    .bind(ulid(), session.adminId, "DELETE_ALUMNI", JSON.stringify({ alumniId: id }))
    .run();

  return c.json({ success: true, message: "Data alumni dihapus" });
});

// PATCH /api/admin/alumni/:id/verify — verify or reject
adminRoutes.patch("/alumni/:id/verify", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;
  const { status } = await c.req.json<{ status: "verified" | "rejected" }>();

  if (!["verified", "rejected"].includes(status)) {
    return c.json({ error: "Status harus 'verified' atau 'rejected'" }, 400);
  }

  const accessCheck = await fetchScopedAlumni(c.env.DB, session, id);
  if (!accessCheck) return c.json({ error: "Alumni di luar scope Anda" }, 403);

  await c.env.DB.prepare("UPDATE alumni SET status_verifikasi = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, session.adminId, id)
    .run();

  await c.env.DB.prepare("INSERT INTO activity_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)")
    .bind(ulid(), session.adminId, "VERIFY_ALUMNI", JSON.stringify({ alumniId: id, status }))
    .run();

  return c.json({ success: true, message: `Alumni ${status}` });
});

// GET /api/admin/stats — dashboard statistics
adminRoutes.get("/stats", async (c) => {
  const session = c.get("admin")!;
  const scope = alumniScope(session);

  let whereSql = "WHERE 1=1";
  const params: string[] = [];
  if (session.role === "admin_putra") {
    whereSql += " AND gender = 'putra'";
  } else if (session.role === "admin_putri") {
    whereSql += " AND gender = 'putri'";
  } else if (session.role === "admin_unit") {
    whereSql += " AND gender = ? AND unit = ?";
    params.push(session.assignedGender === "all" ? "putra" : session.assignedGender, session.assignedUnit ?? "");
  }

  const total = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM alumni ${whereSql}`).bind(...params).first<{ c: number }>();
  const putra = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM alumni ${whereSql} AND gender = 'putra'`).bind(...params).first<{ c: number }>();
  const putri = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM alumni ${whereSql} AND gender = 'putri'`).bind(...params).first<{ c: number }>();
  const verified = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM alumni ${whereSql} AND status_verifikasi = 'verified'`).bind(...params).first<{ c: number }>();
  const pending = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM alumni ${whereSql} AND status_verifikasi = 'pending'`).bind(...params).first<{ c: number }>();
  const rejected = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM alumni ${whereSql} AND status_verifikasi = 'rejected'`).bind(...params).first<{ c: number }>();

  const perAngkatan = await c.env.DB.prepare(
    `SELECT angkatan, COUNT(*) as count FROM alumni ${whereSql} GROUP BY angkatan ORDER BY angkatan`,
  ).bind(...params).all();

  const perUnit = await c.env.DB.prepare(
    `SELECT unit, COUNT(*) as count FROM alumni ${whereSql} GROUP BY unit ORDER BY count DESC`,
  ).bind(...params).all();

  return c.json({
    total: total?.c ?? 0,
    putra: putra?.c ?? 0,
    putri: putri?.c ?? 0,
    verified: verified?.c ?? 0,
    pending: pending?.c ?? 0,
    rejected: rejected?.c ?? 0,
    perAngkatan: perAngkatan.results,
    perUnit: perUnit.results,
  });
});

// GET /api/admin/yearbook-data — formatted data for yearbook rendering
adminRoutes.get("/yearbook-data", async (c) => {
  const session = c.get("admin")!;
  const tahunLulus = c.req.query("tahunLulus");
  const angkatan = c.req.query("angkatan");
  const unit = c.req.query("unit");
  const gender = c.req.query("gender");
  const kelasNihai = c.req.query("kelasNihai");

  let whereSql = "WHERE status_verifikasi != 'rejected'";
  const params: (string | number)[] = [];

  if (session.role === "admin_putra") {
    whereSql += " AND gender = 'putra'";
  } else if (session.role === "admin_putri") {
    whereSql += " AND gender = 'putri'";
  } else if (session.role === "admin_unit") {
    whereSql += " AND gender = ? AND unit = ?";
    params.push(session.assignedGender === "all" ? "putra" : session.assignedGender, session.assignedUnit ?? "");
  }

  if (tahunLulus) { whereSql += " AND tahun_lulus = ?"; params.push(tahunLulus); }
  if (angkatan) { whereSql += " AND angkatan = ?"; params.push(angkatan); }
  if (unit) { whereSql += " AND unit = ?"; params.push(unit); }
  if (gender) { whereSql += " AND gender = ?"; params.push(gender); }
  if (kelasNihai) { whereSql += " AND kelas_nihai = ?"; params.push(kelasNihai); }

  const rows = await c.env.DB.prepare(
    `SELECT id, nama_lengkap, nama_panggilan, nama_pondok, gender, unit, kelas_nihai, angkatan, tahun_lulus, nama_angkatan, foto_url, motto, kesan_pesan, momen_berkesan, sosial_media, status_aktivitas, detail_aktivitas, tempat_lahir, tanggal_lahir FROM alumni ${whereSql} ORDER BY angkatan, unit, kelas_nihai, nama_lengkap`,
  )
    .bind(...params)
    .all();

  const data = rows.results.map((r: Record<string, unknown>) => ({
    ...r,
    sosial_media: r.sosial_media ? JSON.parse(r.sosial_media as string) : null,
  }));

  return c.json({ data });
});

// --- Manage Admins (super_admin only) ---
adminRoutes.get("/admins", requireSuperAdmin, async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, username, nama_lengkap, role, assigned_gender, assigned_unit, is_active, created_at FROM admins ORDER BY created_at DESC",
  ).all();
  return c.json({ data: rows.results });
});

adminRoutes.post("/admins", requireSuperAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validasi gagal", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const data = parsed.data;
  const id = ulid();
  const passwordHash = await hashPassword(data.password);

  try {
    await c.env.DB.prepare(
      "INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    )
      .bind(id, data.username, passwordHash, data.namaLengkap, data.role, data.assignedGender, data.assignedUnit ?? null)
      .run();
  } catch {
    return c.json({ error: "Username sudah digunakan" }, 409);
  }

  return c.json({ success: true, id, message: "Admin berhasil dibuat" }, 201);
});

adminRoutes.delete("/admins/:id", requireSuperAdmin, async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;

  if (id === session.adminId) return c.json({ error: "Tidak dapat menghapus diri sendiri" }, 400);

  await c.env.DB.prepare("DELETE FROM admins WHERE id = ?").bind(id).run();
  return c.json({ success: true, message: "Admin dihapus" });
});

adminRoutes.patch("/admins/:id/toggle", requireSuperAdmin, async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT is_active FROM admins WHERE id = ?").bind(id).first<{ is_active: number }>();
  if (!row) return c.json({ error: "Admin tidak ditemukan" }, 404);

  const newStatus = row.is_active ? 0 : 1;
  await c.env.DB.prepare("UPDATE admins SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(newStatus, id)
    .run();

  return c.json({ success: true, isActive: !!newStatus });
});

// POST /api/admin/alumni/:id/generate-edit-link — generate/regenerate edit link with optional expiry
adminRoutes.post("/alumni/:id/generate-edit-link", async (c) => {
  const id = c.req.param("id");
  const session = c.get("admin")!;
  const { expiryHours, oneTime } = await c.req.json<{ expiryHours?: number; oneTime?: boolean }>();

  const accessCheck = await fetchScopedAlumni(c.env.DB, session, id);
  if (!accessCheck) return c.json({ error: "Alumni di luar scope Anda" }, 403);

  const newToken = uuid();
  const expiresAt = expiryHours
    ? new Date(Date.now() + expiryHours * 3600_000).toISOString()
    : null;

  await c.env.DB.prepare("UPDATE alumni SET edit_token = ?, token_expires_at = ?, token_used = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(newToken, expiresAt, id)
    .run();

  await c.env.DB.prepare("INSERT INTO activity_logs (id, admin_id, alumni_id, action, details) VALUES (?, ?, ?, ?, ?)")
    .bind(ulid(), session.adminId, id, "GENERATE_EDIT_LINK", JSON.stringify({ expiryHours, oneTime }))
    .run();

  const link = `${c.env.APP_BASE_URL || ""}/edit/${newToken}`;
  return c.json({ success: true, link, token: newToken, expiresAt });
});

// GET /api/admin/activity-logs — activity history
adminRoutes.get("/activity-logs", async (c) => {
  const session = c.get("admin")!;
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;
  const action = c.req.query("action");

  let whereSql = "WHERE 1=1";
  const params: (string | number)[] = [];
  if (action) {
    whereSql += " AND action = ?";
    params.push(action);
  }

  const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM activity_logs ${whereSql}`)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT al.id, al.admin_id, al.alumni_id, al.action, al.details, al.created_at,
       a.nama_lengkap as admin_name, al2.nama_lengkap as alumni_name
     FROM activity_logs al
     LEFT JOIN admins a ON al.admin_id = a.id
     LEFT JOIN alumni al2 ON al.alumni_id = al2.id
     ${whereSql}
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all();

  return c.json({
    data: rows.results,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
