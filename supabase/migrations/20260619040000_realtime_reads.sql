-- ════════════════════════════════════════
-- Enable Supabase Realtime for read receipts.
-- Adds friendship_reads to the supabase_realtime publication so a sender is
-- notified when the recipient's last_read_at advances ("seen by them").
-- ════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'friendship_reads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE friendship_reads;
    END IF;
END $$;

ALTER TABLE friendship_reads REPLICA IDENTITY FULL;
