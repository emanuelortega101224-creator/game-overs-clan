import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Swords, Trophy, Zap, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useTexts } from "@/hooks/use-texts";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_app/eventos/")({
  head: () => ({ meta: [{ title: "Eventos · GAME OVER" }] }),
  component: EventosIndex,
});

const TYPES = [
  { key: "guerra", titleKey: "eventos.guerra.title", fallbackTitle: "Guerra de Clanes", descKey: "eventos.guerra.desc", icon: Swords, color: "from-[#e8261f] to-[#3a0807]", bgCol: "bg_guerra" },
  { key: "competencia", titleKey: "eventos.competencia.title", fallbackTitle: "Competencias", descKey: "eventos.competencia.desc", icon: Trophy, color: "from-[#e8261f] to-[#1a0303]", bgCol: "bg_competencia" },
  { key: "versus", titleKey: "eventos.versus.title", fallbackTitle: "Versus", descKey: "eventos.versus.desc", icon: Zap, color: "from-white/60 to-white/0", bgCol: "bg_versus" },
] as const;

function EventosIndex() {
  const { t } = useTexts();
  useRealtime("eventos-index", [
    { table: "clan_settings", keys: [["settings"]] },
    { table: "site_texts", keys: [["site_texts"]] },
  ]);
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("clan_settings").select("*").eq("id", 1).maybeSingle()).data as any,
  });

  return (
    <div className="px-5 pt-8">
      <Link to="/panel" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Volver</Link>
      <h1 className="mt-4 text-2xl font-black text-glow-orange">{t("eventos.title", "EVENTOS")}</h1>
      <p className="text-xs text-muted-foreground uppercase tracking-widest">{t("eventos.subtitle", "Elige tu modo")}</p>

      <div className="mt-6 space-y-4">
        {TYPES.map(item => (
          <TypeCard key={item.key} item={item} bgPath={settings?.[item.bgCol] as string | null | undefined} title={t(item.titleKey, item.fallbackTitle)} desc={t(item.descKey, "")} />
        ))}

        <Link to="/sorteos" className="block surface-card rounded-2xl p-5 relative overflow-hidden h-36">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400 to-red-600 opacity-30 blur-2xl" />
          <div className="relative">
            <Gift className="h-8 w-8 text-primary" />
            <h2 className="mt-3 text-lg font-black uppercase tracking-wider">{t("eventos.sorteo.title", "Sorteos")}</h2>
            <p className="text-sm text-muted-foreground">{t("eventos.sorteo.desc", "Regístrate para participar en sorteos del clan")}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function TypeCard({ item, bgPath, title, desc }: { item: typeof TYPES[number]; bgPath: string | null | undefined; title: string; desc: string }) {
  const bg = useSignedUrl("event-backgrounds", bgPath);
  const Icon = item.icon;
  return (
    <Link to="/eventos/$type" params={{ type: item.key }} className="block surface-card rounded-2xl p-5 relative overflow-hidden h-36">
      {bg ? (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        </>
      ) : (
        <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${item.color} opacity-30 blur-2xl`} />
      )}
      <div className="relative">
        <Icon className="h-8 w-8 text-primary" />
        <h2 className="mt-3 text-lg font-black uppercase tracking-wider">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
