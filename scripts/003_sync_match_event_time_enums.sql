-- Ensure match_event_type enum includes required time-related values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'match_event_type'
  ) THEN
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
  END IF;
END
$$;
