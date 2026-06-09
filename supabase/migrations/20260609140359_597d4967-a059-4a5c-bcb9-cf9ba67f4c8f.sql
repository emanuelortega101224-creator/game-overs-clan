DROP POLICY IF EXISTS "Admin inserts settings" ON public.clan_settings;

CREATE POLICY "Admin inserts settings"
ON public.clan_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin deletes settings" ON public.clan_settings;

CREATE POLICY "Admin deletes settings"
ON public.clan_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));