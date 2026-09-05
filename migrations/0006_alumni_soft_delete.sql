-- Add soft delete column to alumni
ALTER TABLE alumni ADD COLUMN deleted_at DATETIME;
CREATE INDEX idx_alumni_deleted_at ON alumni(deleted_at);
