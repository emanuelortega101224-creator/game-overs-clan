ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'sorteo';

CREATE TABLE IF NOT EXISTS public.raffle_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  real_name text NOT NULL,
  ff_id text NOT NULL,
  ff_nick text NOT NULL,
  whatsapp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffle_registrations TO authenticated;
GRANT ALL ON public.raffle_registrations TO service_role;

ALTER TABLE public.raffle_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raffle regs readable by authenticated"
  ON public.raffle_registrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "User registers self"
  ON public.raffle_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User updates own raffle reg or admin"
  ON public.raffle_registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "User deletes own raffle reg or admin"
  ON public.raffle_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.raffle_set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_raffle_regs_updated ON public.raffle_registrations;
CREATE TRIGGER trg_raffle_regs_updated BEFORE UPDATE ON public.raffle_registrations
  FOR EACH ROW EXECUTE FUNCTION public.raffle_set_updated_at();