-- ════════════════════════════════════════
-- Cycle ranking — score potential_loops by quality
--   * avg reputation of the people in the cycle
--   * avg urgency of the wants being satisfied
--   * avg proficiency of the skills being taught
--   * shorter cycles preferred
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW potential_loops_ranked AS
WITH loops AS (
    SELECT pl.*, row_number() OVER () AS loop_id
    FROM potential_loops pl
),
-- one row per directed edge (teacher -> learner) in each cycle
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
             COALESCE(r.avg_reputation, 0) * 1.0    -- reputation (0-5)
           + COALESCE(a.avg_urgency, 0) * 1.0       -- urgency (0-3)
           + COALESCE(a.avg_proficiency, 0) * 0.5   -- proficiency (0-3)
           - (l.depth - 2) * 1.5                    -- shorter cycles preferred
       )::numeric, 2) AS score
FROM loops l
LEFT JOIN edge_agg a ON a.loop_id = l.loop_id
LEFT JOIN rep_agg  r ON r.loop_id = l.loop_id;
