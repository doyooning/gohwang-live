-- Disable RLS on all tables for public access (for demo purposes)
-- In production, you should create proper RLS policies instead

ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineup_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
