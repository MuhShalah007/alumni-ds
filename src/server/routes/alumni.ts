import { Hono } from "hono";
import { normalizePhone, maskPhone } from "../utils/phone";
import { sanitizeText } from "../utils/sanitize";
import { ulid, uuid } from "../utils/id";
import { hashPassword, verifyPassword } from "../utils/password";
import { signJwt, verifyJwt } from "../utils/jwt";
import { submitAlumniSchema, updateByTokenSchema, alumniLoginSchema } from "../utils/validation";
import { rateLimit } from "../middleware/rateLimit";
import { isValidUnit } from "@shared/constants";
import type { AppContext } from "../db/client";

interface AlumniSession {
  alumniId: string;
  type: string;
  iat?: number;
  exp?: number;
}

export const alumniRoutes = new Hono<AppContext>();

// Helper: log activity
async function logActivity(db: D1Database, adminId: string | null, alumniId: string | null, action: string, details: Record<string, unknown>) {
  await db.prepare("INSERT INTO activity_logs (id, admin_id, alumni_id, action, details) VALUES (?, ?, ?, ?, ?)")
    .bind(ulid(), adminId, alumniId, action, JSON.stringify(details))
    .run();
}

// POST /api/alumni/check-phone — check for duplicate phone
alumniRoutes.post("/check-phone", rateLimit({ prefix: "check-phone", maxRequests: 10, windowMs: 60_000 }), async (c) => {
  const body = await c.req.json<{ noHp?: string }>();
  const normalized = normalizePhone(body.noHp ?? "");
  if (!normalized) {
    return c.json({ error: "Nomor HP tidak valid" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id, nama_lengkap, nama_panggilan FROM alumni WHERE no_hp = ?")
    .bind(normalized)
    .first<{ id: string; nama_lengkap: string; nama_panggilan: string }>();

  if (existing) {
    const nameInitial = existing.nama_lengkap.charAt(0) + "***";
    return c.json({
      available: false,
      existing: { id: existing.id, namaPanggilan: existing.nama_panggilan, nameInitial },
    });
  }

  return c.json({ available: true });
});

// POST /api/alumni/submit — submit new biodata (with password for self-login)
alumniRoutes.post("/submit", rateLimit({ prefix: "submit", maxRequests: 5, windowMs: 600_000 }), async (c) => {
  const body = await c.req.json();
  const parsed = submitAlumniSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validasi gagal", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const data = parsed.data;
  const normalizedPhone = normalizePhone(data.noHp);
  if (!normalizedPhone) {
    return c.json({ error: "Nomor HP tidak valid" }, 400);
  }

  if (!isValidUnit(data.gender, data.unit)) {
    return c.json({ error: `Unit ${data.unit} tidak valid untuk gender ${data.gender}` }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM alumni WHERE no_hp = ?")
    .bind(normalizedPhone)
    .first();
  if (existing) {
    return c.json({ error: "Nomor HP sudah terdaftar. Silakan login atau hubungi admin." }, 409);
  }

  const id = ulid();
  const editToken = uuid();
  const passwordHash = await hashPassword(data.password);

  await c.env.DB.prepare(
    `INSERT INTO alumni (id, nama_lengkap, nama_pondok, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, tahun_masuk, nama_angkatan, alamat, no_hp, email, motto, kesan_pesan, momen_berkesan, foto_url, sosial_media, status_aktivitas, detail_aktivitas, privacy_level, photo_privacy, edit_token, pin_code, password_hash, status_verifikasi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      data.namaLengkap,
      data.namaPondok ?? null,
      data.namaPanggilan,
      data.tempatLahir,
      data.tanggalLahir,
      data.gender,
      data.unit,
      data.kelasNihai,
      data.angkatan,
      data.tahunLulus,
      data.tahunMasuk ?? null,
      data.namaAngkatan ?? null,
      data.alamat,
      normalizedPhone,
      data.email ?? null,
      sanitizeText(data.motto),
      sanitizeText(data.kesanPesan),
      sanitizeText(data.momenBerkesan),
      data.fotoUrl ?? null,
      data.sosialMedia ? JSON.stringify(data.sosialMedia) : null,
      data.statusAktivitas || null,
      data.detailAktivitas ?? null,
      data.privacyLevel,
      data.photoPrivacy,
      editToken,
      data.pinCode ?? null,
      passwordHash,
      "pending",
    )
    .run();

  await logActivity(c.env.DB, null, id, "ALUMNI_REGISTER", { nama: data.namaLengkap, phone: normalizedPhone });

  // Generate alumni JWT for immediate login
  const token = await signJwt({ alumniId: id, type: "alumni" }, c.env.JWT_SECRET);

  return c.json({ success: true, id, editToken, token, message: "Biodata berhasil disimpan" }, 201);
});

// POST /api/alumni/login — alumni login with phone + password
alumniRoutes.post("/login", rateLimit({ prefix: "alumni-login", maxRequests: 10, windowMs: 60_000 }), async (c) => {
  const body = await c.req.json();
  const parsed = alumniLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validasi gagal", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const normalizedPhone = normalizePhone(parsed.data.noHp);
  if (!normalizedPhone) {
    return c.json({ error: "Nomor HP tidak valid" }, 400);
  }

  const row = await c.env.DB.prepare("SELECT id, nama_lengkap, password_hash FROM alumni WHERE no_hp = ?")
    .bind(normalizedPhone)
    .first<{ id: string; nama_lengkap: string; password_hash: string | null }>();

  if (!row || !row.password_hash) {
    return c.json({ error: "Nomor HP atau password salah" }, 401);
  }

  const valid = await verifyPassword(parsed.data.password, row.password_hash);
  if (!valid) {
    return c.json({ error: "Nomor HP atau password salah" }, 401);
  }

  const token = await signJwt({ alumniId: row.id, type: "alumni" }, c.env.JWT_SECRET);
  return c.json({ success: true, token, alumni: { id: row.id, namaLengkap: row.nama_lengkap } });
});

// GET /api/alumni/me — get own data (alumni JWT auth)
alumniRoutes.get("/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = auth.slice(7);
  const payload = await verifyJwt<AlumniSession>(token, c.env.JWT_SECRET).catch(() => null);
  if (!payload || payload.type !== "alumni") return c.json({ error: "Unauthorized" }, 401);

  const row = await c.env.DB.prepare("SELECT * FROM alumni WHERE id = ?")
    .bind(payload.alumniId)
    .first();

  if (!row) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  const { password_hash, edit_token, pin_code, ...safeData } = row as Record<string, unknown>;
  return c.json({ alumni: { ...safeData, sosial_media: safeData.sosial_media ? JSON.parse(safeData.sosial_media as string) : null } });
});

// PUT /api/alumni/me — update own data (alumni JWT auth)
alumniRoutes.put("/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = auth.slice(7);
  const payload = await verifyJwt<AlumniSession>(token, c.env.JWT_SECRET).catch(() => null);
  if (!payload || payload.type !== "alumni") return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const parsed = updateByTokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validasi gagal", details: parsed.error.flatten().fieldErrors }, 400);
  }
  const data = parsed.data;

  const existing = await c.env.DB.prepare("SELECT id, no_hp, gender FROM alumni WHERE id = ?")
    .bind(payload.alumniId)
    .first<{ id: string; no_hp: string; gender: string }>();
  if (!existing) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  let normalizedPhone: string | undefined;
  if (data.noHp) {
    normalizedPhone = normalizePhone(data.noHp) ?? undefined;
    if (!normalizedPhone) return c.json({ error: "Nomor HP tidak valid" }, 400);
    if (normalizedPhone !== existing.no_hp) {
      const dup = await c.env.DB.prepare("SELECT id FROM alumni WHERE no_hp = ? AND id != ?")
        .bind(normalizedPhone, existing.id)
        .first();
      if (dup) return c.json({ error: "Nomor HP sudah digunakan alumni lain" }, 409);
    }
  }

  if (data.unit && data.gender && !isValidUnit(data.gender as "putra" | "putri", data.unit)) {
    return c.json({ error: "Unit tidak valid untuk gender tersebut" }, 400);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  const fieldMap: Record<string, string> = {
    namaLengkap: "nama_lengkap", namaPondok: "nama_pondok", namaPanggilan: "nama_panggilan",
    tempatLahir: "tempat_lahir", tanggalLahir: "tanggal_lahir", gender: "gender", unit: "unit",
    kelasNihai: "kelas_nihai", angkatan: "angkatan", tahunLulus: "tahun_lulus", tahunMasuk: "tahun_masuk",
    namaAngkatan: "nama_angkatan", alamat: "alamat", email: "email", motto: "motto",
    kesanPesan: "kesan_pesan", momenBerkesan: "momen_berkesan", fotoUrl: "foto_url",
    statusAktivitas: "status_aktivitas", detailAktivitas: "detail_aktivitas",
    privacyLevel: "privacy_level", photoPrivacy: "photo_privacy", pinCode: "pin_code",
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in data) {
      const val = (data as Record<string, unknown>)[camel];
      const sanitized = ["motto", "kesanPesan", "momenBerkesan"].includes(camel) && typeof val === "string"
        ? sanitizeText(val) : val;
      updates.push(`${snake} = ?`);
      values.push(sanitized as string | number | null);
    }
  }

  if (data.sosialMedia !== undefined) {
    updates.push("sosial_media = ?");
    values.push(data.sosialMedia ? JSON.stringify(data.sosialMedia) : null);
  }
  if (normalizedPhone) {
    updates.push("no_hp = ?");
    values.push(normalizedPhone);
  }
  if (data.password) {
    const newHash = await hashPassword(data.password);
    updates.push("password_hash = ?");
    values.push(newHash);
  }

  if (updates.length === 0) return c.json({ success: true, message: "Tidak ada perubahan" });

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(existing.id);

  await c.env.DB.prepare(`UPDATE alumni SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  await logActivity(c.env.DB, null, existing.id, "ALUMNI_EDIT_SELF", { fields: Object.keys(data) });

  // Set status back to pending so admin can re-approve after alumni edits
  await c.env.DB.prepare("UPDATE alumni SET status_verifikasi = 'pending' WHERE id = ?")
    .bind(existing.id)
    .run();

  // Notify all admins about the alumni edit for approval
  const alumniRow = await c.env.DB.prepare("SELECT nama_lengkap, gender FROM alumni WHERE id = ?")
    .bind(existing.id)
    .first<{ nama_lengkap: string; gender: string }>();
  if (alumniRow) {
    const notifId = ulid();
    const targetRole = alumniRow.gender === "putra" ? "admin_putra" : "admin_putri";
    await c.env.DB.prepare(
      "INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        notifId,
        "system",
        "Alumni Mengubah Data",
        `${alumniRow.nama_lengkap} telah mengubah biodata sendiri dan perlu diapprove kembali.`,
        targetRole,
        alumniRow.gender,
        null,
      )
      .run();
    // Also notify super_admin
    await c.env.DB.prepare(
      "INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        ulid(),
        "system",
        "Alumni Mengubah Data",
        `${alumniRow.nama_lengkap} telah mengubah biodata sendiri dan perlu diapprove kembali.`,
        "super_admin",
        "all",
        null,
      )
      .run();
  }

  return c.json({ success: true, message: "Biodata berhasil diperbarui. Perubahan akan ditinjau oleh admin." });
});

// GET /api/alumni/by-token/:token — get alumni data for self-editing (with expiry + one-time check)
alumniRoutes.get("/by-token/:token", async (c) => {
  const token = c.req.param("token");
  const row = await c.env.DB.prepare(
    "SELECT id, token_expires_at, token_used FROM alumni WHERE edit_token = ?",
  )
    .bind(token)
    .first<{ id: string; token_expires_at: string | null; token_used: number }>();

  if (!row) return c.json({ error: "Token tidak valid" }, 404);

  // Check one-time use
  if (row.token_used === 1) return c.json({ error: "Link edit sudah digunakan. Silakan login dengan nomor HP dan password Anda." }, 410);

  // Check expiry
  if (row.token_expires_at) {
    const expiry = new Date(row.token_expires_at);
    if (expiry < new Date()) return c.json({ error: "Link edit sudah kedaluwarsa. Silakan login atau minta link baru kepada admin." }, 410);
  }

  const fullRow = await c.env.DB.prepare("SELECT * FROM alumni WHERE id = ?")
    .bind(row.id)
    .first();
  const { password_hash, ...safeData } = fullRow as Record<string, unknown>;
  return c.json({ alumni: { ...safeData, sosial_media: safeData.sosial_media ? JSON.parse(safeData.sosial_media as string) : null } });
});

// PUT /api/alumni/by-token/:token — update biodata by token (with expiry + one-time)
alumniRoutes.put("/by-token/:token", async (c) => {
  const token = c.req.param("token");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare("SELECT id, no_hp, gender, token_expires_at, token_used FROM alumni WHERE edit_token = ?")
    .bind(token)
    .first<{ id: string; no_hp: string; gender: string; token_expires_at: string | null; token_used: number }>();
  if (!existing) return c.json({ error: "Token tidak valid" }, 404);

  if (existing.token_used === 1) return c.json({ error: "Link edit sudah digunakan" }, 410);
  if (existing.token_expires_at) {
    const expiry = new Date(existing.token_expires_at);
    if (expiry < new Date()) return c.json({ error: "Link edit sudah kedaluwarsa" }, 410);
  }

  const parsed = updateByTokenSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Validasi gagal", details: parsed.error.flatten().fieldErrors }, 400);
  const data = parsed.data;

  let normalizedPhone: string | undefined;
  if (data.noHp) {
    normalizedPhone = normalizePhone(data.noHp) ?? undefined;
    if (!normalizedPhone) return c.json({ error: "Nomor HP tidak valid" }, 400);
    if (normalizedPhone !== existing.no_hp) {
      const dup = await c.env.DB.prepare("SELECT id FROM alumni WHERE no_hp = ? AND id != ?")
        .bind(normalizedPhone, existing.id)
        .first();
      if (dup) return c.json({ error: "Nomor HP sudah digunakan alumni lain" }, 409);
    }
  }

  if (data.unit && data.gender && !isValidUnit(data.gender as "putra" | "putri", data.unit)) {
    return c.json({ error: "Unit tidak valid untuk gender tersebut" }, 400);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  const fieldMap: Record<string, string> = {
    namaLengkap: "nama_lengkap", namaPondok: "nama_pondok", namaPanggilan: "nama_panggilan",
    tempatLahir: "tempat_lahir", tanggalLahir: "tanggal_lahir", gender: "gender", unit: "unit",
    kelasNihai: "kelas_nihai", angkatan: "angkatan", tahunLulus: "tahun_lulus", tahunMasuk: "tahun_masuk",
    namaAngkatan: "nama_angkatan", alamat: "alamat", email: "email", motto: "motto",
    kesanPesan: "kesan_pesan", momenBerkesan: "momen_berkesan", fotoUrl: "foto_url",
    statusAktivitas: "status_aktivitas", detailAktivitas: "detail_aktivitas",
    privacyLevel: "privacy_level", photoPrivacy: "photo_privacy", pinCode: "pin_code",
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in data) {
      const val = (data as Record<string, unknown>)[camel];
      const sanitized = ["motto", "kesanPesan", "momenBerkesan"].includes(camel) && typeof val === "string"
        ? sanitizeText(val) : val;
      updates.push(`${snake} = ?`);
      values.push(sanitized as string | number | null);
    }
  }

  if (data.sosialMedia !== undefined) {
    updates.push("sosial_media = ?");
    values.push(data.sosialMedia ? JSON.stringify(data.sosialMedia) : null);
  }
  if (normalizedPhone) {
    updates.push("no_hp = ?");
    values.push(normalizedPhone);
  }
  if (data.password) {
    const newHash = await hashPassword(data.password);
    updates.push("password_hash = ?");
    values.push(newHash);
  }

  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(existing.id);
    await c.env.DB.prepare(`UPDATE alumni SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  // Mark token as used (one-time)
  await c.env.DB.prepare("UPDATE alumni SET token_used = 1 WHERE id = ?")
    .bind(existing.id)
    .run();

  await logActivity(c.env.DB, null, existing.id, "ALUMNI_EDIT_TOKEN", { fields: Object.keys(data) });

  return c.json({ success: true, message: "Biodata berhasil diperbarui" });
});

// GET /api/alumni/profile/:id — public profile view with privacy masking
alumniRoutes.get("/profile/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, nama_lengkap, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, nama_angkatan, alamat, no_hp, email, motto, kesan_pesan, momen_berkesan, foto_url, sosial_media, status_aktivitas, detail_aktivitas, privacy_level, photo_privacy, status_verifikasi FROM alumni WHERE id = ?",
  )
    .bind(id)
    .first();

  if (!row) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  const privacy = row.privacy_level as string;
  const photoPrivacy = row.photo_privacy as string;

  // Private profile: only show name, angkatan, tahun_lulus
  if (privacy === "private") {
    return c.json({
      alumni: {
        id: row.id,
        nama_lengkap: row.nama_lengkap,
        angkatan: row.angkatan,
        tahun_lulus: row.tahun_lulus,
        privacy_level: "private",
        photo_privacy: photoPrivacy,
        foto_url: null, // never show photo on private profile
      },
    });
  }

  // Public or alumni_only: show full data but mask phone
  const result = {
    ...row,
    no_hp: maskPhone(row.no_hp as string),
    sosial_media: row.sosial_media ? JSON.parse(row.sosial_media as string) : null,
    // Hide photo if photo_privacy is private
    foto_url: photoPrivacy === "private" ? null : row.foto_url,
  };

  return c.json({ alumni: result });
});

// GET /api/alumni/yearbook — yearbook data for alumni (gender-scoped by own gender)
alumniRoutes.get("/yearbook", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = auth.slice(7);
  const payload = await verifyJwt<AlumniSession>(token, c.env.JWT_SECRET).catch(() => null);
  if (!payload || payload.type !== "alumni") return c.json({ error: "Unauthorized" }, 401);

  const alumni = await c.env.DB.prepare("SELECT gender FROM alumni WHERE id = ?")
    .bind(payload.alumniId)
    .first<{ gender: string }>();
  if (!alumni) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  const rows = await c.env.DB.prepare(
    `SELECT id, nama_lengkap, nama_panggilan, nama_pondok, gender, unit, kelas_nihai, angkatan, tahun_lulus, nama_angkatan, foto_url, motto, kesan_pesan, momen_berkesan, sosial_media, status_aktivitas, detail_aktivitas, tempat_lahir, tanggal_lahir
     FROM alumni WHERE status_verifikasi != 'rejected' AND gender = ? ORDER BY angkatan, unit, kelas_nihai, nama_lengkap`,
  )
    .bind(alumni.gender)
    .all();

  const data = rows.results.map((r: Record<string, unknown>) => ({
    ...r,
    sosial_media: r.sosial_media ? JSON.parse(r.sosial_media as string) : null,
  }));

  return c.json({ data });
});
