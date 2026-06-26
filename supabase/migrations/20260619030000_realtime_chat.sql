-- ════════════════════════════════════════
-- Enable Supabase Realtime for chat messages.
-- Adds chat_messages to the supabase_realtime publication so clients receive
-- INSERT events over the Realtime websocket. REPLICA IDENTITY FULL ensures
-- full row payloads (also needed for later UPDATE/DELETE-based features).
-- ════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;

ALTER TABLE chat_messages REPLICA IDENTITY FULL;
