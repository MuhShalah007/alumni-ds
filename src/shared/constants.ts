// Shared constants & types used by both server and client

export const PUTRA_UNITS = ["KMI", "KMT", "DID-A", "DID-B", "STI", "STD"] as const;
export const PUTRI_UNITS = ["KMA", "KMT", "DID", "STI"] as const;
export const KELAS_NIHAI_OPTIONS = ["A", "B", "C", "D", "Tidak Paralel"] as const;
export const PRIVACY_LEVELS = ["public", "alumni_only", "private"] as const;
export const VERIFICATION_STATUS = ["pending", "verified", "rejected"] as const;
export const ADMIN_ROLES = ["super_admin", "admin_putra", "admin_putri", "admin_unit"] as const;
export const STATUS_AKTIVITAS = ["Kuliah", "Bekerja", "Wirausaha", "Khidmah", "Mengajar", "Lainnya"] as const;

export type Gender = "putra" | "putri";
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export function unitsForGender(gender: Gender): readonly string[] {
  return gender === "putra" ? PUTRA_UNITS : PUTRI_UNITS;
}

export function isValidUnit(gender: Gender, unit: string): boolean {
  return unitsForGender(gender).includes(unit);
}

export interface AdminSession {
  adminId: string;
  username: string;
  role: AdminRole;
  assignedGender: "putra" | "putri" | "all";
  assignedUnit: string | null;
}

export interface AlumniPublic {
  id: string;
  namaLengkap: string;
  namaPanggilan: string;
  gender: Gender;
  unit: string;
  kelasNihai: string;
  angkatan: string;
  tahunLulus: number;
  fotoUrl: string | null;
  motto: string;
  kesanPesan: string;
  momenBerkesan: string;
  privacyLevel: PrivacyLevel;
  statusVerifikasi: VerificationStatus;
}

export interface AlumniFull extends AlumniPublic {
  namaPondok: string | null;
  tempatLahir: string;
  tanggalLahir: string;
  tahunMasuk: number | null;
  namaAngkatan: string | null;
  alamat: string;
  noHp: string;
  email: string | null;
  sosialMedia: SosialMedia | null;
  statusAktivitas: string | null;
  detailAktivitas: string | null;
  editToken: string;
  pinCode: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SosialMedia {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
}

export interface AdminStats {
  total: number;
  putra: number;
  putri: number;
  verified: number;
  pending: number;
  rejected: number;
  perAngkatan: { angkatan: string; count: number }[];
  perUnit: { unit: string; count: number }[];
}
