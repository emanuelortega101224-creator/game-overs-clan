import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Crown, Swords, Trophy, Zap, Medal, Flame, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/hooks/use-avatar";
import { useRealtime } from "@/hooks/use-realtime";
import { useTexts } from "@/hooks/use-texts";
import clanLogo from "@/assets/clan-logo.png";

type Row = { user_id: string; ff_nick: string | null; avatar_url: string | null; total: number; guerra: number; competencia: number; versus: number };
type Cat = "total" | "guerra" | "competencia" | "versus";

const CATS: { key: Cat; label: string; icon: typeof Crown; tint: string }[] = [
  { key: "total",       label: "General",    icon: Crown,  tint: "text-yellow-300" },
  { key: "guerra",      label: "Guerra",     icon: Swords, tint: "text-primary" },
  { key: "competencia", label: "Compete.",   icon: Trophy, tint: "text-amber-400" },
  { key: "versus",      label: "Versus",     icon: Zap,    tint: "text-secondary" },
];

export const Route = createFileRoute("/_app/ranking")({
  head: () => ({ meta: [{ title: "Ranking · GAME OVER" }] }),
  component: RankingPage,
});

function RankingPage() {
  useRealtime("ranking", [
    { table: "event_mvps", keys: [["mvp-ranking"]] },
  ]);
  const [cat, setCat] = useState<Cat>("total");
  const { t } = useTexts();
  const { data, isLoading } = useQuery({
    queryKey: ["mvp-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mvp_ranking" as any);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    const sorted = [...all].sort((a, b) => {
      if (cat === "total") return b.total - a.total;
      return (b[cat] as number) - (a[cat] as number);
    }).filter(r => cat === "total" ? r.total > 0 : (r[cat] as number) > 0);
    return sorted;
  }, [data, cat]);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const activeCat = CATS.find(c => c.key === cat)!;

  return (
    <div className="px-5 pt-8 pb-6">
      <Link to="/panel" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />Volver
      </Link>

      {/* Hero header */}
      <header className="mt-4 relative overflow-hidden rounded-3xl border border-primary/40 p-6"
        style={{ background: "linear-gradient(135deg, #2a0606 0%, #0a0a0a 60%), radial-gradient(circle at 80% 0%, rgba(255,200,0,0.25), transparent 60%)" }}>
        <div className="absolute -right-10 -top-10 h-44 w-44 opacity-30 pointer-events-none">
          <img src={clanLogo} alt="" className="h-full w-full object-contain drop-shadow-[0_0_20px_rgba(232,38,31,0.6)]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-400/40 bg-yellow-400/10">
            <Flame className="h-3.5 w-3.5 text-yellow-300" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-300 font-black">{t("ranking.kicker", "Hall of Fame")}</p>
          </div>
          <h1 className="mt-3 text-4xl font-black text-glow-orange leading-none">{t("ranking.title", "RANKING MVP")}</h1>
          <p className="mt-2 text-xs text-white/70 max-w-[80%]">{t("ranking.subtitle", "Los mejores del clan medidos por MVPs en cada categoría de evento.")}</p>
        </div>
      </header>

      {/* Category tabs */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        {CATS.map(c => {
          const active = cat === c.key;
          const Icon = c.icon;
          return (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`relative rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 border transition
                ${active ? "border-primary bg-primary/15 neon-glow-orange" : "border-border bg-input/30 text-muted-foreground"}`}>
              <Icon className={`h-4 w-4 ${active ? c.tint : ""}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${active ? "text-foreground" : ""}`}>{c.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando ranking...</p>}

      {!isLoading && rows.length === 0 && (
        <div className="mt-10 surface-card rounded-2xl p-8 text-center">
          <activeCat.icon className={`h-12 w-12 mx-auto ${activeCat.tint}`} />
          <p className="mt-3 font-black uppercase tracking-wider">Sin MVPs en {activeCat.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("ranking.empty", "Cuando termine un evento de esta categoría aparecerán los mejores aquí.")}</p>
        </div>
      )}

      {top3.length > 0 && (
        <section className="mt-6 grid grid-cols-3 gap-3 items-end">
          {[top3[1], top3[0], top3[2]].map((r, i) => r ? (
            <PodiumCard key={r.user_id} row={r} position={i === 1 ? 1 : i === 0 ? 2 : 3} cat={cat} />
          ) : <div key={i} />)}
        </section>
      )}

      {rest.length > 0 && (
        <section className="mt-6 space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Clasificación · {activeCat.label}</p>
          {rest.map((r, i) => (
            <RankRow key={r.user_id} row={r} position={i + 4} cat={cat} />
          ))}
        </section>
      )}
    </div>
  );
}

function scoreOf(row: Row, cat: Cat) {
  return cat === "total" ? row.total : (row[cat] as number);
}

function PodiumCard({ row, position, cat }: { row: Row; position: 1 | 2 | 3; cat: Cat }) {
  const avatar = useAvatarUrl(row.avatar_url);
  const sizes = { 1: "h-36", 2: "h-28", 3: "h-24" }[position];
  const accent = {
    1: { ring: "ring-yellow-300", grad: "from-yellow-300/60 via-yellow-500/20 to-transparent", crown: "text-yellow-200", badge: "from-yellow-300 to-yellow-600" },
    2: { ring: "ring-slate-200",  grad: "from-slate-200/50 via-slate-400/15 to-transparent",   crown: "text-slate-100", badge: "from-slate-200 to-slate-500" },
    3: { ring: "ring-amber-500",  grad: "from-amber-500/50 via-amber-800/20 to-transparent",   crown: "text-amber-300", badge: "from-amber-500 to-amber-800" },
  }[position];
  return (
    <Link to="/integrantes/$id" params={{ id: row.user_id }} className="flex flex-col items-center group">
      <div className="relative">
        <Crown className={`absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-5 ${accent.crown} drop-shadow-[0_0_8px_rgba(255,210,0,0.8)] ${position === 1 ? "h-6 w-6" : ""}`} />
        <div className={`h-20 w-20 rounded-2xl overflow-hidden bg-surface ring-2 ring-offset-2 ring-offset-background ${accent.ring} ${position === 1 ? "h-24 w-24" : ""}`}>
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full bg-muted flex items-center justify-center"><Star className="h-6 w-6 text-muted-foreground" /></div>}
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-gradient-to-br ${accent.badge} flex items-center justify-center text-[11px] font-black text-black border-2 border-background`}>
          {position}
        </div>
      </div>
      <p className="mt-3 text-xs font-black truncate w-full text-center uppercase tracking-wider">{row.ff_nick || "—"}</p>
      <p className="text-[10px] text-primary font-black">{scoreOf(row, cat)} MVP</p>
      <div className={`mt-2 w-full rounded-t-2xl bg-gradient-to-t ${accent.grad} ${sizes} border border-white/10 border-b-0 flex items-start justify-center pt-2`}>
        <span className={`text-2xl font-black ${accent.crown}`} style={{ fontFamily: "var(--font-display)" }}>{position}</span>
      </div>
    </Link>
  );
}

function RankRow({ row, position, cat }: { row: Row; position: number; cat: Cat }) {
  const avatar = useAvatarUrl(row.avatar_url);
  return (
    <Link to="/integrantes/$id" params={{ id: row.user_id }}
      className="flex items-center gap-3 surface-card rounded-xl p-3 hover:border-primary/60 transition">
      <div className="w-7 text-center text-base font-black text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>
        {String(position).padStart(2, "0")}
      </div>
      <div className="h-11 w-11 rounded-lg overflow-hidden border border-border bg-surface shrink-0">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black truncate text-sm uppercase tracking-wider">{row.ff_nick || "—"}</p>
        <div className="mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Swords className="h-3 w-3" />{row.guerra}</span>
          <span className="flex items-center gap-0.5"><Trophy className="h-3 w-3" />{row.competencia}</span>
          <span className="flex items-center gap-0.5"><Zap className="h-3 w-3" />{row.versus}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-primary font-black">
        <Medal className="h-4 w-4" />
        <span className="text-base" style={{ fontFamily: "var(--font-display)" }}>{scoreOf(row, cat)}</span>
      </div>
    </Link>
  );
}
