-- Add a per-session video meeting link (Jitsi Meet room URL)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url TEXT;
