-- Add player ID fields to match_events table for better tracking
ALTER TABLE public.match_events
ADD COLUMN player_id TEXT,
ADD COLUMN assist_player_id TEXT,
ADD COLUMN substituted_in_player_id TEXT,
ADD COLUMN substituted_out_player_id TEXT;