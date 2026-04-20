-- Match timeline schema update
-- - minute -> sort_minute
-- - add display_minute
-- - add period

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'match_events'
      AND column_name = 'minute'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'match_events'
      AND column_name = 'sort_minute'
  ) THEN
    ALTER TABLE public.match_events RENAME COLUMN minute TO sort_minute;
  END IF;
END $$;

ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS display_minute int4,
  ADD COLUMN IF NOT EXISTS period text;

UPDATE public.match_events
SET
  display_minute = COALESCE(display_minute, sort_minute),
  period = COALESCE(
    period,
    CASE
      WHEN event_type IN ('half_start', 'half_end') THEN '전반'
      WHEN event_type IN ('second_half_start', 'second_half_end') THEN '후반'
      WHEN event_type IN ('extra_time_start', 'extra_time_end', 'shootout_goal', 'shootout_missed') THEN '연장'
      ELSE NULL
    END
  )
WHERE display_minute IS NULL OR period IS NULL;
