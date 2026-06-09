import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/hooks/use-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-profile";
import { ArrowLeft, Phone, Shield, EyeOff, Eye, Gamepad2, Flame, X, Settings2, Swords, Trophy, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/integrantes/$id")({
  head: () => ({ meta: [{ title: "Perfil · GAME OVER" }] }),
  component: MemberProfilePage,
});

type HiddenField = "phone" | "real_name" | "ff_id";

const TYPE_META = {
  guerra: { label: "Guerra", icon: Swords },
  competencia: { label: "Competencia", icon: Trophy },
  versus: { label: "Versus", icon: Target },
} as const;

function MemberProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const [showGame, setShowGame] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const isSelf = user?.id === id;

  const { data: member } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_member", { _id: id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return { ...row, hidden_fields: row.hidden_fields ?? [], isAdmin: !!row.is_admin };
    },
  });

  const { data: participation } = useQuery({
    enabled: !!id,
    queryKey: ["participation", id],
    queryFn: async () => {
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", id);
      const groupIds = (gm ?? []).map(g => g.group_id);
      if (!groupIds.length) return { byType: { guerra: [], competencia: [], versus: [] } as Record<string, any[]>, total: 0 };
      const { data: groups } = await supabase.from("groups").select("id, name, event_id").in("id", groupIds);
      const eventIds = Array.from(new Set((groups ?? []).map(g => g.event_id)));
      const { data: events } = await supabase.from("events").select("id, title, type").in("id", eventIds);
      const evMap = new Map((events ?? []).map(e => [e.id, e]));
      const byType: Record<string, any[]> = { guerra: [], competencia: [], versus: [] };
      (groups ?? []).forEach(g => {
        const ev = evMap.get(g.event_id);
        if (!ev) return;
        byType[ev.type]?.push({ groupId: g.id, groupName: g.name, eventTitle: ev.title });
      });
      return { byType, total: groups?.length ?? 0 };
    },
  });

  const avatar = useAvatarUrl(member?.avatar_url ?? null);

  useEffect(() => { if (isSelf) navigate({ to: "/perfil", replace: true }); }, [isSelf, navigate]);

  if (!member) {
    return (
      <div className="px-5 pt-8">
        <Link to="/integrantes" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Volver</Link>
        <p className="mt-6 text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const hidden = member.hidden_fields as string[];
  const canSee = (f: HiddenField) => !!isAdmin || isSelf || !hidden.includes(f);
  const realName = canSee("real_name") ? member.real_name : null;
  const ffId = canSee("ff_id") ? member.ff_id : null;
  const phone = canSee("phone") ? member.phone : null;

  return (
    <div className="px-5 pt-8 pb-8 space-y-5">
      <Link to="/integrantes" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Integrantes</Link>

      <section className="surface-card rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl overflow-hidden bg-surface-2 flex items-center justify-center border border-primary/50 shrink-0">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <Flame className="h-8 w-8 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-glow-orange truncate">{member.ff_nick}</p>
            {realName && <p className="text-xs text-muted-foreground truncate">{realName}</p>}
            {member.isAdmin && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase font-black px-1.5 py-0.5 rounded gradient-neon text-primary-foreground">
                <Shield className="h-2.5 w-2.5" /> Admin
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setShowPrivacy(true)} className="py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-secondary flex items-center justify-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Privacidad
            </button>
            <button onClick={() => setShowGame(true)} className="py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-center gap-1.5">
              <Gamepad2 className="h-3.5 w-3.5" /> Ver juego
            </button>
          </div>
        )}
      </section>

      <section className="surface-card rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Datos</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <Field label="ID de Free Fire" value={ffId ?? "—"} dim={!ffId && hidden.includes("ff_id")} />
          <Field label="Nombre real" value={realName ?? "—"} dim={!realName && hidden.includes("real_name")} />
          {phone ? (
            <a href={`tel:${phone}`} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-input/40 border border-border">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Teléfono</p>
                <p className="font-bold truncate flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-secondary" />{phone}</p>
              </div>
            </a>
          ) : (
            <Field label="Teléfono" value="—" dim={hidden.includes("phone")} />
          )}
        </dl>
      </section>

      <section className="surface-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">Participaciones</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{participation?.total ?? 0}</span>
        </div>
        <div className="space-y-3">
          {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map(t => {
            const items = participation?.byType[t] ?? [];
            const Meta = TYPE_META[t];
            return (
              <div key={t} className="rounded-lg border border-border bg-input/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Meta.icon className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wider font-bold">{Meta.label}</p>
                  </div>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-surface-2">{items.length}x</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Sin participaciones.</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((it: any) => (
                      <li key={it.groupId} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                        <span className="truncate font-semibold">{it.eventTitle}</span>
                        <span className="text-muted-foreground truncate shrink-0">{it.groupName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {showGame && <GameProfileModal userId={member.id} onClose={() => setShowGame(false)} />}
      {showPrivacy && <PrivacyModal member={member as any} onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

function Field({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-input/40 border border-border">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-bold truncate">{value}</p>
      </div>
      {dim && <EyeOff className="h-4 w-4 text-primary shrink-0" />}
    </div>
  );
}

function GameProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: url } = useQuery({
    queryKey: ["game-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_game_profile_url", { _user_id: userId });
      if (error) throw error;
      if (!data) return null;
      const { data: signed } = await supabase.storage.from("game-profiles").createSignedUrl(data, 3600);
      return signed?.signedUrl ?? null;
    },
  });
  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur flex items-center justify-center p-5" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-surface flex items-center justify-center"><X /></button>
      <div className="surface-card rounded-2xl p-3 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-1">Perfil del juego</p>
        {url ? <img src={url} alt="Perfil del juego" className="w-full rounded-lg" /> : <p className="text-muted-foreground text-sm p-6 text-center">Sin imagen</p>}
      </div>
    </div>
  );
}

const FIELD_LABEL: Record<HiddenField, string> = {
  phone: "Teléfono", real_name: "Nombre real", ff_id: "ID de Free Fire",
};

function PrivacyModal({ member, onClose }: { member: { id: string; ff_nick: string; hidden_fields: string[] }; onClose: () => void }) {
  const qc = useQueryClient();
  const [hidden, setHidden] = useState<Set<string>>(new Set(member.hidden_fields));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ hidden_fields: Array.from(hidden) }).eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Privacidad actualizada");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["member", member.id] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = (f: HiddenField) => {
    setHidden(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur flex items-center justify-center p-5" onClick={onClose}>
      <div className="surface-card rounded-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Privacidad de</p>
            <p className="font-black text-glow-orange">{member.ff_nick}</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-surface flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Marca los campos que NO podrán ver los demás integrantes.</p>
        <div className="mt-4 space-y-2">
          {(["phone","real_name","ff_id"] as HiddenField[]).map(f => {
            const on = hidden.has(f);
            return (
              <button key={f} onClick={() => toggle(f)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${on ? "border-primary bg-primary/10" : "border-border"}`}>
                {on ? <EyeOff className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-semibold flex-1 text-left">{FIELD_LABEL[f]}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{on ? "Oculto" : "Visible"}</span>
              </button>
            );
          })}
        </div>
        <button disabled={save.isPending} onClick={() => save.mutate()} className="mt-5 w-full gradient-neon font-bold py-2.5 rounded-lg text-primary-foreground disabled:opacity-50">
          Guardar
        </button>
      </div>
    </div>
  );
}
