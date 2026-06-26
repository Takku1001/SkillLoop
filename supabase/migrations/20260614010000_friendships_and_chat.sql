CREATE TABLE IF NOT EXISTS friendships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_one_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_two_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','blocked')),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    CHECK (user_one_id <> user_two_id),
    CHECK (requested_by = user_one_id OR requested_by = user_two_id),
    UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_one ON friendships (user_one_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_two ON friendships (user_two_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
    sender_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body           TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 1000),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_friendship_created ON chat_messages (friendship_id, created_at);
