
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ff_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS game_profile_url text;

-- Storage policies for game-profiles bucket: user can upload/read own; admin reads all
CREATE POLICY "Users upload own game profile"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'game-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own game profile"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'game-profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner or admin read game profile"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'game-profiles'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

-- Restrict game_profile_url visibility: only owner or admin can read it
-- We rely on a column-level approach via policy: replace SELECT policy to exclude others from seeing it.
-- Simplest: leave row readable (already true) but null out via a view is overkill.
-- Instead: revoke select on column for non-admins.
REVOKE SELECT (game_profile_url) ON public.profiles FROM authenticated;
GRANT SELECT (id, real_name, ff_nick, ff_id, phone, avatar_url, created_at) ON public.profiles TO authenticated;

-- Admin gets full select via separate grant (service_role already has all)
-- For admins to read game_profile_url we need a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_game_profile_url(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN game_profile_url ELSE NULL END
  FROM public.profiles WHERE id = _user_id
$$;
GRANT EXECUTE ON FUNCTION public.get_game_profile_url(uuid) TO authenticated;
