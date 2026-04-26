-- Enable RLS for core 7 tables and apply policies.
-- Viewer (anon/authenticated): read-only access for match data
-- Operator (authenticated + admins table): write access

-- 1) Helper function: check operator authority
-- SECURITY DEFINER is used so policy checks can read admins table safely.
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.email = auth.jwt() ->> 'email'
      AND a.is_active = true
      AND a.role IN ('MANAGER', 'ADMIN')
  );
$$;

REVOKE ALL ON FUNCTION public.is_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_operator() TO anon, authenticated;

-- 2) Turn on RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineup_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3) Drop old policies (idempotent)
DROP POLICY IF EXISTS teams_select_all ON public.teams;
DROP POLICY IF EXISTS teams_operator_write ON public.teams;

DROP POLICY IF EXISTS team_players_select_all ON public.team_players;
DROP POLICY IF EXISTS team_players_operator_write ON public.team_players;

DROP POLICY IF EXISTS matches_select_all ON public.matches;
DROP POLICY IF EXISTS matches_operator_write ON public.matches;

DROP POLICY IF EXISTS match_lineups_select_all ON public.match_lineups;
DROP POLICY IF EXISTS match_lineups_operator_write ON public.match_lineups;

DROP POLICY IF EXISTS match_lineup_players_select_all ON public.match_lineup_players;
DROP POLICY IF EXISTS match_lineup_players_operator_write ON public.match_lineup_players;

DROP POLICY IF EXISTS match_events_select_all ON public.match_events;
DROP POLICY IF EXISTS match_events_operator_write ON public.match_events;

DROP POLICY IF EXISTS admins_self_select ON public.admins;
DROP POLICY IF EXISTS admins_superadmin_write ON public.admins;

-- 4) Public read policies (viewer pages + SSE endpoint)
CREATE POLICY teams_select_all
ON public.teams
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY team_players_select_all
ON public.team_players
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY matches_select_all
ON public.matches
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY match_lineups_select_all
ON public.match_lineups
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY match_lineup_players_select_all
ON public.match_lineup_players
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY match_events_select_all
ON public.match_events
FOR SELECT
TO anon, authenticated
USING (true);

-- 5) Operator write policies
CREATE POLICY teams_operator_write
ON public.teams
FOR ALL
TO authenticated
USING (public.is_operator())
WITH CHECK (public.is_operator());

CREATE POLICY team_players_operator_write
ON public.team_players
FOR ALL
TO authenticated
USING (public.is_operator())
WITH CHECK (public.is_operator());

CREATE POLICY matches_operator_write
ON public.matches
FOR ALL
TO authenticated
USING (public.is_operator())
WITH CHECK (public.is_operator());

CREATE POLICY match_lineups_operator_write
ON public.match_lineups
FOR ALL
TO authenticated
USING (public.is_operator())
WITH CHECK (public.is_operator());

CREATE POLICY match_lineup_players_operator_write
ON public.match_lineup_players
FOR ALL
TO authenticated
USING (public.is_operator())
WITH CHECK (public.is_operator());

CREATE POLICY match_events_operator_write
ON public.match_events
FOR ALL
TO authenticated
USING (public.is_operator())
WITH CHECK (public.is_operator());

-- 6) Admins table policies
-- Operator can read own admin row (for diagnostics/audit UI if needed)
CREATE POLICY admins_self_select
ON public.admins
FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

-- Only ADMIN can modify admins table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.email = auth.jwt() ->> 'email'
      AND a.is_active = true
      AND a.role = 'ADMIN'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY admins_superadmin_write
ON public.admins
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

