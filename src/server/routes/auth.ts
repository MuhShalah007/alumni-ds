import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { verifyPassword } from "../utils/password";
import { signJwt } from "../utils/jwt";
import { adminLoginSchema } from "../utils/validation";
import { rateLimit } from "../middleware/rateLimit";
import type { AdminSession } from "@shared/constants";

export const authRoutes = new Hono<AppContext>();

// POST /api/auth/login
authRoutes.post("/login", rateLimit({ prefix: "login", maxRequests: 10, windowMs: 60_000 }), async (c) => {
  const body = await c.req.json();
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Username dan password wajib diisi" }, 400);
  }

  const { username, password } = parsed.data;

  const row = await c.env.DB.prepare(
    "SELECT id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active FROM admins WHERE username = ?",
  )
    .bind(username)
    .first<{
      id: string;
      username: string;
      password_hash: string;
      nama_lengkap: string;
      role: string;
      assigned_gender: string | null;
      assigned_unit: string | null;
      is_active: number;
    }>();

  if (!row || !row.is_active) {
    return c.json({ error: "Username atau password salah" }, 401);
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return c.json({ error: "Username atau password salah" }, 401);
  }

  const session: AdminSession = {
    adminId: row.id,
    username: row.username,
    role: row.role as AdminSession["role"],
    assignedGender: (row.assigned_gender ?? "all") as AdminSession["assignedGender"],
    assignedUnit: row.assigned_unit,
  };

  const token = await signJwt(session, c.env.JWT_SECRET);

  return c.json({
    token,
    admin: {
      id: row.id,
      username: row.username,
      namaLengkap: row.nama_lengkap,
      role: row.role,
      assignedGender: session.assignedGender,
      assignedUnit: session.assignedUnit,
    },
  });
});
