const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function isBlank(value) {
    return value === undefined || value === null || value === '';
}

async function refreshReputationView() {
    await pool.query('REFRESH MATERIALIZED VIEW user_reputation');
}

let socialSchemaReady;
let sessionVideoColumnReady;

async function ensureSessionVideoColumn() {
    if (!sessionVideoColumnReady) {
        sessionVideoColumnReady = pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url TEXT');
    }
    return sessionVideoColumnReady;
}

function buildVideoUrl() {
    return `https://meet.jit.si/skillloop-${crypto.randomUUID()}`;
}

function orderedPair(userId, friendId) {
    return [userId, friendId].sort();
}

async function ensureFriendshipReadsSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS friendship_reads (
            friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
            user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            last_read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (friendship_id, user_id)
        )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_friendship_reads_user ON friendship_reads (user_id)');
}

async function ensureSocialSchema() {
    if (!socialSchemaReady) {
        socialSchemaReady = (async () => {
            await pool.query(`
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
                )
            `);
            await pool.query('CREATE INDEX IF NOT EXISTS idx_friendships_user_one ON friendships (user_one_id)');
            await pool.query('CREATE INDEX IF NOT EXISTS idx_friendships_user_two ON friendships (user_two_id)');
            await pool.query(`
                DO $$ BEGIN
                    ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;
                    ALTER TABLE friendships ALTER COLUMN status SET DEFAULT 'pending';
                    ALTER TABLE friendships ADD CONSTRAINT friendships_status_check
                        CHECK (status IN ('pending','accepted','rejected','blocked'));
                EXCEPTION WHEN others THEN NULL;
                END $$;
            `);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
                    sender_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    body           TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 1000),
                    created_at     TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_friendship_created ON chat_messages (friendship_id, created_at)');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS friendship_reads (
                    friendship_id  UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
                    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    last_read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (friendship_id, user_id)
                )
            `);
            await pool.query('CREATE INDEX IF NOT EXISTS idx_friendship_reads_user ON friendship_reads (user_id)');
        })();
    }

    return socialSchemaReady;
}

async function markFriendshipRead(friendshipId, userId) {
    await pool.query(
        `INSERT INTO friendship_reads (friendship_id, user_id, last_read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (friendship_id, user_id)
         DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
        [friendshipId, userId]
    );
}

async function ensureAcceptedFriendship(userId, friendId) {
    if (isBlank(userId) || isBlank(friendId) || userId === friendId) {
        return;
    }
    await ensureSocialSchema();
    const [userOneId, userTwoId] = orderedPair(userId, friendId);
    await pool.query(
        `INSERT INTO friendships (user_one_id, user_two_id, requested_by, status)
         VALUES ($1, $2, $3, 'accepted')
         ON CONFLICT (user_one_id, user_two_id)
         DO UPDATE SET status = 'accepted'`,
        [userOneId, userTwoId, userId]
    );
}

async function getFriendshipBetween(userId, friendId) {
    const [userOneId, userTwoId] = orderedPair(userId, friendId);
    const result = await pool.query(
        'SELECT * FROM friendships WHERE user_one_id = $1 AND user_two_id = $2',
        [userOneId, userTwoId]
    );

    return result.rows[0] || null;
}

async function getFriendshipForUser(friendshipId, userId) {
    const result = await pool.query(
        `SELECT *
         FROM friendships
         WHERE id = $1
           AND status = 'accepted'
           AND ($2 = user_one_id OR $2 = user_two_id)`,
        [friendshipId, userId]
    );

    return result.rows[0] || null;
}

// GET all skills
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM skills ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all users
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, program, reputation_score, created_at FROM users ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all skill offerings
router.get('/offerings', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT so.id, so.user_id, so.skill_id, so.proficiency, so.created_at,
                    u.name AS user_name, s.name AS skill_name
             FROM skill_offerings so
             JOIN users u ON u.id = so.user_id
             JOIN skills s ON s.id = so.skill_id
             ORDER BY so.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all skill requests
router.get('/requests', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sr.id, sr.user_id, sr.skill_id, sr.urgency, sr.created_at,
                    u.name AS user_name, s.name AS skill_name
             FROM skill_requests sr
             JOIN users u ON u.id = sr.user_id
             JOIN skills s ON s.id = sr.skill_id
             ORDER BY sr.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET reputation leaderboard
router.get('/reputation', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_reputation ORDER BY avg_rating DESC NULLS LAST');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET potential trade loops
router.get('/loops', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM potential_loops_ranked ORDER BY score DESC NULLS LAST LIMIT 20');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET near-miss loops for a user ("1 connection away")
router.get('/near-miss', async (req, res) => {
    const { user_id } = req.query;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (nm.end_user, nm.missing_skill_id)
                    nm.start_user,
                    nm.end_user,
                    nm.path,
                    nm.depth,
                    nm.missing_skill_id,
                    s.name  AS missing_skill_name,
                    eu.name AS end_user_name
             FROM near_miss_loops nm
             JOIN skills s  ON s.id  = nm.missing_skill_id
             JOIN users  eu ON eu.id = nm.end_user
             WHERE nm.start_user = $1
             ORDER BY nm.end_user, nm.missing_skill_id, nm.depth ASC`,
            [user_id]
        );

        // shortest, simplest near-misses first
        const rows = result.rows.sort((a, b) => a.depth - b.depth).slice(0, 20);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all sessions
router.get('/sessions', async (req, res) => {
    try {
        await ensureSessionVideoColumn();
        const result = await pool.query(
            `SELECT s.id, s.circle_id, s.teacher_id, s.learner_id, s.skill_id,
                    s.status, s.scheduled_at, s.completed_at, s.video_url, s.created_at,
                    teacher.name AS teacher_name,
                    learner.name AS learner_name,
                    skill.name AS skill_name
             FROM sessions s
             JOIN users teacher ON teacher.id = s.teacher_id
             JOIN users learner ON learner.id = s.learner_id
             JOIN skills skill ON skill.id = s.skill_id
             ORDER BY s.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all reviews
router.get('/reviews', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.id, r.session_id, r.reviewer_id, r.reviewee_id, r.rating,
                    r.comment, r.created_at,
                    reviewer.name AS reviewer_name,
                    reviewee.name AS reviewee_name
             FROM reviews r
             JOIN users reviewer ON reviewer.id = r.reviewer_id
             JOIN users reviewee ON reviewee.id = r.reviewee_id
             ORDER BY r.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET friend requests for a user (sent and received)
router.get('/friend-requests', async (req, res) => {
    const { user_id } = req.query;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        await ensureSocialSchema();
        const result = await pool.query(
            `SELECT f.id,
                    f.user_one_id,
                    f.user_two_id,
                    f.requested_by,
                    f.status,
                    f.created_at,
                    other_user.id AS friend_id,
                    other_user.name AS friend_name,
                    other_user.email AS friend_email,
                    other_user.program AS friend_program
             FROM friendships f
             JOIN users other_user
               ON other_user.id = CASE WHEN f.user_one_id = $1 THEN f.user_two_id ELSE f.user_one_id END
             WHERE f.status = 'pending'
               AND ($1 = f.user_one_id OR $1 = f.user_two_id)
             ORDER BY f.created_at DESC`,
            [user_id]
        );

        const sent = result.rows.filter((row) => row.requested_by === user_id);
        const received = result.rows.filter((row) => row.requested_by !== user_id);
        res.json({ sent, received });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET accepted friends for a user
router.get('/friends', async (req, res) => {
    const { user_id } = req.query;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        await ensureSocialSchema();
        await ensureFriendshipReadsSchema();
        const result = await pool.query(
            `SELECT f.id,
                    f.user_one_id,
                    f.user_two_id,
                    f.requested_by,
                    f.status,
                    f.created_at,
                    other_user.id AS friend_id,
                    other_user.name AS friend_name,
                    other_user.email AS friend_email,
                    other_user.program AS friend_program,
                    latest.body AS last_message,
                    latest.created_at AS last_message_at,
                    COALESCE(unread.count, 0) AS unread_count,
                    (SELECT fr2.last_read_at
                       FROM friendship_reads fr2
                      WHERE fr2.friendship_id = f.id
                        AND fr2.user_id = CASE WHEN f.user_one_id = $1 THEN f.user_two_id ELSE f.user_one_id END
                    ) AS friend_last_read_at
             FROM friendships f
             JOIN users other_user
               ON other_user.id = CASE WHEN f.user_one_id = $1 THEN f.user_two_id ELSE f.user_one_id END
             LEFT JOIN LATERAL (
                SELECT body, created_at
                FROM chat_messages cm
                WHERE cm.friendship_id = f.id
                ORDER BY cm.created_at DESC
                LIMIT 1
             ) latest ON true
             LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS count
                FROM chat_messages cm
                WHERE cm.friendship_id = f.id
                  AND cm.sender_id <> $1
                  AND cm.created_at > COALESCE(
                    (SELECT fr.last_read_at
                     FROM friendship_reads fr
                     WHERE fr.friendship_id = f.id AND fr.user_id = $1),
                    'epoch'::timestamptz
                  )
             ) unread ON true
             WHERE f.status = 'accepted'
               AND ($1 = f.user_one_id OR $1 = f.user_two_id)
             ORDER BY (COALESCE(unread.count, 0) > 0) DESC, latest.created_at DESC NULLS LAST, f.created_at DESC`,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST send a friend request
router.post('/friends', async (req, res) => {
    const { user_id, friend_id } = req.body;
    if (isBlank(user_id) || isBlank(friend_id)) {
        return res.status(400).json({ error: 'user_id and friend_id are required' });
    }
    if (user_id === friend_id) {
        return res.status(400).json({ error: 'you cannot add yourself as a friend' });
    }

    try {
        await ensureSocialSchema();
        const users = await pool.query(
            'SELECT id FROM users WHERE id = ANY($1::uuid[])',
            [[user_id, friend_id]]
        );
        if (users.rowCount !== 2) {
            return res.status(404).json({ error: 'user not found' });
        }

        const existing = await getFriendshipBetween(user_id, friend_id);
        if (existing) {
            if (existing.status === 'accepted') {
                return res.status(409).json({ error: 'already friends' });
            }
            if (existing.status === 'pending') {
                if (existing.requested_by === friend_id) {
                    const accepted = await pool.query(
                        `UPDATE friendships
                         SET status = 'accepted'
                         WHERE id = $1
                         RETURNING *`,
                        [existing.id]
                    );
                    return res.json(accepted.rows[0]);
                }
                return res.status(409).json({ error: 'friend request already sent' });
            }
            if (existing.status === 'rejected') {
                const resent = await pool.query(
                    `UPDATE friendships
                     SET status = 'pending', requested_by = $2, created_at = NOW()
                     WHERE id = $1
                     RETURNING *`,
                    [existing.id, user_id]
                );
                return res.status(201).json(resent.rows[0]);
            }
            return res.status(409).json({ error: 'unable to send friend request' });
        }

        const [userOneId, userTwoId] = orderedPair(user_id, friend_id);
        const result = await pool.query(
            `INSERT INTO friendships (user_one_id, user_two_id, requested_by, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [userOneId, userTwoId, user_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH accept a friend request
router.patch('/friend-requests/:id/accept', async (req, res) => {
    const { user_id } = req.body;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        await ensureSocialSchema();
        const existing = await pool.query(
            `SELECT *
             FROM friendships
             WHERE id = $1
               AND status = 'pending'
               AND requested_by <> $2
               AND ($2 = user_one_id OR $2 = user_two_id)`,
            [req.params.id, user_id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({ error: 'friend request not found' });
        }

        const result = await pool.query(
            `UPDATE friendships
             SET status = 'accepted'
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH decline a friend request
router.patch('/friend-requests/:id/decline', async (req, res) => {
    const { user_id } = req.body;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        await ensureSocialSchema();
        const existing = await pool.query(
            `SELECT *
             FROM friendships
             WHERE id = $1
               AND status = 'pending'
               AND ($2 = user_one_id OR $2 = user_two_id)`,
            [req.params.id, user_id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({ error: 'friend request not found' });
        }

        const friendship = existing.rows[0];
        if (friendship.requested_by === user_id) {
            await pool.query('DELETE FROM friendships WHERE id = $1', [req.params.id]);
            return res.json({ id: req.params.id, status: 'cancelled' });
        }

        const result = await pool.query(
            `UPDATE friendships
             SET status = 'rejected'
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET chat messages with a friend
router.get('/friends/:id/messages', async (req, res) => {
    const { user_id } = req.query;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        await ensureSocialSchema();
        await ensureFriendshipReadsSchema();
        const friendship = await getFriendshipForUser(req.params.id, user_id);
        if (!friendship) {
            return res.status(404).json({ error: 'friendship not found' });
        }

        const result = await pool.query(
            `SELECT cm.id,
                    cm.friendship_id,
                    cm.sender_id,
                    cm.body,
                    cm.created_at,
                    u.name AS sender_name
             FROM chat_messages cm
             JOIN users u ON u.id = cm.sender_id
             WHERE cm.friendship_id = $1
             ORDER BY cm.created_at ASC
             LIMIT 100`,
            [req.params.id]
        );

        await markFriendshipRead(req.params.id, user_id);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST mark a conversation as read (lightweight — no message payload returned)
router.post('/friends/:id/read', async (req, res) => {
    const { user_id } = req.body;
    if (isBlank(user_id)) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        await ensureSocialSchema();
        await ensureFriendshipReadsSchema();
        const friendship = await getFriendshipForUser(req.params.id, user_id);
        if (!friendship) {
            return res.status(404).json({ error: 'friendship not found' });
        }

        await markFriendshipRead(req.params.id, user_id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST send a chat message
router.post('/friends/:id/messages', async (req, res) => {
    const { user_id, body } = req.body;
    const message = typeof body === 'string' ? body.trim() : '';
    if (isBlank(user_id) || isBlank(message)) {
        return res.status(400).json({ error: 'user_id and message are required' });
    }
    if (message.length > 1000) {
        return res.status(400).json({ error: 'message must be 1000 characters or less' });
    }

    try {
        await ensureSocialSchema();
        const friendship = await getFriendshipForUser(req.params.id, user_id);
        if (!friendship) {
            return res.status(404).json({ error: 'friendship not found' });
        }

        const result = await pool.query(
            `INSERT INTO chat_messages (friendship_id, sender_id, body)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [req.params.id, user_id, message]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add a new user
router.post('/users', async (req, res) => {
    const { name, email, program, password } = req.body;
    if (isBlank(name) || isBlank(email) || isBlank(password)) {
        return res.status(400).json({ error: 'name, email and password are required' });
    }

    try {
        const hashed = bcrypt.hashSync(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, program, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, program, reputation_score, created_at',
            [name, email, program, hashed]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST login (email + password)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (isBlank(email) || isBlank(password)) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rowCount === 0) return res.status(401).json({ error: 'invalid credentials' });
        const user = result.rows[0];
        if (!user.password) return res.status(401).json({ error: 'invalid credentials' });
        const ok = bcrypt.compareSync(password, user.password);
        if (!ok) return res.status(401).json({ error: 'invalid credentials' });

        // return user without password
        const { password: _p, ...safe } = user;
        res.json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET user profile with offerings, requests, recent sessions and reputation
router.get('/users/:id/profile', async (req, res) => {
    const uid = req.params.id;
    try {
        const userQ = await pool.query('SELECT id, name, email, program, reputation_score, created_at FROM users WHERE id = $1', [uid]);
        if (userQ.rowCount === 0) return res.status(404).json({ error: 'user not found' });
        const user = userQ.rows[0];

        const offerings = (await pool.query(
            `SELECT so.id, so.skill_id, so.proficiency, so.created_at, s.name as skill_name
             FROM skill_offerings so JOIN skills s ON s.id = so.skill_id
             WHERE so.user_id = $1`, [uid]
        )).rows;

        const requests = (await pool.query(
            `SELECT sr.id, sr.skill_id, sr.urgency, sr.created_at, s.name as skill_name
             FROM skill_requests sr JOIN skills s ON s.id = sr.skill_id
             WHERE sr.user_id = $1`, [uid]
        )).rows;

        await ensureSessionVideoColumn();
        const recentSessions = (await pool.query(
            `SELECT s.id, s.circle_id, s.teacher_id, s.learner_id, s.skill_id, s.status, s.scheduled_at, s.completed_at, s.video_url, k.name as skill_name
             FROM sessions s JOIN skills k ON k.id = s.skill_id
             WHERE s.teacher_id = $1 OR s.learner_id = $1
             ORDER BY s.completed_at DESC NULLS LAST LIMIT 10`, [uid]
        )).rows;

        const reputation = (await pool.query('SELECT * FROM user_reputation WHERE id = $1', [uid])).rows[0] || null;

        res.json({ user, offerings, requests, recentSessions, reputation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Expand a cycle (mapping teacher->learner skill) for a cycle starting at :id
router.get('/cycles/:id/expand', async (req, res) => {
    const startId = req.params.id;
    try {
        const pl = await pool.query('SELECT * FROM potential_loops WHERE start_user = $1 AND next_user = $1 LIMIT 1', [startId]);
        if (pl.rowCount === 0) return res.status(404).json({ error: 'no cycle found for that user' });
        const loop = pl.rows[0];
        const path = loop.path; // array
        const mappings = [];
        for (let i = 0; i < path.length - 1; i++) {
            const teacher = path[i];
            const learner = path[i + 1];
            const match = await pool.query(
                `SELECT s.id AS skill_id, s.name AS skill_name
                 FROM skill_offerings so
                 JOIN skill_requests sr ON sr.skill_id = so.skill_id
                 JOIN skills s ON s.id = so.skill_id
                 WHERE so.user_id = $1 AND sr.user_id = $2
                 LIMIT 1`, [teacher, learner]
            );
            mappings.push({ teacher, learner, skill: match.rows[0] || null });
        }

        res.json({ loop, mappings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add a skill offering
router.post('/offerings', async (req, res) => {
    const { user_id, skill_id, proficiency } = req.body;
    if (isBlank(user_id) || isBlank(skill_id) || isBlank(proficiency)) {
        return res.status(400).json({ error: 'user_id, skill_id, and proficiency are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO skill_offerings (user_id, skill_id, proficiency) VALUES ($1, $2, $3) RETURNING *',
            [user_id, skill_id, proficiency]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add a skill request
router.post('/requests', async (req, res) => {
    const { user_id, skill_id, urgency } = req.body;
    if (isBlank(user_id) || isBlank(skill_id) || isBlank(urgency)) {
        return res.status(400).json({ error: 'user_id, skill_id, and urgency are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO skill_requests (user_id, skill_id, urgency) VALUES ($1, $2, $3) RETURNING *',
            [user_id, skill_id, urgency]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create a session
router.post('/sessions', async (req, res) => {
    const { circle_id, teacher_id, learner_id, skill_id, scheduled_at } = req.body;
    if (isBlank(teacher_id) || isBlank(learner_id) || isBlank(skill_id)) {
        return res.status(400).json({ error: 'teacher_id, learner_id, and skill_id are required' });
    }

    try {
        await ensureSessionVideoColumn();
        const result = await pool.query(
            `INSERT INTO sessions (circle_id, teacher_id, learner_id, skill_id, scheduled_at, video_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [circle_id || null, teacher_id, learner_id, skill_id, scheduled_at || null, buildVideoUrl()]
        );
        // Scheduling a session connects the two people so they can chat / video call
        await ensureAcceptedFriendship(teacher_id, learner_id);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH complete a session
router.patch('/sessions/:id/complete', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE sessions
             SET status = 'completed', completed_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await refreshReputationView();
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add a review
router.post('/reviews', async (req, res) => {
    const { session_id, reviewer_id, reviewee_id, rating, comment } = req.body;
    if (isBlank(session_id) || isBlank(reviewer_id) || isBlank(reviewee_id) || isBlank(rating)) {
        return res.status(400).json({ error: 'session_id, reviewer_id, reviewee_id, and rating are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO reviews (session_id, reviewer_id, reviewee_id, rating, comment)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [session_id, reviewer_id, reviewee_id, rating, comment || null]
        );

        await refreshReputationView();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Refresh reputation leaderboard materialized view
router.post('/reputation/refresh', async (req, res) => {
    try {
        await refreshReputationView();
        const result = await pool.query('SELECT * FROM user_reputation ORDER BY avg_rating DESC NULLS LAST');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
