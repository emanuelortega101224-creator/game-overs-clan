
-- Site texts (editable from admin)
CREATE TABLE IF NOT EXISTS public.site_texts (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_texts TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.site_texts TO authenticated;
GRANT ALL ON public.site_texts TO service_role;
ALTER TABLE public.site_texts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "texts readable" ON public.site_texts;
CREATE POLICY "texts readable" ON public.site_texts FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes texts" ON public.site_texts;
CREATE POLICY "admin writes texts" ON public.site_texts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backgrounds per event type
ALTER TABLE public.clan_settings
  ADD COLUMN IF NOT EXISTS bg_guerra TEXT,
  ADD COLUMN IF NOT EXISTS bg_competencia TEXT,
  ADD COLUMN IF NOT EXISTS bg_versus TEXT;

-- Stickers in chat
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sticker_path TEXT;

CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stickers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stickers TO authenticated;
GRANT ALL ON public.stickers TO service_role;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stickers readable" ON public.stickers;
CREATE POLICY "stickers readable" ON public.stickers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manages stickers" ON public.stickers;
CREATE POLICY "admin manages stickers" ON public.stickers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enforce group capacity at DB level
CREATE OR REPLACE FUNCTION public.enforce_group_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_count INT;
  cap INT;
BEGIN
  SELECT max_members INTO cap FROM public.groups WHERE id = NEW.group_id;
  SELECT COUNT(*) INTO cur_count FROM public.group_members WHERE group_id = NEW.group_id;
  IF cur_count >= cap THEN
    RAISE EXCEPTION 'GROUP_FULL' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_group_capacity ON public.group_members;
CREATE TRIGGER trg_enforce_group_capacity
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_capacity();
