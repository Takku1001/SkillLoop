-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(200),
    program         VARCHAR(50),                        -- e.g. BSAI, BSCS
    reputation_score NUMERIC(4,2) DEFAULT 0.00,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- SKILLS (master list)
-- ════════════════════════════════════════
CREATE TABLE skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    category    VARCHAR(50),                            -- e.g. Math, Programming
    embedding   vector(1536),                           -- pgvector semantic embedding
    metadata    JSONB DEFAULT '{}'::JSONB               -- prerequisites, difficulty, tags
);

CREATE INDEX idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_skills_metadata  ON skills USING GIN (metadata);

-- ════════════════════════════════════════
-- SKILL OFFERINGS (what a user can teach)
-- ════════════════════════════════════════
CREATE TABLE skill_offerings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency VARCHAR(20) CHECK (proficiency IN ('beginner','intermediate','advanced')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

-- ════════════════════════════════════════
-- SKILL REQUESTS (what a user wants to learn)
-- ════════════════════════════════════════
CREATE TABLE skill_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    urgency     VARCHAR(20) CHECK (urgency IN ('low','medium','high')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

-- ════════════════════════════════════════
-- TRADE CIRCLES (matched loops)
-- ════════════════════════════════════════
CREATE TABLE trade_circles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_circle_members (
    circle_id   UUID REFERENCES trade_circles(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    teaches_skill_id UUID REFERENCES skills(id),
    learns_skill_id  UUID REFERENCES skills(id),
    position    INT,                                    -- order in the circle
    PRIMARY KEY (circle_id, user_id)
);

-- ════════════════════════════════════════
-- SESSIONS (actual teaching sessions)
-- ════════════════════════════════════════
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id       UUID REFERENCES trade_circles(id) ON DELETE SET NULL,
    teacher_id      UUID NOT NULL REFERENCES users(id),
    learner_id      UUID NOT NULL REFERENCES users(id),
    skill_id        UUID NOT NULL REFERENCES skills(id),
    status          VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
    scheduled_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    video_url       TEXT,                               -- Jitsi Meet room URL for this session
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════
-- REVIEWS
-- ════════════════════════════════════════
CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating      INT CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, reviewer_id)
);

CREATE TABLE friendships (
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

CREATE INDEX idx_friendships_user_one ON friendships (user_one_id);
CREATE INDEX idx_friendships_user_two ON friendships (user_two_id);

CREATE TABLE chat_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
    sender_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body           TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 1000),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_friendship_created ON chat_messages (friendship_id, created_at);

-- Realtime: stream chat message inserts to subscribed clients
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
-- NOTE: also requires `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;`
-- (handled in migration 20260619030000_realtime_chat.sql)

CREATE TABLE friendship_reads (
    friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (friendship_id, user_id)
);

CREATE INDEX idx_friendship_reads_user ON friendship_reads (user_id);

-- Realtime: notify the sender when the recipient's read marker advances ("seen")
ALTER TABLE friendship_reads REPLICA IDENTITY FULL;
-- NOTE: also requires `ALTER PUBLICATION supabase_realtime ADD TABLE friendship_reads;`
-- (handled in migration 20260619040000_realtime_reads.sql)

-- ════════════════════════════════════════
-- MATERIALIZED VIEW — Reputation Scores
-- ════════════════════════════════════════
CREATE MATERIALIZED VIEW user_reputation AS
WITH review_stats AS (
    SELECT
        reviewee_id AS user_id,
        ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
        COUNT(*) AS total_reviews
    FROM reviews
    GROUP BY reviewee_id
),
session_stats AS (
    SELECT
        teacher_id AS user_id,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions
    FROM sessions
    GROUP BY teacher_id
)
SELECT
    u.id,
    u.name,
    rs.avg_rating,
    COALESCE(rs.total_reviews, 0) AS total_reviews,
    COALESCE(ss.completed_sessions, 0) AS completed_sessions
FROM users u
LEFT JOIN review_stats rs ON rs.user_id = u.id
LEFT JOIN session_stats ss ON ss.user_id = u.id;

CREATE UNIQUE INDEX ON user_reputation (id);

-- ════════════════════════════════════════
-- RECURSIVE CTE — Loop Finder (stored as view)
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW potential_loops AS
WITH RECURSIVE loop_finder AS (

    -- Base: find direct pairs (A teaches what B wants)
    SELECT
        so.user_id      AS start_user,
        sr.user_id      AS next_user,
        so.skill_id     AS skill_offered,
        sr.skill_id     AS skill_wanted,
        ARRAY[so.user_id, sr.user_id] AS path,
        1               AS depth

    FROM skill_offerings so
    JOIN skill_requests sr ON sr.skill_id = so.skill_id
    WHERE so.user_id <> sr.user_id

    UNION ALL

    -- Recurse: extend the chain
    SELECT
        lf.start_user,
        sr.user_id,
        so.skill_id,
        sr.skill_id,
        lf.path || sr.user_id,
        lf.depth + 1

    FROM loop_finder lf
    JOIN skill_offerings so ON so.user_id = lf.next_user
    JOIN skill_requests  sr ON sr.skill_id = so.skill_id
    WHERE lf.next_user <> lf.start_user        -- stop after closing the loop
            AND (sr.user_id = lf.start_user OR sr.user_id <> ALL(lf.path))
            AND lf.depth < 5                         -- max loop size = 5

)
-- A loop completes when the last user wants a skill the start user offers
SELECT lf.*
FROM loop_finder lf
WHERE lf.depth >= 2
    AND lf.next_user = lf.start_user;

-- ════════════════════════════════════════
-- Ranked loops — score cycles by reputation, urgency, proficiency, length
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW potential_loops_ranked AS
WITH loops AS (
    SELECT pl.*, row_number() OVER () AS loop_id
    FROM potential_loops pl
),
edges AS (
    SELECT l.loop_id,
           p.user_id            AS teacher,
           l.path[p.ord + 1]    AS learner
    FROM loops l
    CROSS JOIN LATERAL unnest(l.path) WITH ORDINALITY AS p(user_id, ord)
    WHERE p.ord < array_length(l.path, 1)
),
edge_scores AS (
    SELECT e.loop_id,
           (SELECT MAX(CASE sr.urgency WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END)
              FROM skill_offerings so
              JOIN skill_requests sr ON sr.skill_id = so.skill_id
             WHERE so.user_id = e.teacher AND sr.user_id = e.learner) AS urgency_score,
           (SELECT MAX(CASE so.proficiency WHEN 'advanced' THEN 3 WHEN 'intermediate' THEN 2 WHEN 'beginner' THEN 1 ELSE 0 END)
              FROM skill_offerings so
              JOIN skill_requests sr ON sr.skill_id = so.skill_id
             WHERE so.user_id = e.teacher AND sr.user_id = e.learner) AS proficiency_score
    FROM edges e
),
edge_agg AS (
    SELECT loop_id,
           AVG(COALESCE(urgency_score, 0))    AS avg_urgency,
           AVG(COALESCE(proficiency_score, 0)) AS avg_proficiency
    FROM edge_scores
    GROUP BY loop_id
),
rep_agg AS (
    SELECT l.loop_id,
           AVG(COALESCE(ur.avg_rating, 0)) AS avg_reputation
    FROM loops l
    CROSS JOIN LATERAL unnest(l.path[1 : array_length(l.path, 1) - 1]) AS m(user_id)
    LEFT JOIN user_reputation ur ON ur.id = m.user_id
    GROUP BY l.loop_id
)
SELECT l.start_user,
       l.next_user,
       l.skill_offered,
       l.skill_wanted,
       l.path,
       l.depth,
       ROUND(COALESCE(r.avg_reputation, 0)::numeric, 2)  AS avg_reputation,
       ROUND(COALESCE(a.avg_urgency, 0)::numeric, 2)     AS avg_urgency,
       ROUND(COALESCE(a.avg_proficiency, 0)::numeric, 2) AS avg_proficiency,
       ROUND((
             COALESCE(r.avg_reputation, 0) * 1.0
           + COALESCE(a.avg_urgency, 0) * 1.0
           + COALESCE(a.avg_proficiency, 0) * 0.5
           - (l.depth - 2) * 1.5
       )::numeric, 2) AS score
FROM loops l
LEFT JOIN edge_agg a ON a.loop_id = l.loop_id
LEFT JOIN rep_agg  r ON r.loop_id = l.loop_id;

-- ════════════════════════════════════════
-- Near-miss loops — chains "1 connection away" from closing
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW near_miss_loops AS
WITH RECURSIVE chain AS (
    SELECT so.user_id              AS start_user,
           sr.user_id              AS next_user,
           ARRAY[so.user_id, sr.user_id] AS path,
           1                       AS depth
    FROM skill_offerings so
    JOIN skill_requests sr ON sr.skill_id = so.skill_id
    WHERE so.user_id <> sr.user_id

    UNION ALL

    SELECT c.start_user,
           sr.user_id,
           c.path || sr.user_id,
           c.depth + 1
    FROM chain c
    JOIN skill_offerings so ON so.user_id = c.next_user
    JOIN skill_requests  sr ON sr.skill_id = so.skill_id
    WHERE sr.user_id <> ALL(c.path)
      AND c.depth < 4
)
SELECT c.start_user,
       c.next_user        AS end_user,
       c.path,
       c.depth,
       miss.skill_id      AS missing_skill_id
FROM chain c
JOIN skill_offerings miss ON miss.user_id = c.next_user
WHERE c.depth >= 1
  AND c.next_user <> c.start_user
  AND NOT EXISTS (
        SELECT 1 FROM skill_requests sr0
        WHERE sr0.user_id = c.start_user AND sr0.skill_id = miss.skill_id
  )
  AND NOT EXISTS (
        SELECT 1
        FROM skill_offerings so2
        JOIN skill_requests sr2 ON sr2.skill_id = so2.skill_id
        WHERE so2.user_id = c.next_user AND sr2.user_id = c.start_user
  );
