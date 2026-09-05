-- Alumni auth: password for self-login
ALTER TABLE alumni ADD COLUMN password_hash TEXT;

-- Photo privacy: separate from profile privacy
ALTER TABLE alumni ADD COLUMN photo_privacy TEXT NOT NULL DEFAULT 'public' CHECK (photo_privacy IN ('public', 'private'));

-- Edit token: expiry + one-time use
ALTER TABLE alumni ADD COLUMN token_expires_at DATETIME;
ALTER TABLE alumni ADD COLUMN token_used INTEGER NOT NULL DEFAULT 0;

-- Activity log: add alumni_id for alumni-initiated actions
ALTER TABLE activity_logs ADD COLUMN alumni_id TEXT REFERENCES alumni(id);
