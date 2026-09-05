-- Seed: Initial admin accounts + sample alumni
-- CHANGE PASSWORD IMMEDIATELY after first login!

-- Super Admin (username: superadmin | password: admin123)
INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active)
VALUES (
  '01JAZ000000000000000000001',
  'superadmin',
  'pbkdf2$100000$2fcf91c250632c8b156db38d7a7da4ae$edebc07002b997e20ca85090ffa3fa1b5a47bf4c67763bc879aac4f4bad0f665',
  'Super Admin Pondok',
  'super_admin',
  'all',
  'all',
  1
);

-- Admin Putri (username: adminputri | password: putri123)
INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active)
VALUES (
  '01JAZ000000000000000000002',
  'adminputri',
  'pbkdf2$100000$683122d4de1a94ff8b448b91afc4cd1b$02ef0b0786e88c44fb22cdd3af3ffd07d31376f70de230eb1fa836bcae9ff1ae',
  'Admin Putri',
  'admin_putri',
  'putri',
  'all',
  1
);

-- Sample Alumni Putra (No HP: 081234567890 | password: alumni123)
INSERT INTO alumni (id, nama_lengkap, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, alamat, no_hp, motto, kesan_pesan, momen_berkesan, privacy_level, photo_privacy, edit_token, password_hash, status_verifikasi)
VALUES (
  '01ALUMNI00000000000000001',
  'Ahmad Fauzi',
  'Fauzi',
  'Boyolali',
  '2000-05-15',
  'putra',
  'KMI',
  'A',
  '15',
  2021,
  'Jl. Pondok No. 1, Kedunglengkong, Simo, Boyolali',
  '+6281234567890',
  'Menuntut ilmu jalan menuju ridha Allah',
  'Pesantren adalah rumah kedua yang memberi saya banyak pelajaran hidup',
  'Kebersamaan dengan teman-teman di asrama adalah momen paling berkesan',
  'public',
  'public',
  'seed-token-putra-001',
  'pbkdf2$100000$73cb64c44ff5fe9651700a5f6683e853$d743969a7d2aaf5d146405aa86f622fd4a5d3dc23b984453c1a42622bf40b3bf',
  'verified'
);

-- Sample Alumni Putri (No HP: 081298765432 | password: alumni123)
INSERT INTO alumni (id, nama_lengkap, nama_panggilan, tempat_lahir, tanggal_lahir, gender, unit, kelas_nihai, angkatan, tahun_lulus, alamat, no_hp, motto, kesan_pesan, momen_berkesan, privacy_level, photo_privacy, edit_token, password_hash, status_verifikasi)
VALUES (
  '01ALUMNI00000000000000002',
  'Fatimah Az-Zahra',
  'Fatimah',
  'Surakarta',
  '2001-08-20',
  'putri',
  'KMA',
  'B',
  '16',
  2022,
  'Jl. Darusy Syahadah No. 2, Kedunglengkong, Simo, Boyolali',
  '+6281298765432',
  'Ikhlas dalam setiap langkah',
  'Banyak hikmah yang saya dapatkan selama di pesantren',
  'Momen taaruf dengan teman-teman baru adalah kenangan tak terlupakan',
  'public',
  'public',
  'seed-token-putri-001',
  'pbkdf2$100000$1c7ec2f5dbd4f18ab873cc2b42d67789$a81f5a0df50901e1e2050833b36d5d979973b9985143e897f489f2f6881a70b3',
  'verified'
);
