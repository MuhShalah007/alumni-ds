import { createMiddleware } from "hono/factory";
import { verifyJwt } from "../utils/jwt";
import type { AppContext } from "../db/client";
import type { AdminSession } from "@shared/constants";

// Extracts and verifies JWT from Authorization header, sets c.var.admin
export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Token tidak ditemukan" }, 401);
  }

  const token = header.slice(7);
  const session = await verifyJwt<AdminSession>(token, c.env.JWT_SECRET);
  if (!session) {
    return c.json({ error: "Token tidak valid atau kedaluwarsa" }, 401);
  }

  c.set("admin", session);
  await next();
});

// Requires super_admin role
export const requireSuperAdmin = createMiddleware<AppContext>(async (c, next) => {
  const admin = c.get("admin");
  if (!admin || admin.role !== "super_admin") {
    return c.json({ error: "Akses ditolak: hanya Super Admin" }, 403);
  }
  await next();
});
