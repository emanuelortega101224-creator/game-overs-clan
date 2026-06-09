import { useEffect, useState } from "react";
import { Smile, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/hooks/use-signed-url";

const EMOJIS = [
  "🔥","💥","💀","☠️","😈","🤖","👑","⚔️","🛡️","🎯",
  "🏆","🥇","🎮","🕹️","💣","🚀","⚡","✨","💯","👊",
  "🤝","🙌","👏","🫡","💪","😎","🤣","😂","😭","😤",
  "🤔","🥶","🥵","🤡","👀","💤","❤️","💔","🖤","💜",
];

type Sticker = { id: string; image_path: string };

export function StickerPicker({ open, onClose, onPick }: {
  open: boolean;
  onClose: () => void;
  onPick: (s: { kind: "emoji"; value: string } | { kind: "image"; path: string }) => void;
}) {
  const [tab, setTab] = useState<"emoji" | "image">("emoji");
  const [stickers, setStickers] = useState<Sticker[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("stickers").select("id, image_path").order("created_at", { ascending: false })
      .then(({ data }) => setStickers((data as Sticker[]) ?? []));
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 surface-card rounded-2xl border border-border shadow-xl p-3 max-h-72 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          <TabBtn active={tab === "emoji"} onClick={() => setTab("emoji")}><Smile className="h-3.5 w-3.5" /> Emojis</TabBtn>
          <TabBtn active={tab === "image"} onClick={() => setTab("image")}><ImageIcon className="h-3.5 w-3.5" /> Stickers</TabBtn>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-y-auto flex-1">
        {tab === "emoji" ? (
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { onPick({ kind: "emoji", value: e }); onClose(); }}
                className="text-2xl h-10 w-10 rounded-lg hover:bg-muted flex items-center justify-center">{e}</button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {stickers.length === 0 && <p className="col-span-4 text-xs text-muted-foreground py-6 text-center">El admin todavía no subió stickers.</p>}
            {stickers.map(s => <StickerThumb key={s.id} path={s.image_path} onPick={() => { onPick({ kind: "image", path: s.image_path }); onClose(); }} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${active ? "gradient-neon text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{children}</button>;
}

function StickerThumb({ path, onPick }: { path: string; onPick: () => void }) {
  const url = useSignedUrl("stickers", path);
  return (
    <button onClick={onPick} className="aspect-square rounded-lg bg-input/40 border border-border hover:border-primary p-1 overflow-hidden">
      {url ? <img src={url} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full animate-pulse bg-muted" />}
    </button>
  );
}

export function StickerBubble({ path }: { path: string }) {
  const url = useSignedUrl("stickers", path);
  if (!url) return <div className="h-32 w-32 animate-pulse bg-muted rounded-lg" />;
  return <img src={url} alt="sticker" className="h-32 w-32 object-contain" />;
}
