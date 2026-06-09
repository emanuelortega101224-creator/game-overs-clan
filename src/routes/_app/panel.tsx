import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Hash, Calendar, Users, LogOut, Shield, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useIsAdmin } from "@/hooks/use-profile";
import { signOut } from "@/components/auth-gate";
import { useAvatarUrl } from "@/hooks/use-avatar";
import { useTexts } from "@/hooks/use-texts";
import { useRealtime } from "@/hooks/use-realtime";
import clanLogo from "@/assets/clan-logo.png";

export const Route = createFileRoute("/_app/panel")({
  head: () => ({ meta: [{ title: "Panel · GAME OVER" }] }),
  component: PanelPage,
});

function PanelPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const avatar = useAvatarUrl(profile?.avatar_url);
  const { t } = useTexts();
  useRealtime("panel", [
    { table: "clan_settings", keys: [["settings"]] },
    { table: "site_texts", keys: [["site_texts"]] },
  ]);
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("clan_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  const whatsapp = settings?.whatsapp_url || "";
  const discord = settings?.discord_url || "";

  return (
    <div className="px-5 pt-8 pb-8 space-y-8">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3">
        <Link to="/perfil" className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl overflow-hidden border border-primary/40 bg-surface flex items-center justify-center shrink-0">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> :
              <img src={clanLogo} alt="" className="h-9 w-9 object-contain" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">{t("panel.welcome", "Bienvenido")}</p>
            <p className="font-black text-glow-orange leading-tight truncate">{profile?.ff_nick || "Soldado"}</p>
          </div>
        </Link>
        <button onClick={signOut} aria-label="Cerrar sesión"
          className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Hero */}
      <section className="surface-card rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-44 w-44 opacity-90 pointer-events-none">
          <img src={clanLogo} alt="" className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(232,38,31,0.55)]" />
        </div>
        <div className="relative max-w-[55%]">
          <p className="text-[10px] uppercase tracking-[0.3em] text-secondary">{t("panel.hero.kicker", "Clan oficial")}</p>
          <h1 className="mt-1 text-3xl font-black text-glow-orange leading-none">{t("panel.hero.title", "FREE FIRE")}</h1>
          <p className="mt-3 text-xs text-muted-foreground leading-snug">{t("panel.hero.subtitle", "Únete a la batalla. Comparte estrategia.")}</p>
        </div>
      </section>

      {/* Comunidad */}
      <section className="space-y-3">
        <SectionLabel>{t("panel.section.community", "Comunidad")}</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <CommBtn label="WhatsApp" icon={MessageCircle} href={whatsapp} color="from-[#e8261f] to-[#5a0a06]" />
          <CommBtn label="Discord" icon={Hash} href={discord} color="from-white/80 to-white/10" />
        </div>
      </section>

      {/* Clan */}
      <section className="space-y-3">
        <SectionLabel>{t("panel.section.clan", "Clan")}</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <NavBtn label="Eventos" icon={Calendar} to="/eventos" color="from-[#e8261f] to-[#3a0807]" />
          <NavBtn label="Integrantes" icon={Users} to="/integrantes" color="from-white/60 to-white/5" />
        </div>
        <Link to="/ranking" className="block relative surface-card rounded-2xl p-5 overflow-hidden">
          <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-gradient-to-br from-yellow-400/40 to-primary/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl border border-yellow-400/50 bg-yellow-400/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-yellow-300" />
            </div>
            <div className="min-w-0">
              <p className="font-black uppercase tracking-wider text-sm">{t("panel.ranking.title", "Ranking MVP")}</p>
              <p className="text-[11px] text-muted-foreground">{t("panel.ranking.subtitle", "Top jugadores del clan")}</p>
            </div>
          </div>
        </Link>
      </section>

      {/* Admin */}
      {isAdmin && (
        <section className="space-y-3">
          <SectionLabel>{t("panel.section.admin", "Administración")}</SectionLabel>
          <Link to="/admin" className="block relative surface-card rounded-2xl p-5 overflow-hidden">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full gradient-neon opacity-30 blur-xl" />
            <div className="relative flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl border border-primary/50 bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-black uppercase tracking-wider text-sm">{t("panel.admin.title", "Panel admin")}</p>
                <p className="text-[11px] text-muted-foreground">{t("panel.admin.subtitle", "Eventos, MVPs, textos y enlaces")}</p>
              </div>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold px-1">{children}</p>;
}

type CardProps = { label: string; icon: typeof MessageCircle; color: string };

function CardInner({ label, icon: Icon, color, disabled }: CardProps & { disabled?: boolean }) {
  return (
    <div className={`relative surface-card rounded-2xl p-5 h-28 flex flex-col justify-between overflow-hidden group ${disabled ? "opacity-50" : ""}`}>
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-30 blur-xl group-hover:opacity-50 transition`} />
      <Icon className="h-6 w-6 text-primary relative" />
      <p className="font-black uppercase tracking-wider text-sm relative">{label}</p>
    </div>
  );
}

function CommBtn({ label, icon, href, color }: CardProps & { href: string }) {
  if (!href) return <div title="Sin link configurado"><CardInner label={label} icon={icon} color={color} disabled /></div>;
  return <a href={href} target="_blank" rel="noopener noreferrer"><CardInner label={label} icon={icon} color={color} /></a>;
}

function NavBtn({ label, icon, to, color }: CardProps & { to: string }) {
  return <Link to={to}><CardInner label={label} icon={icon} color={color} /></Link>;
}
