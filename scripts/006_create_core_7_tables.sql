-- Create current core 7 tables for gohwang-live
-- Tables:
-- 1) teams
-- 2) team_players
-- 3) matches
-- 4) match_lineups
-- 5) match_lineup_players
-- 6) match_events
-- 7) admins

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure enum exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'match_event_type'
  ) THEN
    CREATE TYPE public.match_event_type AS ENUM (
      'goal',
      'own_goal',
      'yellow_card',
      'red_card',
      'substitution',
      'half_start',
      'half_end',
      'second_half_start',
      'second_half_end',
      'extra',
      'extra_time_start',
      'extra_time_end',
      'shootout_goal',
      'shootout_missed'
    );
  END IF;
END
$$;

-- Keep enum in sync when this script runs against an existing DB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'own_goal'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'own_goal';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'half_start'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'half_start';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'half_end'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'half_end';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'second_half_start'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'second_half_start';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'second_half_end'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'second_half_end';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'extra'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'extra';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'extra_time_start'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'extra_time_start';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'extra_time_end'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'extra_time_end';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'shootout_goal'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'shootout_goal';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'match_event_type'
      AND e.enumlabel = 'shootout_missed'
  ) THEN
    ALTER TYPE public.match_event_type ADD VALUE 'shootout_missed';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  jersey_number int4 NOT NULL,
  position text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_players_team_jersey_unique UNIQUE (team_id, jersey_number)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  home_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  away_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  home_score int4 NOT NULL DEFAULT 0,
  away_score int4 NOT NULL DEFAULT 0,
  location text NOT NULL,
  match_date timestamptz NOT NULL,
  youtube_url text,
  display_status boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'SCHEDULED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_team_not_same CHECK (home_team_id <> away_team_id),
  CONSTRAINT matches_status_check CHECK (status IN ('SCHEDULED', 'LIVE', 'ENDED'))
);

CREATE TABLE IF NOT EXISTS public.match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  team_side text NOT NULL CHECK (team_side IN ('HOME', 'AWAY')),
  formation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_lineups_match_side_unique UNIQUE (match_id, team_side)
);

CREATE TABLE IF NOT EXISTS public.match_lineup_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_lineup_id uuid NOT NULL REFERENCES public.match_lineups(id) ON DELETE CASCADE,
  team_player_id uuid NOT NULL REFERENCES public.team_players(id) ON DELETE RESTRICT,
  lineup_role text NOT NULL CHECK (lineup_role IN ('STARTER', 'SUBSTITUTE')),
  player_status text NOT NULL DEFAULT 'available' CHECK (player_status IN ('available', 'sub_in', 'sub_out', 'sent_off')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_lineup_players_unique UNIQUE (match_lineup_id, team_player_id)
);

CREATE TABLE IF NOT EXISTS public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type public.match_event_type NOT NULL,
  team_side text NOT NULL CHECK (team_side IN ('HOME', 'AWAY', 'NONE')),
  player_id uuid REFERENCES public.match_lineup_players(id) ON DELETE SET NULL,
  sort_minute int4 NOT NULL DEFAULT 0,
  display_minute int4 NOT NULL DEFAULT 0,
  period text,
  description text,
  assist_player_id uuid REFERENCES public.match_lineup_players(id) ON DELETE SET NULL,
  sub_in_player_id uuid REFERENCES public.match_lineup_players(id) ON DELETE SET NULL,
  sub_out_player_id uuid REFERENCES public.match_lineup_players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'MANAGER' CHECK (role IN ('MANAGER', 'ADMIN')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON public.team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON public.matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON public.matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_match_id ON public.match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_match_lineup_players_lineup_id ON public.match_lineup_players(match_lineup_id);
CREATE INDEX IF NOT EXISTS idx_match_lineup_players_team_player_id ON public.match_lineup_players(team_player_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON public.match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_timeline_sort ON public.match_events(match_id, sort_minute DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_set_updated_at ON public.matches;
CREATE TRIGGER trg_matches_set_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_match_lineups_set_updated_at ON public.match_lineups;
CREATE TRIGGER trg_match_lineups_set_updated_at
BEFORE UPDATE ON public.match_lineups
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_match_lineup_players_set_updated_at ON public.match_lineup_players;
CREATE TRIGGER trg_match_lineup_players_set_updated_at
BEFORE UPDATE ON public.match_lineup_players
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

