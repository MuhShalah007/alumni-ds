import { Hono } from "hono";
import type { AppContext, Database } from "../db/client";
import { authMiddleware } from "../middleware/auth";
import { alumniScope } from "../utils/scope";
import { normalizePhone } from "../utils/phone";
import { isValidUnit } from "@shared/constants";
import { ulid, uuid } from "../utils/id";

export const excelRoutes = new Hono<AppContext>();

excelRoutes.use("*", authMiddleware);

// GET /api/admin/export/excel — returns JSON array for client-side XLSX generation
excelRoutes.get("/export/excel", async (c) => {
  const session = c.get("admin")!;
  const tahunLulus = c.req.query("tahunLulus");
  const angkatan = c.req.query("angkatan");
  const unit = c.req.query("unit");
  const gender = c.req.query("gender");
  const status = c.req.query("status");

  let whereSql = "WHERE 1=1";
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
  if (status) { whereSql += " AND status_verifikasi = ?"; params.push(status); }

  const rows = await c.env.DB.prepare(
    `SELECT nama_lengkap, nama_pondok, nama_panggilan, gender, unit, kelas_nihai, angkatan, tahun_lulus, tahun_masuk, tempat_lahir, tanggal_lahir, alamat, no_hp, email, motto, kesan_pesan, momen_berkesan, foto_url, status_aktivitas, detail_aktivitas, privacy_level, status_verifikasi FROM alumni ${whereSql} ORDER BY angkatan, unit, nama_lengkap`,
  )
    .bind(...params)
    .all();

  const data = rows.results.map((r: Record<string, unknown>, i: number) => ({
    no: i + 1,
    namaLengkap: r.nama_lengkap,
    namaPondok: r.nama_pondok,
    panggilan: r.nama_panggilan,
    jenisKelamin: r.gender,
    unit: r.unit,
    kelasNihai: r.kelas_nihai,
    angkatan: r.angkatan,
    tahunLulus: r.tahun_lulus,
    tahunMasuk: r.tahun_masuk,
    ttl: `${r.tempat_lahir}, ${r.tanggal_lahir}`,
    alamat: r.alamat,
    noHp: r.no_hp,
    email: r.email,
    motto: r.motto,
    kesanPesan: r.kesan_pesan,
    momenBerkesan: r.momen_berkesan,
    fotoUrl: r.foto_url,
    statusAktivitas: r.status_aktivitas,
    detailAktivitas: r.detail_aktivitas,
    privacyLevel: r.privacy_level,
    status: r.status_verifikasi,
  }));

  return c.json({ data });
});

