// Row-Level Security scope helper for application-layer access control.
// Uses raw D1 prepared statements (not Drizzle) for compatibility with c.env.DB.

import type { AdminSession } from "@shared/constants";

export interface ScopeFilter {
  whereSql: string;
  params: string[];
  isSuperAdmin: boolean;
}

export function alumniScope(session: AdminSession): ScopeFilter {
  switch (session.role) {
    case "super_admin":
      return { whereSql: "", params: [], isSuperAdmin: true };
    case "admin_putra":
      return { whereSql: " AND gender = 'putra'", params: [], isSuperAdmin: false };
    case "admin_putri":
      return { whereSql: " AND gender = 'putri'", params: [], isSuperAdmin: false };
    case "admin_unit":
      return {
        whereSql: " AND gender = ? AND unit = ?",
        params: [session.assignedGender === "all" ? "putra" : session.assignedGender, session.assignedUnit ?? ""],
        isSuperAdmin: false,
      };
    default:
      return { whereSql: " AND 1=0", params: [], isSuperAdmin: false };
  }
}

export async function fetchScopedAlumni(
  db: D1Database,
  session: AdminSession,
  alumniId: string,
): Promise<{ gender: string; unit: string } | null> {
  const scope = alumniScope(session);
  const row = await db
    .prepare(`SELECT gender, unit FROM alumni WHERE id = ?${scope.whereSql}`)
    .bind(alumniId, ...scope.params)
    .first<{ gender: string; unit: string }>();
  return row ?? null;
}
