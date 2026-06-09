
-- 2. Permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admin manages permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default permissions
INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('lider', 'create_event', true),
  ('lider', 'edit_event', true),
  ('lider', 'delete_event', false),
  ('lider', 'create_group', true),
  ('lider', 'edit_group', true),
  ('lider', 'delete_group', true),
  ('lider', 'moderate_chat', true),
  ('lider', 'assign_mvp', true),
  ('lider', 'view_member_contacts', true),
  ('lider', 'manage_raffles', true),
  ('lider', 'manage_stickers', false),
  ('lider', 'edit_site_texts', false),
  ('lider_interno', 'create_event', false),
  ('lider_interno', 'edit_event', false),
  ('lider_interno', 'delete_event', false),
  ('lider_interno', 'create_group', true),
  ('lider_interno', 'edit_group', true),
  ('lider_interno', 'delete_group', false),
  ('lider_interno', 'moderate_chat', true),
  ('lider_interno', 'assign_mvp', false),
  ('lider_interno', 'view_member_contacts', false),
  ('lider_interno', 'manage_raffles', false),
  ('lider_interno', 'manage_stickers', false),
  ('lider_interno', 'edit_site_texts', false),
  ('decano', 'create_event', false),
  ('decano', 'edit_event', false),
  ('decano', 'delete_event', false),
  ('decano', 'create_group', false),
  ('decano', 'edit_group', false),
  ('decano', 'delete_group', false),
  ('decano', 'moderate_chat', false),
  ('decano', 'assign_mvp', false),
  ('decano', 'view_member_contacts', false),
  ('decano', 'manage_raffles', false),
  ('decano', 'manage_stickers', false),
  ('decano', 'edit_site_texts', false)
ON CONFLICT DO NOTHING;

-- 3. has_permission function (admin always allowed)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id
        AND rp.permission = _permission
        AND rp.allowed = true
    );
$$;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

-- 4. Update events/groups policies to allow permitted leaders
DROP POLICY IF EXISTS "Admin manages events" ON public.events;
CREATE POLICY "Permitted users insert events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'create_event'));
CREATE POLICY "Permitted users update events" ON public.events
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'edit_event'))
  WITH CHECK (public.has_permission(auth.uid(), 'edit_event'));
CREATE POLICY "Permitted users delete events" ON public.events
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'delete_event'));

DROP POLICY IF EXISTS "Admin manages groups" ON public.groups;
CREATE POLICY "Permitted users insert groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'create_group'));
CREATE POLICY "Permitted users update groups" ON public.groups
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'edit_group'))
  WITH CHECK (public.has_permission(auth.uid(), 'edit_group'));
CREATE POLICY "Permitted users delete groups" ON public.groups
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'delete_group'));

-- 5. message_reads for delivery/read receipts
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

GRANT SELECT, INSERT ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members read receipts"
  ON public.message_reads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_group_member(m.group_id, auth.uid())
    )
  );

CREATE POLICY "User marks own reads"
  ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_group_member(m.group_id, auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);

-- 6. Realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
