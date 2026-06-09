
-- 1) Tighten profiles SELECT: only self or admin can read raw rows
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;

CREATE POLICY "Profiles readable by self or admin"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2) Masked listing for integrantes page
CREATE OR REPLACE FUNCTION public.list_members()
RETURNS TABLE (
  id uuid,
  ff_nick text,
  avatar_url text,
  real_name text,
  ff_id text,
  hidden_fields text[],
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.ff_nick,
    p.avatar_url,
    CASE WHEN public.has_role(auth.uid(),'admin') OR auth.uid() = p.id OR NOT ('real_name' = ANY(p.hidden_fields))
         THEN p.real_name ELSE NULL END,
    CASE WHEN public.has_role(auth.uid(),'admin') OR auth.uid() = p.id OR NOT ('ff_id' = ANY(p.hidden_fields))
         THEN p.ff_id ELSE NULL END,
    p.hidden_fields,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'),
    p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
  ORDER BY p.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_members() TO authenticated;

-- 3) Masked single-member fetch
CREATE OR REPLACE FUNCTION public.get_member(_id uuid)
RETURNS TABLE (
  id uuid,
  ff_nick text,
  avatar_url text,
  real_name text,
  ff_id text,
  phone text,
  hidden_fields text[],
  is_admin boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.ff_nick, p.avatar_url,
    CASE WHEN public.has_role(auth.uid(),'admin') OR auth.uid() = p.id OR NOT ('real_name' = ANY(p.hidden_fields))
         THEN p.real_name ELSE NULL END,
    CASE WHEN public.has_role(auth.uid(),'admin') OR auth.uid() = p.id OR NOT ('ff_id' = ANY(p.hidden_fields))
         THEN p.ff_id ELSE NULL END,
    CASE WHEN public.has_role(auth.uid(),'admin') OR auth.uid() = p.id OR NOT ('phone' = ANY(p.hidden_fields))
         THEN p.phone ELSE NULL END,
    p.hidden_fields,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
  FROM public.profiles p
  WHERE p.id = _id AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member(uuid) TO authenticated;

-- 4) Group member roster (non-sensitive fields) for chat UI; only group members may call
CREATE OR REPLACE FUNCTION public.get_group_member_profiles(_group_id uuid)
RETURNS TABLE (id uuid, ff_nick text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.ff_nick, p.avatar_url
  FROM public.profiles p
  JOIN public.group_members gm ON gm.user_id = p.id
  WHERE gm.group_id = _group_id
    AND (public.is_group_member(_group_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
$$;

REVOKE ALL ON FUNCTION public.get_group_member_profiles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_member_profiles(uuid) TO authenticated;

-- 5) Storage DELETE policies
-- game-profiles: owner (folder = user uid) or admin
CREATE POLICY "game-profiles owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'game-profiles'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

-- voice-notes: owner (folder = user uid) or admin
CREATE POLICY "voice-notes owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-notes'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

-- 6) Lock trigger / helper functions from being called as RPCs
REVOKE ALL ON FUNCTION public.guard_profile_hidden_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_group_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_game_profile_url(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_profile_url(uuid) TO authenticated;
