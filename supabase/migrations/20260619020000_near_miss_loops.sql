-- ════════════════════════════════════════
-- Near-miss loops — chains that are "1 connection away" from closing.
-- An open chain  start -> ... -> end  (all edges already exist) where the
-- end user teaches a skill the start user does NOT yet request. If the start
-- user added a request for that skill, the cycle would close.
-- ════════════════════════════════════════
CREATE OR REPLACE VIEW near_miss_loops AS
WITH RECURSIVE chain AS (
    -- Base: direct teach pairs (start teaches next)
    SELECT so.user_id              AS start_user,
           sr.user_id              AS next_user,
           ARRAY[so.user_id, sr.user_id] AS path,
           1                       AS depth
    FROM skill_offerings so
    JOIN skill_requests sr ON sr.skill_id = so.skill_id
    WHERE so.user_id <> sr.user_id

    UNION ALL

    -- Recurse: extend with new, distinct users only (chain stays open)
    SELECT c.start_user,
           sr.user_id,
           c.path || sr.user_id,
           c.depth + 1
    FROM chain c
    JOIN skill_offerings so ON so.user_id = c.next_user
    JOIN skill_requests  sr ON sr.skill_id = so.skill_id
    WHERE sr.user_id <> ALL(c.path)   -- never revisit (and never return to start)
      AND c.depth < 4                 -- cap chain length (max loop size 5)
)
SELECT c.start_user,
       c.next_user        AS end_user,
       c.path,
       c.depth,
       miss.skill_id      AS missing_skill_id
FROM chain c
JOIN skill_offerings miss ON miss.user_id = c.next_user          -- end user offers a skill...
WHERE c.depth >= 1
  AND c.next_user <> c.start_user
  -- ...that the start user does NOT already request (otherwise it's a real loop)
  AND NOT EXISTS (
        SELECT 1 FROM skill_requests sr0
        WHERE sr0.user_id = c.start_user AND sr0.skill_id = miss.skill_id
  )
  -- and the end user isn't already teaching the start user something they want
  -- (that case is an already-closed loop, handled by potential_loops)
  AND NOT EXISTS (
        SELECT 1
        FROM skill_offerings so2
        JOIN skill_requests sr2 ON sr2.skill_id = so2.skill_id
        WHERE so2.user_id = c.next_user AND sr2.user_id = c.start_user
  );
