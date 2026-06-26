CREATE TABLE IF NOT EXISTS friendship_reads (
    friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (friendship_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_friendship_reads_user ON friendship_reads (user_id);
