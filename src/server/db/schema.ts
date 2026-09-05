import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. Admins
export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  namaLengkap: text("nama_lengkap").notNull(),
  role: text("role", { enum: ["super_admin", "admin_putra", "admin_putri", "admin_unit"] }).notNull(),
  assignedGender: text("assigned_gender", { enum: ["putra", "putri", "all"] }),
  assignedUnit: text("assigned_unit"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 2. Alumni
export const alumni = sqliteTable(
  "alumni",
  {
    id: text("id").primaryKey(),
    namaLengkap: text("nama_lengkap").notNull(),
    namaPondok: text("nama_pondok"),
    namaPanggilan: text("nama_panggilan").notNull(),
    tempatLahir: text("tempat_lahir").notNull(),
    tanggalLahir: text("tanggal_lahir").notNull(),
    gender: text("gender", { enum: ["putra", "putri"] }).notNull(),
    unit: text("unit").notNull(),
    kelasNihai: text("kelas_nihai").notNull(),
    angkatan: text("angkatan").notNull(),
    tahunLulus: integer("tahun_lulus").notNull(),
    tahunMasuk: integer("tahun_masuk"),
    namaAngkatan: text("nama_angkatan"),
    alamat: text("alamat").notNull(),
    noHp: text("no_hp").notNull(),
    email: text("email"),
    motto: text("motto").notNull(),
    kesanPesan: text("kesan_pesan").notNull(),
    momenBerkesan: text("momen_berkesan").notNull(),
    fotoUrl: text("foto_url"),
    backgroundUrl: text("background_url"),
    sosialMedia: text("sosial_media"),
    statusAktivitas: text("status_aktivitas"),
    detailAktivitas: text("detail_aktivitas"),
    privacyLevel: text("privacy_level", { enum: ["public", "alumni_only", "private"] }).notNull().default("public"),
    editToken: text("edit_token").notNull(),
    pinCode: text("pin_code"),
    passwordHash: text("password_hash"),
    photoPrivacy: text("photo_privacy", { enum: ["public", "private"] }).notNull().default("public"),
    tokenExpiresAt: text("token_expires_at"),
    tokenUsed: integer("token_used").notNull().default(0),
    statusVerifikasi: text("status_verifikasi", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
    verifiedBy: text("verified_by").references(() => admins.id),
    verifiedAt: text("verified_at"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (t) => ({
    noHpIdx: uniqueIndex("idx_alumni_no_hp").on(t.noHp),
    genderIdx: index("idx_alumni_gender").on(t.gender),
    unitIdx: index("idx_alumni_unit").on(t.unit),
    angkatanIdx: index("idx_alumni_angkatan").on(t.angkatan),
    tahunLulusIdx: index("idx_alumni_tahun_lulus").on(t.tahunLulus),
    statusVerifikasiIdx: index("idx_alumni_status_verifikasi").on(t.statusVerifikasi),
  }),
);

// 3. Broadcasts
export const broadcasts = sqliteTable("broadcasts", {
  id: text("id").primaryKey(),
  judul: text("judul").notNull(),
  pesan: text("pesan").notNull(),
  targetGender: text("target_gender", { enum: ["all", "putra", "putri"] }).notNull().default("all"),
  targetUnit: text("target_unit"),
  targetAngkatan: text("target_angkatan"),
  targetTahunLulus: integer("target_tahun_lulus"),
  channel: text("channel", { enum: ["whatsapp", "push_notification", "in_app"] }).notNull().default("whatsapp"),
  createdBy: text("created_by").references(() => admins.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 4. Push Subscriptions
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  alumniId: text("alumni_id").references(() => alumni.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 5. Activity Logs
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").references(() => admins.id),
  alumniId: text("alumni_id").references(() => alumni.id),
  action: text("action").notNull(),
  details: text("details"),
});

// 6. Notifications (Pengumuman / Chat / System)
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["pengumuman", "chat", "system"] }).notNull().default("pengumuman"),
  judul: text("judul").notNull(),
  pesan: text("pesan").notNull(),
  targetRole: text("target_role", { enum: ["all", "super_admin", "admin_putra", "admin_putri", "admin_unit"] }).notNull().default("all"),
  targetGender: text("target_gender", { enum: ["all", "putra", "putri"] }),
  targetUnit: text("target_unit"),
  isPinned: integer("is_pinned").notNull().default(0),
  createdBy: text("created_by").references(() => admins.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 7. Notification read status
export const notificationReads = sqliteTable("notification_reads", {
  id: text("id").primaryKey(),
  notificationId: text("notification_id").notNull().references(() => notifications.id),
  adminId: text("admin_id").notNull().references(() => admins.id),
  readAt: text("read_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({
  uniqRead: uniqueIndex("idx_notif_reads_uniq").on(t.notificationId, t.adminId),
}));

// 8. Pending Changes (sensitive field edits awaiting admin approval)
export const pendingChanges = sqliteTable("pending_changes", {
  id: text("id").primaryKey(),
  alumniId: text("alumni_id").notNull().references(() => alumni.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  proposedBy: text("proposed_by"),
  approvedBy: text("approved_by").references(() => admins.id),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({
  alumniIdx: index("idx_pending_changes_alumni").on(t.alumniId),
  statusIdx: index("idx_pending_changes_status").on(t.status),
}));

export type Admin = typeof admins.$inferSelect;
export type AdminInsert = typeof admins.$inferInsert;
export type Alumni = typeof alumni.$inferSelect;
export type AlumniInsert = typeof alumni.$inferInsert;
export type Broadcast = typeof broadcasts.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PendingChange = typeof pendingChanges.$inferSelect;
export type PendingChangeInsert = typeof pendingChanges.$inferInsert;
