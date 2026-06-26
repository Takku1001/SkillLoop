ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;
ALTER TABLE friendships ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE friendships ADD CONSTRAINT friendships_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'));
