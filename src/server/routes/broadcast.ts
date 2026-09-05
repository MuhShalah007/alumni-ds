import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { authMiddleware } from "../middleware/auth";
import { broadcastSchema } from "../utils/validation";
import { ulid } from "../utils/id";

export const broadcastRoutes = new Hono<AppContext>();

broadcastRoutes.use("*", authMiddleware);

// POST /api/admin/broadcasts — create broadcast log & generate WhatsApp links
broadcastRoutes.post("/broadcasts", async (c) => {
  const session = c.get("admin")!;
  const body = await c.req.json();
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validasi gagal", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const data = parsed.data;

  // Scope check: admin_putra can only target putra, admin_putri only putri
  if (session.role === "admin_putra" && data.targetGender === "putri") {
    return c.json({ error: "Anda tidak dapat broadcast ke alumni putri" }, 403);
  }
  if (session.role === "admin_putri" && data.targetGender === "putra") {
    return c.json({ error: "Anda tidak dapat broadcast ke alumni putri" }, 403);
  }

  // Build query for target alumni
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

  if (data.targetGender !== "all") {
    whereSql += " AND gender = ?";
    params.push(data.targetGender);
  }
  if (data.targetUnit) { whereSql += " AND unit = ?"; params.push(data.targetUnit); }
  if (data.targetAngkatan) { whereSql += " AND angkatan = ?"; params.push(data.targetAngkatan); }
  if (data.targetTahunLulus) { whereSql += " AND tahun_lulus = ?"; params.push(data.targetTahunLulus); }

  const rows = await c.env.DB.prepare(
    `SELECT id, nama_lengkap, nama_panggilan, no_hp FROM alumni ${whereSql} ORDER BY nama_lengkap`,
  )
    .bind(...params)
    .all();

  // Generate wa.me links
  const waLinks = rows.results.map((r: Record<string, unknown>) => {
    const phone = (r.no_hp as string).replace(/[^\d]/g, "");
    const personalizedPesan = data.pesan
      .replace(/\{nama\}/g, r.nama_lengkap as string)
      .replace(/\{panggilan\}/g, r.nama_panggilan as string);
    const text = encodeURIComponent(personalizedPesan);
    return {
      id: r.id,
      nama: r.nama_lengkap,
      waLink: `https://wa.me/${phone}?text=${text}`,
    };
  });

  // Save broadcast log
  const broadcastId = ulid();
  await c.env.DB.prepare(
    "INSERT INTO broadcasts (id, judul, pesan, target_gender, target_unit, target_angkatan, target_tahun_lulus, channel, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      broadcastId,
      data.judul,
      data.pesan,
      data.targetGender,
      data.targetUnit ?? null,
      data.targetAngkatan ?? null,
      data.targetTahunLulus ?? null,
      data.channel,
      session.adminId,
    )
    .run();

  return c.json({
    success: true,
    broadcastId,
    totalTargets: waLinks.length,
    links: waLinks,
  });
});

// GET /api/admin/broadcasts — list broadcast history
broadcastRoutes.get("/broadcasts", async (c) => {
  const session = c.get("admin")!;
  let whereSql = "WHERE 1=1";
  const params: string[] = [];

  if (session.role !== "super_admin") {
    whereSql += " AND created_by = ?";
    params.push(session.adminId);
  }

  const rows = await c.env.DB.prepare(
    `SELECT b.*, a.nama_lengkap as creator_name FROM broadcasts b LEFT JOIN admins a ON b.created_by = a.id ${whereSql} ORDER BY b.created_at DESC LIMIT 50`,
  )
    .bind(...params)
    .all();

  return c.json({ data: rows.results });
});
