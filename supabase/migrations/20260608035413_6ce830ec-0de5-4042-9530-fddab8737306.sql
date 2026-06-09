
CREATE POLICY "stickers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stickers');
CREATE POLICY "admin upload stickers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update stickers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete stickers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'));