// POST /api/admin/import/excel — batch import from JSON (parsed client-side from XLSX)
excelRoutes.post("/import/excel", async (c) => {
  const session = c.get("admin")!;
  const { rows, duplicateStrategy } = await c.req.json<{
    rows: Record<string, unknown>[];
    duplicateStrategy: "skip" | "update";
  }>();

  if (!Array.isArray(rows)) return c.json({ error: "Format data tidak valid" }, 400);

  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const gender = String(row.jenisKelamin || row.gender || "").toLowerCase();
      const unit = String(row.unit || "");
      const noHp = normalizePhone(String(row.noHp || ""));

      if (!gender || !["putra", "putri"].includes(gender)) {
        results.errors.push(`Baris ${i + 1}: Jenis Kelamin tidak valid`);
        continue;
      }
      if (!unit || !isValidUnit(gender as "putra" | "putri", unit)) {
        results.errors.push(`Baris ${i + 1}: Unit ${unit} tidak valid untuk jenis kelamin ${gender}`);
        continue;
      }
      if (!noHp) {
        results.errors.push(`Baris ${i + 1}: Nomor HP tidak valid`);
        continue;
      }

      // Check existing
      const existing = await c.env.DB.prepare("SELECT id FROM alumni WHERE no_hp = ?").bind(noHp).first<{ id: string }>();

      if (existing) {
        if (duplicateStrategy === "skip") {
          results.skipped++;
          continue;
        }
        // Update existing
        await c.env.DB.prepare(
          "UPDATE alumni SET nama_lengkap=?, nama_pondok=?, nama_panggilan=?, tempat_lahir=?, tanggal_lahir=?, gender=?, unit=?, kelas_nihai=?, angkatan=?, tahun_lulus=?, tahun_masuk=?, alamat=?, email=?, motto=?, kesan_pesan=?, momen_berkesan=?, status_aktivitas=?, detail_aktivitas=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
          .bind(
            String(row.namaLengkap || row.nama_lengkap || ""),
            (row.namaPondok || row.nama_pondok) ?? null,
            String(row.panggilan || row.nama_panggilan || ""),
            String(row.tempatLahir || row.tempat_lahir || ""),
            String(row.tanggalLahir || row.tanggal_lahir || ""),
            gender,
            unit,
            String(row.kelasNihai || row.kelas_nihai || ""),
            String(row.angkatan || "").padStart(2, "0"),
            Number(row.tahunLulus || row.tahun_lulus || 0),
            (row.tahunMasuk || row.tahun_masuk) ?? null,
            String(row.alamat || ""),
            (row.email) ?? null,
            String(row.motto || ""),
            String(row.kesanPesan || row.kesan_pesan || ""),
            String(row.momenBerkesan || row.momen_berkesan || ""),
            (row.statusAktivitas || row.status_aktivitas) ?? null,
            (row.detailAktivitas || row.detail_aktivitas) ?? null,
            existing.id,
          )
          .run();
        results.updated++;
      } else {
        // Insert new
        const id = ulid();
        await c.env.DB.prepare(
          `INSERT INTO alumni (id, nama_lengkap, nama_pondok, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, tahun_masuk, alamat, no_hp, email, motto, kesan_pesan, momen_berkesan, status_aktivitas, detail_aktivitas, privacy_level, edit_token, status_verifikasi)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, 'pending')`,
        )
          .bind(
            id,
            String(row.namaLengkap || row.nama_lengkap || ""),
            (row.namaPondok || row.nama_pondok) ?? null,
            String(row.panggilan || row.nama_panggilan || ""),
            String(row.tempatLahir || row.tempat_lahir || ""),
            String(row.tanggalLahir || row.tanggal_lahir || ""),
            gender,
            unit,
            String(row.kelasNihai || row.kelas_nihai || ""),
            String(row.angkatan || "").padStart(2, "0"),
            Number(row.tahunLulus || row.tahun_lulus || 0),
            (row.tahunMasuk || row.tahun_masuk) ?? null,
            String(row.alamat || ""),
            noHp,
            (row.email) ?? null,
            String(row.motto || ""),
            String(row.kesanPesan || row.kesan_pesan || ""),
            String(row.momenBerkesan || row.momen_berkesan || ""),
            (row.statusAktivitas || row.status_aktivitas) ?? null,
            (row.detailAktivitas || row.detail_aktivitas) ?? null,
            uuid(),
          )
          .run();
        results.inserted++;
      }
    } catch (err) {
      results.errors.push(`Baris ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Log activity
  await c.env.DB.prepare("INSERT INTO activity_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)")
    .bind(ulid(), session.adminId, "IMPORT_EXCEL", JSON.stringify(results))
    .run();

  return c.json(results);
});

// GET /api/admin/export/template — returns column definitions for Excel template
excelRoutes.get("/export/template", (c) => {
  return c.json({
    columns: [
      { header: "Nama Lengkap", key: "namaLengkap", width: 30 },
      { header: "Nama Pondok", key: "namaPondok", width: 25 },
      { header: "Panggilan", key: "panggilan", width: 15 },
      { header: "Gender", key: "gender", width: 8 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Kelas Nihai", key: "kelasNihai", width: 12 },
      { header: "Angkatan", key: "angkatan", width: 10 },
      { header: "Tahun Lulus", key: "tahunLulus", width: 12 },
      { header: "Tahun Masuk", key: "tahunMasuk", width: 12 },
      { header: "Tempat Lahir", key: "tempatLahir", width: 20 },
      { header: "Tanggal Lahir", key: "tanggalLahir", width: 15 },
      { header: "Alamat", key: "alamat", width: 40 },
      { header: "No HP", key: "noHp", width: 18 },
      { header: "Email", key: "email", width: 25 },
      { header: "Motto", key: "motto", width: 40 },
      { header: "Kesan Pesan", key: "kesanPesan", width: 50 },
      { header: "Momen Berkesan", key: "momenBerkesan", width: 50 },
      { header: "Status Aktivitas", key: "statusAktivitas", width: 15 },
      { header: "Detail Aktivitas", key: "detailAktivitas", width: 25 },
    ],
  });
});
