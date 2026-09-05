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

  const existing = await c.env.DB.prepare("SELECT id, nama_lengkap, nama_panggilan FROM alumni WHERE no_hp = ? AND deleted_at IS NULL")
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

  const existing = await c.env.DB.prepare("SELECT id FROM alumni WHERE no_hp = ? AND deleted_at IS NULL")
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

  const row = await c.env.DB.prepare("SELECT id, nama_lengkap, password_hash FROM alumni WHERE no_hp = ? AND deleted_at IS NULL")
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

  const row = await c.env.DB.prepare("SELECT * FROM alumni WHERE id = ? AND deleted_at IS NULL")
    .bind(payload.alumniId)
    .first();

  if (!row) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  const { password_hash, edit_token, pin_code, ...safeData } = row as Record<string, unknown>;

  // Include pending sensitive-field changes so the frontend can show "Menunggu persetujuan admin" badges
  const pendingRows = await c.env.DB.prepare(
    "SELECT field, new_value FROM pending_changes WHERE alumni_id = ? AND status = 'pending'",
  )
    .bind(payload.alumniId)
    .all<{ field: string; new_value: string }>();
  const pendingChanges = pendingRows.results.map((r) => ({ field: r.field, newValue: r.new_value }));

  return c.json({
    alumni: { ...safeData, sosial_media: safeData.sosial_media ? JSON.parse(safeData.sosial_media as string) : null },
    pendingChanges,
  });
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

  // Sensitive fields require admin approval — stored in pending_changes, not applied directly
  const SENSITIVE_SNAKE: Record<string, string> = {
    tempatLahir: "tempat_lahir",
    tanggalLahir: "tanggal_lahir",
    gender: "gender",
    angkatan: "angkatan",
  };

  // Read current values of sensitive fields for old_value capture
  const existing = await c.env.DB.prepare(
    "SELECT id, no_hp, gender, tempat_lahir, tanggal_lahir, angkatan FROM alumni WHERE id = ? AND deleted_at IS NULL",
  )
    .bind(payload.alumniId)
    .first<{ id: string; no_hp: string; gender: string; tempat_lahir: string; tanggal_lahir: string; angkatan: string }>();
  if (!existing) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  let normalizedPhone: string | undefined;
  if (data.noHp) {
    normalizedPhone = normalizePhone(data.noHp) ?? undefined;
    if (!normalizedPhone) return c.json({ error: "Nomor HP tidak valid" }, 400);
    if (normalizedPhone !== existing.no_hp) {
      const dup = await c.env.DB.prepare("SELECT id FROM alumni WHERE no_hp = ? AND id != ? AND deleted_at IS NULL")
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

  // Non-sensitive fields are applied directly to the alumni table
  const fieldMap: Record<string, string> = {
    namaLengkap: "nama_lengkap", namaPondok: "nama_pondok", namaPanggilan: "nama_panggilan",
    unit: "unit", kelasNihai: "kelas_nihai", tahunLulus: "tahun_lulus", tahunMasuk: "tahun_masuk",
    namaAngkatan: "nama_angkatan", alamat: "alamat", email: "email", motto: "motto",
    kesanPesan: "kesan_pesan", momenBerkesan: "momen_berkesan", fotoUrl: "foto_url",
    backgroundUrl: "background_url",
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
  if (data.password) {
    const newHash = await hashPassword(data.password);
    updates.push("password_hash = ?");
    values.push(newHash);
  }

  // Apply non-sensitive changes directly
  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(existing.id);
    await c.env.DB.prepare(`UPDATE alumni SET ${updates.join(", ")} WHERE id = ? AND deleted_at IS NULL`)
      .bind(...values)
      .run();
  }

  // Sensitive fields: create pending_changes entries instead of applying directly
  const pendingFields: string[] = [];
  const currentValues: Record<string, string> = {
    tempat_lahir: existing.tempat_lahir,
    tanggal_lahir: existing.tanggal_lahir,
    gender: existing.gender,
    angkatan: existing.angkatan,
  };

  for (const camel of Object.keys(SENSITIVE_SNAKE)) {
    if (camel in data) {
      const newVal = String((data as Record<string, unknown>)[camel] ?? "");
      const snake = SENSITIVE_SNAKE[camel];
      const oldVal = currentValues[snake] ?? "";
      if (newVal !== oldVal) {
        await c.env.DB.prepare(
          "INSERT INTO pending_changes (id, alumni_id, field, old_value, new_value, status, proposed_by) VALUES (?, ?, ?, ?, ?, 'pending', 'self')",
        )
          .bind(ulid(), existing.id, snake, oldVal, newVal)
          .run();
        pendingFields.push(snake);
      }
    }
  }

  // noHp is sensitive — route to pending_changes instead of applying directly
  if (normalizedPhone && normalizedPhone !== existing.no_hp) {
    await c.env.DB.prepare(
      "INSERT INTO pending_changes (id, alumni_id, field, old_value, new_value, status, proposed_by) VALUES (?, ?, ?, ?, ?, 'pending', 'self')",
    )
      .bind(ulid(), existing.id, "no_hp", existing.no_hp, normalizedPhone)
      .run();
    pendingFields.push("no_hp");
  }

  const hasChanges = updates.length > 0 || pendingFields.length > 0;
  if (!hasChanges) return c.json({ success: true, message: "Tidak ada perubahan" });

  await logActivity(c.env.DB, null, existing.id, "ALUMNI_EDIT_SELF", {
    appliedFields: updates.map((u) => u.split(" =")[0]),
    pendingFields,
  });

  // Set status back to pending so admin can re-approve after alumni edits
  await c.env.DB.prepare("UPDATE alumni SET status_verifikasi = 'pending' WHERE id = ?")
    .bind(existing.id)
    .run();

  // Notify all admins about the alumni edit for approval
  const alumniRow = await c.env.DB.prepare("SELECT nama_lengkap, gender FROM alumni WHERE id = ?")
    .bind(existing.id)
    .first<{ nama_lengkap: string; gender: string }>();
  if (alumniRow) {
    const targetRole = alumniRow.gender === "putra" ? "admin_putra" : "admin_putri";
    const pesan = pendingFields.length > 0
      ? `${alumniRow.nama_lengkap} mengubah biodata. Perubahan sensitif (${pendingFields.join(", ")}) perlu disetujui.`
      : `${alumniRow.nama_lengkap} telah mengubah biodata sendiri dan perlu diapprove kembali.`;
    await c.env.DB.prepare(
      "INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(ulid(), "system", "Alumni Mengubah Data", pesan, targetRole, alumniRow.gender, null)
      .run();
    // Also notify super_admin
    await c.env.DB.prepare(
      "INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(ulid(), "system", "Alumni Mengubah Data", pesan, "super_admin", "all", null)
      .run();
  }

  const message = pendingFields.length > 0
    ? "Biodata berhasil diperbarui. Beberapa perubahan menunggu persetujuan admin."
    : "Biodata berhasil diperbarui. Perubahan akan ditinjau oleh admin.";
  return c.json({ success: true, message, pendingFields });
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

// POST /api/alumni/by-token/:token/exchange — exchange edit token for alumni JWT
alumniRoutes.post("/by-token/:token/exchange", async (c) => {
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

  // Issue alumni JWT (valid for 24 hours) — does NOT mark token as used
  const jwt = await signJwt<AlumniSession>(
    { alumniId: row.id, type: "alumni" },
    c.env.JWT_SECRET,
    60 * 60 * 24,
  );

  return c.json({ token: jwt, alumniId: row.id });
});

// PUT /api/alumni/by-token/:token — update biodata by token (with expiry + one-time)
alumniRoutes.put("/by-token/:token", async (c) => {
  const token = c.req.param("token");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT id, no_hp, gender, tempat_lahir, tanggal_lahir, angkatan, token_expires_at, token_used FROM alumni WHERE edit_token = ?",
  )
    .bind(token)
    .first<{ id: string; no_hp: string; gender: string; tempat_lahir: string; tanggal_lahir: string; angkatan: string; token_expires_at: string | null; token_used: number }>();
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

  // Sensitive fields require admin approval — stored in pending_changes, not applied directly
  const SENSITIVE_SNAKE: Record<string, string> = {
    tempatLahir: "tempat_lahir",
    tanggalLahir: "tanggal_lahir",
    gender: "gender",
    angkatan: "angkatan",
  };

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  // Non-sensitive fields are applied directly to the alumni table
  const fieldMap: Record<string, string> = {
    namaLengkap: "nama_lengkap", namaPondok: "nama_pondok", namaPanggilan: "nama_panggilan",
    unit: "unit", kelasNihai: "kelas_nihai", tahunLulus: "tahun_lulus", tahunMasuk: "tahun_masuk",
    namaAngkatan: "nama_angkatan", alamat: "alamat", email: "email", motto: "motto",
    kesanPesan: "kesan_pesan", momenBerkesan: "momen_berkesan", fotoUrl: "foto_url",
    backgroundUrl: "background_url",
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
  if (data.password) {
    const newHash = await hashPassword(data.password);
    updates.push("password_hash = ?");
    values.push(newHash);
  }

  // Apply non-sensitive changes directly
  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(existing.id);
    await c.env.DB.prepare(`UPDATE alumni SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  // Sensitive fields: create pending_changes entries instead of applying directly
  const pendingFields: string[] = [];
  const currentValues: Record<string, string> = {
    tempat_lahir: existing.tempat_lahir,
    tanggal_lahir: existing.tanggal_lahir,
    gender: existing.gender,
    angkatan: existing.angkatan,
  };

  for (const camel of Object.keys(SENSITIVE_SNAKE)) {
    if (camel in data) {
      const newVal = String((data as Record<string, unknown>)[camel] ?? "");
      const snake = SENSITIVE_SNAKE[camel];
      const oldVal = currentValues[snake] ?? "";
      if (newVal !== oldVal) {
        await c.env.DB.prepare(
          "INSERT INTO pending_changes (id, alumni_id, field, old_value, new_value, status, proposed_by) VALUES (?, ?, ?, ?, ?, 'pending', 'token')",
        )
          .bind(ulid(), existing.id, snake, oldVal, newVal)
          .run();
        pendingFields.push(snake);
      }
    }
  }

  // noHp is sensitive — route to pending_changes instead of applying directly
  if (normalizedPhone && normalizedPhone !== existing.no_hp) {
    await c.env.DB.prepare(
      "INSERT INTO pending_changes (id, alumni_id, field, old_value, new_value, status, proposed_by) VALUES (?, ?, ?, ?, ?, 'pending', 'token')",
    )
      .bind(ulid(), existing.id, "no_hp", existing.no_hp, normalizedPhone)
      .run();
    pendingFields.push("no_hp");
  }

  const hasChanges = updates.length > 0 || pendingFields.length > 0;

  // Mark token as used (one-time)
  await c.env.DB.prepare("UPDATE alumni SET token_used = 1 WHERE id = ?")
    .bind(existing.id)
    .run();

  await logActivity(c.env.DB, null, existing.id, "ALUMNI_EDIT_TOKEN", {
    appliedFields: updates.map((u) => u.split(" =")[0]),
    pendingFields,
  });

  // Set status back to pending and notify admins (previously missing entirely)
  if (hasChanges) {
    await c.env.DB.prepare("UPDATE alumni SET status_verifikasi = 'pending' WHERE id = ?")
      .bind(existing.id)
      .run();

    const alumniRow = await c.env.DB.prepare("SELECT nama_lengkap, gender FROM alumni WHERE id = ?")
      .bind(existing.id)
      .first<{ nama_lengkap: string; gender: string }>();
    if (alumniRow) {
      const targetRole = alumniRow.gender === "putra" ? "admin_putra" : "admin_putri";
      const pesan = pendingFields.length > 0
        ? `${alumniRow.nama_lengkap} mengubah biodata via token. Perubahan sensitif (${pendingFields.join(", ")}) perlu disetujui.`
        : `${alumniRow.nama_lengkap} telah mengubah biodata via token dan perlu diapprove kembali.`;
      await c.env.DB.prepare(
        "INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(ulid(), "system", "Alumni Mengubah Data (Token)", pesan, targetRole, alumniRow.gender, null)
        .run();
      await c.env.DB.prepare(
        "INSERT INTO notifications (id, type, judul, pesan, target_role, target_gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(ulid(), "system", "Alumni Mengubah Data (Token)", pesan, "super_admin", "all", null)
        .run();
    }
  }

  const message = pendingFields.length > 0
    ? "Biodata berhasil diperbarui. Beberapa perubahan menunggu persetujuan admin."
    : "Biodata berhasil diperbarui";
  return c.json({ success: true, message, pendingFields });
});

// GET /api/alumni/profile/:id — public profile view with privacy masking
alumniRoutes.get("/profile/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, nama_lengkap, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, nama_angkatan, alamat, no_hp, email, motto, kesan_pesan, momen_berkesan, foto_url, background_url, sosial_media, status_aktivitas, detail_aktivitas, privacy_level, photo_privacy, status_verifikasi FROM alumni WHERE id = ? AND deleted_at IS NULL",
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
        nama_panggilan: row.nama_panggilan,
        gender: row.gender,
        angkatan: row.angkatan,
        tahun_lulus: row.tahun_lulus,
        privacy_level: "private",
        photo_privacy: photoPrivacy,
        foto_url: photoPrivacy === "public" ? row.foto_url : null,
        background_url: row.background_url,
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

// GET /api/alumni/angkatan-list — distinct angkatan & tahun_lulus values (gender-scoped by own gender)
alumniRoutes.get("/angkatan-list", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = auth.slice(7);
  const payload = await verifyJwt<AlumniSession>(token, c.env.JWT_SECRET).catch(() => null);
  if (!payload || payload.type !== "alumni") return c.json({ error: "Unauthorized" }, 401);

  const alumni = await c.env.DB.prepare("SELECT gender FROM alumni WHERE id = ?")
    .bind(payload.alumniId)
    .first<{ gender: string }>();
  if (!alumni) return c.json({ error: "Alumni tidak ditemukan" }, 404);

  const angkatanRows = await c.env.DB.prepare(
    `SELECT DISTINCT angkatan FROM alumni WHERE status_verifikasi = 'verified' AND deleted_at IS NULL AND gender = ? AND angkatan IS NOT NULL AND angkatan != '' ORDER BY angkatan`,
  )
    .bind(alumni.gender)
    .all<{ angkatan: string }>();
  const tahunLulusRows = await c.env.DB.prepare(
    `SELECT DISTINCT tahun_lulus FROM alumni WHERE status_verifikasi = 'verified' AND deleted_at IS NULL AND gender = ? AND tahun_lulus IS NOT NULL ORDER BY tahun_lulus`,
  )
    .bind(alumni.gender)
    .all<{ tahun_lulus: number }>();

  return c.json({
    angkatan: angkatanRows.results.map((r) => r.angkatan),
    tahunLulus: tahunLulusRows.results.map((r) => r.tahun_lulus),
  });
});

// GET /api/alumni/yearbook — yearbook data for alumni (gender-scoped by own gender, server-side filtered)
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

  const tahunLulus = c.req.query("tahunLulus");
  const angkatan = c.req.query("angkatan");
  const unit = c.req.query("unit");
  const page = Math.max(parseInt(c.req.query("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "50", 10), 1), 200);
  const offset = (page - 1) * limit;

  let whereSql = "WHERE status_verifikasi = 'verified' AND deleted_at IS NULL AND gender = ?";
  const params: (string | number)[] = [alumni.gender];
  if (tahunLulus) { whereSql += " AND tahun_lulus = ?"; params.push(tahunLulus); }
  if (angkatan) { whereSql += " AND angkatan = ?"; params.push(angkatan); }
  if (unit) { whereSql += " AND unit = ?"; params.push(unit); }

  const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM alumni ${whereSql}`)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT id, nama_lengkap, nama_panggilan, nama_pondok, gender, unit, kelas_nihai, angkatan, tahun_lulus, nama_angkatan, foto_url, motto, kesan_pesan, momen_berkesan, sosial_media, status_aktivitas, detail_aktivitas, tempat_lahir, tanggal_lahir, privacy_level, photo_privacy
     FROM alumni ${whereSql} ORDER BY angkatan, unit, kelas_nihai, nama_lengkap LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all();

  const data = rows.results.map((r: Record<string, unknown>) => {
    const privacy = r.privacy_level as string;
    const photoPrivacy = r.photo_privacy as string;
    const isPrivate = privacy === "private";
    return {
      ...r,
      sosial_media: isPrivate ? null : (r.sosial_media ? JSON.parse(r.sosial_media as string) : null),
      motto: isPrivate ? null : r.motto,
      kesan_pesan: isPrivate ? null : r.kesan_pesan,
      momen_berkesan: isPrivate ? null : r.momen_berkesan,
      status_aktivitas: isPrivate ? null : r.status_aktivitas,
      detail_aktivitas: isPrivate ? null : r.detail_aktivitas,
      tempat_lahir: isPrivate ? null : r.tempat_lahir,
      tanggal_lahir: isPrivate ? null : r.tanggal_lahir,
      foto_url: isPrivate && photoPrivacy === "private" ? null : r.foto_url,
    };
  });

  return c.json({ data, total, page, limit });
});
