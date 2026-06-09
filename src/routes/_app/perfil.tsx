import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, EyeOff, Phone, Gamepad2, Shield, Flame, Swords, Trophy, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useIsAdmin } from "@/hooks/use-profile";
import { useAvatarUrl } from "@/hooks/use-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useTexts } from "@/hooks/use-texts";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Mi perfil · GAME OVER" }] }),
  component: PerfilPage,
});

const TYPE_META = {
  guerra: { label: "Guerra", icon: Swords },
  competencia: { label: "Competencia", icon: Trophy },
  versus: { label: "Versus", icon: Target },
} as const;

function PerfilPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const avatar = useAvatarUrl(profile?.avatar_url);
  const personalPhoto = useSignedUrl("game-profiles", (profile as any)?.game_profile_url);
  const { t } = useTexts();

  const { data: participation } = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-participation", user?.id],
    queryFn: async () => {
      const { data: gm } = await supabase.from("group_members").select("group_id").eq("user_id", user!.id);
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

  const hidden: string[] = (profile as any)?.hidden_fields ?? [];
  const isHidden = (f: string) => hidden.includes(f);

  return (
    <div className="px-5 pt-8 pb-8 space-y-5">
      <Link to="/panel" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Volver</Link>
      <h1 className="text-2xl font-black text-glow-orange">{t("perfil.title", "MI PERFIL")}</h1>

      <section className="surface-card rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl overflow-hidden bg-surface-2 flex items-center justify-center border border-primary/50 shrink-0">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <Flame className="h-8 w-8 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-glow-orange truncate">{profile?.ff_nick}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.real_name}</p>
            {isAdmin && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase font-black px-1.5 py-0.5 rounded gradient-neon text-primary-foreground">
                <Shield className="h-2.5 w-2.5" /> Admin
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="surface-card rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">{t("perfil.data", "Datos")}</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <Field label={t("perfil.ffid", "ID de Free Fire")} value={profile?.ff_id ?? "—"} hidden={isHidden("ff_id")} />
          <Field label={t("perfil.phone", "Teléfono")} value={profile?.phone ?? "—"} hidden={isHidden("phone")} icon={Phone} />
          <Field label={t("perfil.real_name", "Nombre real")} value={profile?.real_name ?? "—"} hidden={isHidden("real_name")} />
        </dl>
        {hidden.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <EyeOff className="h-3 w-3" /> {t("perfil.hidden.help", "Los campos marcados están ocultos a otros integrantes.")}
          </p>
        )}
      </section>

      <section className="surface-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider">{t("perfil.participaciones", "Participaciones")}</h2>
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
                      <li key={it.groupId}>
                        <Link to="/grupos/$id" params={{ id: it.groupId }}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-xs">
                          <span className="truncate font-semibold">{it.eventTitle}</span>
                          <span className="text-muted-foreground truncate shrink-0">{it.groupName}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-primary" />{t("perfil.game.title", "Mi foto registrada")}</h2>
        {personalPhoto
          ? <img src={personalPhoto} alt="Foto personal" className="mt-3 w-full rounded-lg" />
          : <p className="mt-3 text-xs text-muted-foreground">Sin foto registrada.</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">{t("perfil.game.help", "Esta imagen se usa para identificar tu cuenta dentro de la app.")}</p>
      </section>
    </div>
  );
}

function Field({ label, value, hidden, icon: Icon }: { label: string; value: string; hidden: boolean; icon?: any }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-input/40 border border-border">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-bold truncate flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-secondary" />} {value}
        </p>
      </div>
      {hidden && <EyeOff className="h-4 w-4 text-primary shrink-0" />}
    </div>
  );
}
