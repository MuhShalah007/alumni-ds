-- 0003_pending_changes.sql
-- Pending changes table for sensitive field edits awaiting admin approval.
-- When alumni edit tempat_lahir, tanggal_lahir, gender, no_hp, or angkatan,
-- the change is stored here instead of being applied directly to the alumni table.
-- Admins review and approve/reject via /api/admin/pending-changes endpoints.

CREATE TABLE IF NOT EXISTS pending_changes (
  id TEXT PRIMARY KEY,
  alumni_id TEXT NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  proposed_by TEXT,
  approved_by TEXT REFERENCES admins(id),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_changes_alumni ON pending_changes(alumni_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_status ON pending_changes(status);
