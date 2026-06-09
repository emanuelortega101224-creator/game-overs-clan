
-- Tighten SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile() FROM PUBLIC, anon, authenticated;

-- Storage policies: avatars (private, but any authenticated user can read)
CREATE POLICY "Avatars: auth read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "Avatars: own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars: own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars: own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies: voice-notes (per group)
CREATE POLICY "Voice: members read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND public.is_group_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "Voice: members upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND public.is_group_member(((storage.foldername(name))[1])::uuid, auth.uid()));
