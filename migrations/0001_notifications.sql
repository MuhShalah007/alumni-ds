-- 6. Notifications / Pengumuman / Inbox
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'pengumuman' CHECK (type IN ('pengumuman', 'chat', 'system')),
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'super_admin', 'admin_putra', 'admin_putri', 'admin_unit')),
  target_gender TEXT CHECK (target_gender IN ('all', 'putra', 'putri')),
  target_unit TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES admins(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_target ON notifications(target_role, target_gender, target_unit);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- 7. Notification read status (per admin)
CREATE TABLE notification_reads (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES admins(id),
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(notification_id, admin_id)
);

CREATE INDEX idx_notif_reads_admin ON notification_reads(admin_id);
