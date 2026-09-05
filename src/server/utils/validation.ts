import { z } from "zod";
import { PUTRA_UNITS, PUTRI_UNITS, KELAS_NIHAI_OPTIONS, PRIVACY_LEVELS, STATUS_AKTIVITAS } from "@shared/constants";

const ALL_UNITS: string[] = [...PUTRA_UNITS, ...PUTRI_UNITS];

export const submitAlumniSchema = z.object({
  namaLengkap: z.string().min(2, "Nama lengkap minimal 2 karakter").max(200),
  namaPondok: z.string().max(200).optional().nullable(),
  namaPanggilan: z.string().min(1, "Nama panggilan wajib diisi").max(100),
  tempatLahir: z.string().min(2, "Tempat lahir wajib diisi").max(200),
  tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
  gender: z.enum(["putra", "putri"]),
  unit: z.string().refine((v) => ALL_UNITS.includes(v), "Unit tidak valid"),
  kelasNihai: z.string().refine((v) => (KELAS_NIHAI_OPTIONS as readonly string[]).includes(v), "Kelas tidak valid"),
  angkatan: z.string().regex(/^\d{2}$/, "Angkatan format 2 digit (DD)"),
  tahunLulus: z.number().int().min(1990).max(2100),
  tahunMasuk: z.number().int().min(1990).max(2100).optional().nullable(),
  namaAngkatan: z.string().max(200).optional().nullable(),
  alamat: z.string().min(3, "Alamat wajib diisi").max(1000),
  noHp: z.string().min(5, "Nomor HP wajib diisi"),
  email: z.string().email("Email tidak valid").optional().nullable(),
  motto: z.string().min(3, "Motto wajib diisi").max(500),
  kesanPesan: z.string().min(3, "Kesan & pesan wajib diisi").max(2000),
  momenBerkesan: z.string().min(3, "Momen berkesan wajib diisi").max(2000),
  fotoUrl: z.string().optional().nullable(),
  backgroundUrl: z.string().optional().nullable(),
  sosialMedia: z
    .object({
      instagram: z.string().optional().nullable(),
      facebook: z.string().optional().nullable(),
      linkedin: z.string().optional().nullable(),
      tiktok: z.string().optional().nullable(),
    })
    .optional().nullable(),
  statusAktivitas: z.string().refine((v) => v === "" || (STATUS_AKTIVITAS as readonly string[]).includes(v), "Status tidak valid").optional().nullable(),
  detailAktivitas: z.string().max(500).optional().nullable(),
  privacyLevel: z.enum(PRIVACY_LEVELS as unknown as [string, ...string[]]).default("public"),
  photoPrivacy: z.enum(["public", "private"]).default("public"),
  password: z.string().min(6, "Password minimal 6 karakter").max(200),
  pinCode: z.string().regex(/^\d{6}$/, "PIN harus 6 digit").optional().nullable(),
});

export const updateByTokenSchema = submitAlumniSchema.partial();

export const alumniLoginSchema = z.object({
  noHp: z.string().min(5, "Nomor HP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});


export const adminLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const createAdminSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6, "Password minimal 6 karakter").max(200),
  namaLengkap: z.string().min(2).max(200),
  role: z.enum(["super_admin", "admin_putra", "admin_putri", "admin_unit"]),
  assignedGender: z.enum(["putra", "putri", "all"]),
  assignedUnit: z.string().optional().nullable(),
});

export const broadcastSchema = z.object({
  judul: z.string().min(1).max(200),
  pesan: z.string().min(1).max(5000),
  targetGender: z.enum(["all", "putra", "putri"]).default("all"),
  targetUnit: z.string().optional().nullable(),
  targetAngkatan: z.string().optional().nullable(),
  targetTahunLulus: z.number().int().optional().nullable(),
  channel: z.enum(["whatsapp", "push_notification", "in_app"]).default("whatsapp"),
});

export type SubmitAlumniInput = z.infer<typeof submitAlumniSchema>;
export type UpdateByTokenInput = z.infer<typeof updateByTokenSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AlumniLoginInput = z.infer<typeof alumniLoginSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
