import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, XCircle, Globe2 } from "lucide-react";
import { lookupFfPlayer, type FfPlayerInfo } from "@/lib/ff-lookup.functions";
import { useTexts } from "@/hooks/use-texts";
import { detectTimezone, countryFromTimezone } from "@/lib/timezone";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Registro · GAME OVER" }] }),
  component: RegistroPage,
});

function RegistroPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const lookup = useServerFn(lookupFfPlayer);
  const { t } = useTexts();

  const [realName, setRealName] = useState("");
  const [ffNick, setFfNick] = useState("");
  const [ffId, setFfId] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tz, setTz] = useState<string>(() => (typeof window !== "undefined" ? detectTimezone() : "UTC"));
  const detectedCountry = countryFromTimezone(tz);

  const [ffInfo, setFfInfo] = useState<FfPlayerInfo | null>(null);
  const [ffStatus, setFfStatus] = useState<"idle" | "loading" | "found" | "notfound" | "invalid">("idle");
  const lookupReq = useRef(0);

  useEffect(() => { setTz(detectTimezone()); }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // Debounced FF ID lookup
  useEffect(() => {
    const id = ffId.trim();
    if (!id) { setFfInfo(null); setFfStatus("idle"); return; }
    if (!/^\d{6,15}$/.test(id)) { setFfInfo(null); setFfStatus("invalid"); return; }
    setFfStatus("loading");
    const reqId = ++lookupReq.current;
    const t = setTimeout(async () => {
      try {
        const data = await lookup({ data: { id } });
        if (reqId !== lookupReq.current) return;
        if (data) {
          setFfInfo(data);
          setFfStatus("found");
          if (!ffNick) setFfNick(data.nickname);
        } else {
          setFfInfo(null);
          setFfStatus("notfound");
        }
      } catch {
        if (reqId !== lookupReq.current) return;
        setFfInfo(null);
        setFfStatus("notfound");
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ffId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!avatarFile) { toast.error("La foto personal es obligatoria"); return; }
    setBusy(true);
    try {
      const avatarPath = `${user.id}/avatar-${Date.now()}.${avatarFile.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(avatarPath, avatarFile, { upsert: true });
      if (upErr) throw upErr;
      const { error: mirrorErr } = await supabase.storage.from("game-profiles").upload(avatarPath, avatarFile, { upsert: true });
      if (mirrorErr) throw mirrorErr;

      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        real_name: realName.trim(),
        ff_nick: ffNick.trim(),
        ff_id: ffId.trim(),
        phone: phone.trim(),
        avatar_url: avatarPath,
        game_profile_url: avatarPath,
        country: detectedCountry?.name ?? null,
        timezone: tz,
      } as any);
      if (error) throw error;
      toast.success("¡Listo, bienvenido al clan!");
      navigate({ to: "/panel" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh px-5 py-10">
      <div className="max-w-sm mx-auto">
        <h1 className="text-2xl font-black text-glow-orange">{t("registro.title", "COMPLETA TU PERFIL")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("registro.subtitle", "Datos del jugador")}</p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <label className="relative cursor-pointer">
                <div className="h-28 w-28 rounded-full border-2 border-dashed border-primary/60 bg-surface flex items-center justify-center overflow-hidden">
                  {avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : <Upload className="h-7 w-7 text-primary" />}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">{t("registro.avatar", "Foto personal")}<br/><span className="text-primary font-semibold">{t("registro.avatar.note", "(obligatoria)")}</span></p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center -mt-2">{t("registro.game.help", "Tu foto se usará para identificar tu cuenta dentro de la app.")}</p>

          <div className="rounded-lg border border-border bg-input/30 px-3 py-2.5 flex items-center gap-2.5">
            <Globe2 className="h-4 w-4 text-secondary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("registro.country.label", "País detectado")}</p>
              <p className="text-sm font-semibold truncate">{detectedCountry?.name ?? "—"}{tz ? ` · ${tz}` : ""}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("registro.ffid", "ID de Free Fire")}</label>
            <input required type="text" inputMode="numeric" value={ffId} onChange={e => setFfId(e.target.value.replace(/\D/g, ""))}
              placeholder={t("registro.ffid.placeholder", "Solo números")}
              className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:neon-glow-orange transition" />
            <FfStatusBox status={ffStatus} info={ffInfo} />
          </div>

          {[
            { label: t("registro.nick", "Nick de Free Fire"), v: ffNick, set: setFfNick, type: "text" },
            { label: t("registro.real_name", "Nombre real"), v: realName, set: setRealName, type: "text" },
            { label: t("registro.phone", "Teléfono"), v: phone, set: setPhone, type: "tel" },
          ].map(({ label, v, set, type }) => (
            <div key={label}>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
              <input required type={type} value={v} onChange={e => set(e.target.value)}
                className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:neon-glow-orange transition" />
            </div>
          ))}

          <button disabled={busy} className="w-full gradient-neon text-primary-foreground font-bold py-3 rounded-lg uppercase tracking-wider neon-glow-orange disabled:opacity-50">
            {busy ? "..." : t("registro.submit", "Entrar al panel")}
          </button>
        </form>
      </div>
    </div>
  );
}

function FfStatusBox({ status, info }: { status: string; info: FfPlayerInfo | null }) {
  if (status === "idle") return null;
  if (status === "invalid")
    return <p className="text-[11px] text-muted-foreground mt-1.5">El ID debe tener entre 6 y 15 dígitos.</p>;
  if (status === "loading")
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando jugador...
      </div>
    );
  if (status === "notfound")
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <XCircle className="h-3.5 w-3.5 text-destructive" /> No se pudo verificar. Continúa de todos modos.
      </div>
    );
  if (status === "found" && info)
    return (
      <div className="mt-2 surface-card rounded-lg p-2.5 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <div className="text-xs leading-tight">
          <p className="font-bold">{info.nickname}</p>
          <p className="text-muted-foreground">
            {info.level ? `Nivel ${info.level}` : "Encontrado"}
            {info.region ? ` · ${info.region.toUpperCase()}` : ""}
          </p>
        </div>
      </div>
    );
  return null;
}
