-- Add player status tracking to lineup players
ALTER TABLE public.match_lineup_players
  ADD COLUMN IF NOT EXISTS player_status text DEFAULT 'available';

UPDATE public.match_lineup_players
SET player_status = 'available'
WHERE player_status IS NULL;
