-- Fresh admin accounts (generated 2026-09-05T13:35:25.401Z)
-- Wipe all existing data + insert new admins (PBKDF2-SHA256 hashes only)
-- Run with: wrangler d1 execute alumni-db --local --file=migrations/seed.sql

-- Wipe all existing data (order respects FK references)
DELETE FROM notification_reads;
DELETE FROM notifications;
DELETE FROM pending_changes;
DELETE FROM push_subscriptions;
DELETE FROM broadcasts;
DELETE FROM activity_logs;
DELETE FROM alumni;
DELETE FROM admins;

-- New admin accounts (passwords are hashed; no plaintext stored)

-- superadmin (Administrator) — role: super_admin
INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active)
VALUES ('01JAZ000000000000000000001', 'superadmin', 'pbkdf2$100000$e87b9c061333a3bbadd3ad75f5f9c28b$5e3994f3508af4046b5a38dcf1dce579c2084b0b5a4962c955d42817abdf0c9f', 'Administrator', 'super_admin', 'all', 'all', 1);

-- dhiyaullah (Ust. Dhiyaullah) — role: admin_putra
INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active)
VALUES ('01JAZ000000000000000000002', 'dhiyaullah', 'pbkdf2$100000$cf65bf9fb4873394832165068b4950c2$c9f7423e03871553c9d1ffece1d4c2277efcd930164971f061ccc71e4caa6ee1', 'Ust. Dhiyaullah', 'admin_putra', 'putra', 'all', 1);

-- almahmudy (Ust. Naasher Al-mahmoedy) — role: admin_putra
INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active)
VALUES ('01JAZ000000000000000000003', 'almahmudy', 'pbkdf2$100000$9538c367308996427645915792ed352d$7b91054a8dfcfd484b268a54fd608059a583fed4668cb1aef1cd9d878657d5f6', 'Ust. Naasher Al-mahmoedy', 'admin_putra', 'putra', 'all', 1);

-- ummihani (Usth. Ummi Hanik) — role: admin_putri
INSERT INTO admins (id, username, password_hash, nama_lengkap, role, assigned_gender, assigned_unit, is_active)
VALUES ('01JAZ000000000000000000004', 'ummihani', 'pbkdf2$100000$8915cee0a5f0fa84c59ea14bde5185c8$e26f64a06c090c5f4bac580b4df9daa89bd0b9725b01ec76e9df59360433ded9', 'Usth. Ummi Hanik', 'admin_putri', 'putri', 'all', 1);

