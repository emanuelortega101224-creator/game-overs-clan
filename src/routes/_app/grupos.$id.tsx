import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Send, Mic, Square, Play, Pause, Users, Smile, Check, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAudioUrl, useAvatarUrl } from "@/hooks/use-avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { StickerPicker, StickerBubble } from "@/components/sticker-picker";
import { usePermissions } from "@/hooks/use-permissions";

export const Route = createFileRoute("/_app/grupos/$id")({
  head: () => ({ meta: [{ title: "Chat · GAME OVER" }] }),
  component: GrupoChat,
});

type Message = {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  audio_path: string | null;
  sticker_path: string | null;
  created_at: string;
};

type ReadRow = { message_id: string; user_id: string };

function formatDateLabel(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - that.getTime()) / 86400000;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: that.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function GrupoChat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canModerate = can("moderate_chat");
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [reads, setReads] = useState<ReadRow[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*, events(title, type)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["group-members", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_group_member_profiles", { _group_id: id });
      if (error) throw error;
      return (data ?? []) as { id: string; ff_nick: string; avatar_url: string | null }[];
    },
  });

  const memberById = (uid: string) => members?.find(m => m.id === uid);
  const memberCount = members?.length ?? 0;
  const bgUrl = useSignedUrl("event-backgrounds", (group as any)?.background_url ?? null);

  // Load messages + read receipts
  useEffect(() => {
    let mounted = true;
    supabase.from("messages").select("*").eq("group_id", id).order("created_at", { ascending: true }).then(({ data, error }) => {
      if (error) { toast.error("No puedes ver este chat"); navigate({ to: "/eventos" }); return; }
      if (mounted) setMessages(data as Message[]);
    });

    const ch = supabase.channel(`messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `group_id=eq.${id}` }, (payload) => {
        const m = payload.old as Message;
        setMessages(prev => prev.filter(x => x.id !== m.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads" }, (payload) => {
        const r = payload.new as ReadRow;
        setReads(prev => prev.find(x => x.message_id === r.message_id && x.user_id === r.user_id) ? prev : [...prev, r]);
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [id, navigate]);

  // Refresh reads when messages change
  useEffect(() => {
    if (!messages.length) return;
    const ids = messages.map(m => m.id);
    supabase.from("message_reads").select("message_id, user_id").in("message_id", ids).then(({ data }) => {
      if (data) setReads(data as ReadRow[]);
    });
  }, [messages.length]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Mark unread messages as read
  useEffect(() => {
    if (!user || !messages.length) return;
    const unread = messages.filter(m => m.user_id !== user.id && !reads.some(r => r.message_id === m.id && r.user_id === user.id));
    if (!unread.length) return;
    supabase.from("message_reads").insert(unread.map(m => ({ message_id: m.id, user_id: user.id }))).then(() => {});
  }, [messages, reads, user]);

  const sendText = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({ group_id: id, user_id: user.id, content: text.trim() }).select("*").single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    if (data) setMessages(prev => prev.find(x => x.id === data.id) ? prev : [...prev, data as Message]);
    setText("");
  };

  const sendAudio = async (blob: Blob) => {
    if (!user) return;
    const path = `${id}/${user.id}-${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: "audio/webm" });
    if (upErr) { toast.error(upErr.message); return; }
    const { data, error } = await supabase.from("messages").insert({ group_id: id, user_id: user.id, audio_path: path }).select("*").single();
    if (error) { toast.error(error.message); return; }
    if (data) setMessages(prev => prev.find(x => x.id === data.id) ? prev : [...prev, data as Message]);
  };

  const sendSticker = async (s: { kind: "emoji"; value: string } | { kind: "image"; path: string }) => {
    if (!user) return;
    const payload: any = s.kind === "emoji"
      ? { group_id: id, user_id: user.id, content: `::emoji::${s.value}` }
      : { group_id: id, user_id: user.id, sticker_path: s.path };
    const { data, error } = await supabase.from("messages").insert(payload).select("*").single();
    if (error) { toast.error(error.message); return; }
    if (data) setMessages(prev => prev.find(x => x.id === data.id) ? prev : [...prev, data as Message]);
  };

  const deleteMessage = async (mid: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", mid);
    if (error) { toast.error(error.message); return; }
    setMessages(prev => prev.filter(m => m.id !== mid));
  };

  // Group messages by date and consecutive author
  const items = useMemo(() => {
    const out: ({ kind: "date"; label: string; key: string } | { kind: "msg"; msg: Message; showAuthor: boolean; showTail: boolean; key: string })[] = [];
    let lastDate = "";
    let lastAuthor = "";
    let lastTime = 0;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const d = new Date(m.created_at);
      const label = formatDateLabel(d);
      if (label !== lastDate) {
        out.push({ kind: "date", label, key: `d-${m.id}` });
        lastDate = label;
        lastAuthor = "";
      }
      const t = d.getTime();
      const next = messages[i + 1];
      const nextSameAuthor = next && next.user_id === m.user_id && (new Date(next.created_at).getTime() - t) < 60_000 && formatDateLabel(new Date(next.created_at)) === label;
      const showAuthor = m.user_id !== lastAuthor || t - lastTime > 60_000;
      const showTail = !nextSameAuthor;
      out.push({ kind: "msg", msg: m, showAuthor, showTail, key: m.id });
      lastAuthor = m.user_id;
      lastTime = t;
    }
    return out;
  }, [messages]);

  const readsByMessage = useMemo(() => {
    const map = new Map<string, number>();
    reads.forEach(r => map.set(r.message_id, (map.get(r.message_id) ?? 0) + 1));
    return map;
  }, [reads]);

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-[oklch(0.09_0_0)]">
      {/* Header */}
      <header className="px-3 py-2.5 border-b border-border flex items-center gap-3 bg-surface-2/95 backdrop-blur-md sticky top-0 z-10">
        <Link to="/eventos/$type" params={{ type: (group?.events?.type ?? "guerra") }} className="text-muted-foreground -ml-1 p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="h-10 w-10 rounded-full gradient-neon flex items-center justify-center text-primary-foreground font-black text-sm shrink-0">
          {(group?.name ?? "G").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-sm">{group?.name ?? "Grupo"}</p>
          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />{memberCount} · {group?.events?.title}
          </p>
        </div>
      </header>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1 relative"
        style={bgUrl ? {
          backgroundImage: `linear-gradient(to bottom, oklch(0.09 0 0 / 0.78), oklch(0.09 0 0 / 0.88)), url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : {
          backgroundImage: "radial-gradient(circle at 20% 10%, color-mix(in oklch, var(--neon-orange) 8%, transparent), transparent 50%), radial-gradient(circle at 80% 80%, color-mix(in oklch, var(--neon-orange) 5%, transparent), transparent 50%)",
        }}>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="h-16 w-16 rounded-full gradient-neon flex items-center justify-center mb-3 neon-glow-orange">
              <Users className="h-7 w-7 text-primary-foreground" />
            </div>
            <p className="text-sm font-bold">¡Saluda al escuadrón!</p>
            <p className="text-xs text-muted-foreground mt-1">Sé el primero en escribir.</p>
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
          const m = item.msg;
          const mine = m.user_id === user?.id;
          const author = memberById(m.user_id);
          const emojiOnly = m.content?.startsWith("::emoji::");
          const emoji = emojiOnly ? m.content!.slice(9) : null;
          const isMedia = !!m.sticker_path || !!emoji;
          const readCount = readsByMessage.get(m.id) ?? 0;
          const readByOthers = readCount > 0;

          return (
            <MessageBubble
              key={item.key}
              m={m}
              mine={mine}
              author={author}
              isMedia={isMedia}
              emoji={emoji}
              showAuthor={item.showAuthor && !mine}
              showTail={item.showTail}
              readByOthers={readByOthers}
              canDelete={mine || canModerate}
              onDelete={() => deleteMessage(m.id)}
            />
          );
        })}
      </div>

      <Composer text={text} setText={setText} sendText={sendText} sendAudio={sendAudio} sendSticker={sendSticker} sending={sending} />
    </div>
  );
}

function MessageBubble({ m, mine, author, isMedia, emoji, showAuthor, showTail, readByOthers, canDelete, onDelete }: {
  m: Message; mine: boolean; author: any; isMedia: boolean; emoji: string | null;
  showAuthor: boolean; showTail: boolean; readByOthers: boolean; canDelete: boolean; onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const avatar = useAvatarUrl(author?.avatar_url);
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const bubbleBase = "relative max-w-[78%] px-2.5 py-1.5 shadow-sm";
  const radius = mine
    ? `rounded-2xl ${showTail ? "rounded-br-md" : ""}`
    : `rounded-2xl ${showTail ? "rounded-bl-md" : ""}`;
  const bg = mine
    ? "bg-gradient-to-br from-[oklch(0.42_0.22_27)] to-[oklch(0.32_0.18_27)] text-primary-foreground"
    : "bg-surface-2/95 text-foreground border border-border/50";

  return (
    <div className={`flex gap-1.5 ${mine ? "justify-end" : "justify-start"} ${showTail ? "mb-1.5" : "mb-0.5"}`}>
      {!mine && (
        <div className="w-7 shrink-0 self-end">
          {showTail && (
            avatar
              ? <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />
              : <div className="h-7 w-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">{(author?.ff_nick ?? "?").slice(0,1).toUpperCase()}</div>
          )}
        </div>
      )}

      {isMedia ? (
        <div className={`relative max-w-[60%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
          {showAuthor && <p className="text-[10px] font-bold text-secondary mb-0.5 px-1">{author?.ff_nick}</p>}
          {emoji && <p className="text-6xl leading-none select-none">{emoji}</p>}
          {m.sticker_path && <StickerBubble path={m.sticker_path} />}
          <div className="flex items-center gap-1 mt-0.5 px-1">
            <span className="text-[9px] text-muted-foreground">{time}</span>
            {mine && <ReadIndicator read={readByOthers} />}
          </div>
        </div>
      ) : (
        <div className={`${bubbleBase} ${radius} ${bg} group`} onClick={() => canDelete && setMenu(v => !v)}>
          {showAuthor && (
            <p className="text-[10px] font-bold text-secondary mb-0.5">{author?.ff_nick ?? "Soldado"}</p>
          )}
          {m.content && !emoji && <p className="text-sm whitespace-pre-wrap break-words leading-snug">{m.content}</p>}
          {m.audio_path && <AudioBubble path={m.audio_path} mine={mine} />}
          <div className={`flex items-center gap-1 justify-end mt-0.5 -mb-0.5 ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            <span className="text-[9px]">{time}</span>
            {mine && <ReadIndicator read={readByOthers} />}
          </div>

          {/* Tail */}
          {showTail && (
            <span
              className={`absolute bottom-0 ${mine ? "right-[-5px]" : "left-[-5px]"} w-2.5 h-2.5 overflow-hidden`}
              style={{
                background: mine ? "oklch(0.32 0.18 27)" : "var(--surface-2)",
                clipPath: mine ? "polygon(0 0, 100% 100%, 0 100%)" : "polygon(100% 0, 100% 100%, 0 100%)",
              }}
            />
          )}

          {menu && canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenu(false); onDelete(); }}
              className="absolute -top-9 right-0 bg-background border border-destructive/60 text-destructive rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase flex items-center gap-1 shadow-lg z-20"
            >
              <Trash2 className="h-3 w-3" /> Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReadIndicator({ read }: { read: boolean }) {
  return read
    ? <CheckCheck className="h-3 w-3 text-sky-300" />
    : <Check className="h-3 w-3 opacity-70" />;
}

function AudioBubble({ path, mine }: { path: string; mine: boolean }) {
  const url = useAudioUrl("voice-notes", path);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = useMemo(() => {
    // pseudo-random but stable waveform from path
    let h = 0; for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
    return Array.from({ length: 28 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      return 0.25 + ((h >>> 8) % 100) / 130;
    });
  }, [path]);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) ref.current.pause(); else ref.current.play();
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  if (!url) return <p className="text-xs italic opacity-70 py-1">Cargando audio…</p>;

  const fillColor = mine ? "bg-white" : "bg-primary";
  const emptyColor = mine ? "bg-white/30" : "bg-muted-foreground/30";

  return (
    <div className="flex items-center gap-2 py-1 min-w-[200px]">
      <button onClick={toggle} className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${mine ? "bg-white/20" : "gradient-neon text-primary-foreground"}`}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-8">
        {bars.map((b, i) => {
          const active = (i / bars.length) < progress;
          return <div key={i} className={`w-[2.5px] rounded-full transition-colors ${active ? fillColor : emptyColor}`} style={{ height: `${Math.round(b * 100)}%` }} />;
        })}
      </div>
      <span className="text-[10px] tabular-nums opacity-80 shrink-0">{fmt(playing ? duration * progress : duration)}</span>
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => setDuration(ref.current?.duration ?? 0)}
        onTimeUpdate={() => { if (ref.current?.duration) setProgress(ref.current.currentTime / ref.current.duration); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}

function Composer({ text, setText, sendText, sendAudio, sendSticker, sending }: {
  text: string; setText: (s: string) => void; sendText: () => void; sendAudio: (b: Blob) => void;
  sendSticker: (s: { kind: "emoji"; value: string } | { kind: "image"; path: string }) => void;
  sending: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [picker, setPicker] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 1000) sendAudio(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      toast.error("Permiso de micrófono denegado");
    }
  };
  const stop = (send = true) => {
    if (!send && mediaRef.current) {
      mediaRef.current.ondataavailable = null;
      mediaRef.current.onstop = () => mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    }
    mediaRef.current?.stop();
    mediaRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  return (
    <div className="relative p-2 border-t border-border bg-surface-2/95 backdrop-blur-md" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
      <StickerPicker open={picker} onClose={() => setPicker(false)} onPick={(s) => { sendSticker(s); setPicker(false); }} />
      {recording ? (
        <div className="flex items-center gap-2 bg-input/80 rounded-full px-3 py-2">
          <button onClick={() => stop(false)} className="h-9 w-9 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-mono flex-1">Grabando · {String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</span>
          <button onClick={() => stop(true)} className="h-10 w-10 rounded-full gradient-neon flex items-center justify-center text-primary-foreground neon-glow-orange">
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <div className="flex-1 flex items-end bg-input/80 rounded-3xl px-2 py-1 border border-border">
            <button onClick={() => setPicker(p => !p)} className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground shrink-0 hover:text-primary transition" title="Stickers">
              <Smile className="h-5 w-5" />
            </button>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
              placeholder="Mensaje"
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm min-w-0 resize-none py-2 max-h-24"
              style={{ lineHeight: "1.25rem" }}
            />
          </div>
          {text.trim() ? (
            <button onClick={sendText} disabled={sending} className="h-11 w-11 rounded-full gradient-neon flex items-center justify-center text-primary-foreground neon-glow-orange disabled:opacity-50 shrink-0">
              <Send className="h-4 w-4 translate-x-0.5" />
            </button>
          ) : (
            <button onClick={start} className="h-11 w-11 rounded-full gradient-neon flex items-center justify-center text-primary-foreground neon-glow-orange shrink-0">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
