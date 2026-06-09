
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_time timestamptz,
  ADD COLUMN IF NOT EXISTS base_timezone text;
