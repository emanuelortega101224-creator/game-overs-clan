import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-profile";
import { useAvatarUrl, useAudioUrl } from "@/hooks/use-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { StickerBubble } from "@/components/sticker-picker";
import { ArrowLeft, Eye, Users, Play, Pause } from "lucide-react";

export const Route = createFileRoute("/_app/admin/grupo/$id")({
  head: () => ({ meta: [{ title: "Espiar chat · GAME OVER" }] }),
  component: AdminSpyChat,
});

type Message = {
  id: string; group_id: string; user_id: string;
  content: string | null; audio_path: string | null; sticker_path: string | null;
  created_at: string;
};

function formatDateLabel(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - that.getTime()) / 86400000;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function AdminSpyChat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && isAdmin === false) navigate({ to: "/panel", replace: true });
  }, [isAdmin, isLoading, navigate]);

  const { data: group } = useQuery({
    queryKey: ["admin-spy-group", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*, events(title, type)").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!isAdmin,
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-spy-profiles", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, ff_nick, avatar_url");
      return (data ?? []) as { id: string; ff_nick: string; avatar_url: string | null }[];
    },
    enabled: !!isAdmin,
  });
  const profileById = (uid: string) => profiles?.find(p => p.id === uid);

  const bgUrl = useSignedUrl("event-backgrounds", group?.background_url ?? null);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    supabase.from("messages").select("*").eq("group_id", id).order("created_at", { ascending: true }).then(({ data }) => {
      if (mounted && data) setMessages(data as Message[]);
    });
    const ch = supabase.channel(`admin-spy-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `group_id=eq.${id}` }, (payload) => {
        const m = payload.old as Message;
        setMessages(prev => prev.filter(x => x.id !== m.id));
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [id, isAdmin]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const items = useMemo(() => {
    const out: ({ kind: "date"; label: string; key: string } | { kind: "msg"; msg: Message; showAuthor: boolean; key: string })[] = [];
    let lastDate = ""; let lastAuthor = ""; let lastTime = 0;
    for (const m of messages) {
      const d = new Date(m.created_at);
      const label = formatDateLabel(d);
      if (label !== lastDate) { out.push({ kind: "date", label, key: `d-${m.id}` }); lastDate = label; lastAuthor = ""; }
      const t = d.getTime();
      out.push({ kind: "msg", msg: m, showAuthor: m.user_id !== lastAuthor || t - lastTime > 60_000, key: m.id });
      lastAuthor = m.user_id; lastTime = t;
    }
    return out;
  }, [messages]);

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-[oklch(0.09_0_0)]">
      <header className="px-3 py-2.5 border-b border-border flex items-center gap-3 bg-surface-2/95 backdrop-blur-md sticky top-0 z-10">
        <Link to="/admin" className="text-muted-foreground -ml-1 p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="h-10 w-10 rounded-full bg-secondary/20 border border-secondary flex items-center justify-center text-secondary shrink-0">
          <Eye className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-sm">{group?.name ?? "Grupo"}</p>
          <p className="text-[10px] text-secondary truncate flex items-center gap-1 uppercase tracking-widest font-black">
            <Eye className="h-2.5 w-2.5" /> Modo espía · sin notificar
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={bgUrl ? {
          backgroundImage: `linear-gradient(to bottom, oklch(0.09 0 0 / 0.78), oklch(0.09 0 0 / 0.88)), url(${bgUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
        } : {
          backgroundImage: "radial-gradient(circle at 20% 10%, color-mix(in oklch, var(--neon-orange) 8%, transparent), transparent 50%)",
        }}>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Users className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aún no hay mensajes en este grupo.</p>
          </div>
        )}
        {items.map(item => {
          if (item.kind === "date") {
            return (
              <div key={item.key} className="flex justify-center my-3">
                <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-surface-2/80 text-muted-foreground border border-border">
                  {item.label}
                </span>
              </div>
            );
          }
          return <SpyBubble key={item.key} m={item.msg} author={profileById(item.msg.user_id)} showAuthor={item.showAuthor} />;
        })}
      </div>

      <footer className="border-t border-border bg-surface-2/80 px-4 py-3 text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Vista de solo lectura</p>
      </footer>
    </div>
  );
}

function SpyBubble({ m, author, showAuthor }: { m: Message; author: any; showAuthor: boolean }) {
  const avatar = useAvatarUrl(author?.avatar_url);
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const emoji = m.content?.startsWith("::emoji::") ? m.content.slice(9) : null;

  return (
    <div className="flex gap-1.5 justify-start mb-1.5">
      <div className="w-7 shrink-0 self-end">
        {showAuthor && (
          avatar
            ? <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />
            : <div className="h-7 w-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">{(author?.ff_nick ?? "?").slice(0,1).toUpperCase()}</div>
        )}
      </div>
      {emoji || m.sticker_path ? (
        <div className="max-w-[60%] flex flex-col items-start">
          {showAuthor && <p className="text-[10px] font-bold text-secondary mb-0.5 px-1">{author?.ff_nick ?? "Soldado"}</p>}
          {emoji && <p className="text-5xl leading-none select-none">{emoji}</p>}
          {m.sticker_path && <StickerBubble path={m.sticker_path} />}
          <span className="text-[9px] text-muted-foreground mt-0.5 px-1">{time}</span>
        </div>
      ) : (
        <div className="relative max-w-[78%] px-2.5 py-1.5 rounded-2xl bg-surface-2/95 text-foreground border border-border/50">
          {showAuthor && <p className="text-[10px] font-bold text-secondary mb-0.5">{author?.ff_nick ?? "Soldado"}</p>}
          {m.content && <p className="text-sm whitespace-pre-wrap break-words leading-snug">{m.content}</p>}
          {m.audio_path && <SpyAudio path={m.audio_path} />}
          <div className="flex items-center gap-1 justify-end mt-0.5 -mb-0.5 text-muted-foreground">
            <span className="text-[9px]">{time}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SpyAudio({ path }: { path: string }) {
  const url = useAudioUrl("voice-notes", path);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!url) return <p className="text-xs italic opacity-70 py-1">Cargando audio…</p>;
  return (
    <div className="flex items-center gap-2 py-1 min-w-[180px]">
      <button onClick={() => { if (!ref.current) return; playing ? ref.current.pause() : ref.current.play(); }}
        className="h-9 w-9 rounded-full gradient-neon text-primary-foreground flex items-center justify-center shrink-0">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <span className="text-xs text-muted-foreground">Nota de voz</span>
      <audio ref={ref} src={url} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </div>
  );
}
