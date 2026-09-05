-- 0000_initial_schema.sql
-- Initial D1 schema for Alumni Ponpes system

-- 1. Admins
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_putra', 'admin_putri', 'admin_unit')),
  assigned_gender TEXT CHECK (assigned_gender IN ('putra', 'putri', 'all')),
  assigned_unit TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Alumni Biodata
CREATE TABLE alumni (
  id TEXT PRIMARY KEY,
  nama_lengkap TEXT NOT NULL,
  nama_pondok TEXT,
  nama_panggilan TEXT NOT NULL,
  tempat_lahir TEXT NOT NULL,
  tanggal_lahir DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('putra', 'putri')),
  unit TEXT NOT NULL,
  kelas_nihai TEXT NOT NULL,
  angkatan TEXT NOT NULL,
  tahun_lulus INTEGER NOT NULL,
  tahun_masuk INTEGER,
  nama_angkatan TEXT,
  alamat TEXT NOT NULL,
  no_hp TEXT NOT NULL,
  email TEXT,
  motto TEXT NOT NULL,
  kesan_pesan TEXT NOT NULL,
  momen_berkesan TEXT NOT NULL,
  foto_url TEXT,
  sosial_media TEXT,
  status_aktivitas TEXT,
  detail_aktivitas TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'public' CHECK (privacy_level IN ('public', 'alumni_only', 'private')),
  edit_token TEXT NOT NULL,
  pin_code TEXT,
  status_verifikasi TEXT NOT NULL DEFAULT 'pending' CHECK (status_verifikasi IN ('pending', 'verified', 'rejected')),
  verified_by TEXT REFERENCES admins(id),
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_alumni_no_hp ON alumni(no_hp);
CREATE INDEX idx_alumni_gender ON alumni(gender);
CREATE INDEX idx_alumni_unit ON alumni(unit);
CREATE INDEX idx_alumni_angkatan ON alumni(angkatan);
CREATE INDEX idx_alumni_tahun_lulus ON alumni(tahun_lulus);
CREATE INDEX idx_alumni_status_verifikasi ON alumni(status_verifikasi);

-- 3. Broadcasts
CREATE TABLE broadcasts (
  id TEXT PRIMARY KEY,
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  target_gender TEXT NOT NULL DEFAULT 'all' CHECK (target_gender IN ('all', 'putra', 'putri')),
  target_unit TEXT,
  target_angkatan TEXT,
  target_tahun_lulus INTEGER,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'push_notification', 'in_app')),
  created_by TEXT REFERENCES admins(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Push Subscriptions
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  alumni_id TEXT REFERENCES alumni(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Activity Logs
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT REFERENCES admins(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
