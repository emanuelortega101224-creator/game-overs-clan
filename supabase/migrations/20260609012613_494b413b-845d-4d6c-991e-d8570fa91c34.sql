
CREATE TABLE public.event_mvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_mvps TO authenticated;
GRANT ALL ON public.event_mvps TO service_role;

ALTER TABLE public.event_mvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MVPs readable by authenticated"
  ON public.event_mvps FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert MVPs"
  ON public.event_mvps FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update MVPs"
  ON public.event_mvps FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete MVPs"
  ON public.event_mvps FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_mvp_ranking()
RETURNS TABLE(
  user_id UUID,
  ff_nick TEXT,
  avatar_url TEXT,
  total INT,
  guerra INT,
  competencia INT,
  versus INT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.ff_nick,
    p.avatar_url,
    COUNT(*)::int AS total,
    SUM(CASE WHEN e.type = 'guerra' THEN 1 ELSE 0 END)::int AS guerra,
    SUM(CASE WHEN e.type = 'competencia' THEN 1 ELSE 0 END)::int AS competencia,
    SUM(CASE WHEN e.type = 'versus' THEN 1 ELSE 0 END)::int AS versus
  FROM public.event_mvps m
  JOIN public.events e ON e.id = m.event_id
  JOIN public.profiles p ON p.id = m.user_id
  WHERE auth.uid() IS NOT NULL
  GROUP BY p.id, p.ff_nick, p.avatar_url
  ORDER BY total DESC, p.ff_nick ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_mvp_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mvp_ranking() TO authenticated;
