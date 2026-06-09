
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS background_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_fields text[] NOT NULL DEFAULT '{}';

-- Prevent non-admins from changing hidden_fields on profiles
CREATE OR REPLACE FUNCTION public.guard_profile_hidden_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden_fields IS DISTINCT FROM OLD.hidden_fields
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change hidden_fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_hidden_fields ON public.profiles;
CREATE TRIGGER profiles_guard_hidden_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_hidden_fields();

-- Storage policies for event-backgrounds (bucket will be created via tool)
CREATE POLICY "event-bg read auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-backgrounds');

CREATE POLICY "event-bg admin write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event-bg admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "event-bg admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'));
