import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin, useProfile } from "@/hooks/use-profile";
import { ArrowLeft, Gift, Plus, Trash2, Download, FileImage, FileText, CheckCircle2, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";
import { useTexts } from "@/hooks/use-texts";
import { BASE_TIMEZONES, detectTimezone, formatInTz, compactPhone } from "@/lib/timezone";
import clanLogo from "@/assets/clan-logo.png";

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}


export const Route = createFileRoute("/_app/sorteos")({
  head: () => ({ meta: [{ title: "Sorteos · GAME OVER" }] }),
  component: SorteosPage,
});

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  event_time: string | null;
  base_timezone: string | null;
};
type Reg = { id: string; event_id: string; user_id: string; real_name: string; ff_id: string; ff_nick: string; whatsapp: string; created_at: string };

// Convert a datetime-local value typed in the admin's chosen timezone into a
// UTC ISO string for storage. datetime-local has no zone info, so we compute
// the offset of that timezone at the chosen instant and apply it manually.
function localInputToUtcIso(local: string, tz: string): string {
  // local is "YYYY-MM-DDTHH:mm"
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  // Build a UTC date with the typed numbers, then ask Intl what offset tz has
  // at that instant and shift accordingly.
  const naiveUtc = Date.UTC(y, mo - 1, da, h, mi, 0);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(naiveUtc));
  const get = (n: string) => Number(parts.find(p => p.type === n)!.value);
  const asTz = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  // naiveUtc shown in tz is asTz; offset is asTz - naiveUtc
  const offset = asTz - naiveUtc;
  return new Date(naiveUtc - offset).toISOString();
}

function utcIsoToLocalInput(iso: string, tz: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(iso));
  const get = (n: string) => parts.find(p => p.type === n)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function SorteosPage() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", date: "", baseTz: "America/Mexico_City" });
  const { t } = useTexts();

  useRealtime("sorteos-list", [
    { table: "events", keys: [["raffles"]] },
    { table: "raffle_registrations", keys: [["raffle-regs"]] },
  ]);

  const { data: raffles } = useQuery({
    queryKey: ["raffles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, created_at, event_time, base_timezone")
        .eq("type", "sorteo" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Raffle[];
    },
  });

  const createRaffle = useMutation({
    mutationFn: async () => {
      const payload: any = {
        type: "sorteo" as any,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        created_by: user!.id,
      };
      if (draft.date) {
        payload.event_time = localInputToUtcIso(draft.date, draft.baseTz);
        payload.base_timezone = draft.baseTz;
      }
      const { error } = await supabase.from("events").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sorteo creado");
      setCreating(false);
      setDraft({ title: "", description: "", date: "", baseTz: "America/Mexico_City" });
      qc.invalidateQueries({ queryKey: ["raffles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRaffle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sorteo eliminado"); qc.invalidateQueries({ queryKey: ["raffles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="px-5 pt-8 pb-10">
      <Link to="/eventos/" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Eventos</Link>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-red-600 flex items-center justify-center shadow-lg">
          <Gift className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-glow-orange uppercase">{t("sorteos.title", "Sorteos")}</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{t("sorteos.subtitle", "Inscríbete y participa")}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-5">
          {!creating ? (
            <button onClick={() => setCreating(true)} className="w-full surface-card rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-secondary">
              <Plus className="h-4 w-4" /> {t("sorteos.create", "Crear sorteo")}
            </button>
          ) : (
            <div className="surface-card rounded-xl p-4 space-y-3">
              <input placeholder={t("sorteos.form.title", "Título del sorteo")} value={draft.title} onChange={e => setDraft(v => ({ ...v, title: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
              <textarea placeholder={t("sorteos.form.description", "Descripción (opcional)")} value={draft.description} onChange={e => setDraft(v => ({ ...v, description: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary min-h-20" />
              <FieldLabel label={t("sorteos.form.date", "Fecha y hora (opcional)")}>
                <input type="datetime-local" value={draft.date} onChange={e => setDraft(v => ({ ...v, date: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
              </FieldLabel>
              <FieldLabel label={t("sorteos.form.tz", "Zona horaria base")}>
                <select value={draft.baseTz} onChange={e => setDraft(v => ({ ...v, baseTz: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary">
                  {BASE_TIMEZONES.map(o => <option key={o.tz} value={o.tz}>{o.label}</option>)}
                </select>
              </FieldLabel>
              <p className="text-[10px] text-muted-foreground">Si pones fecha y hora, cada usuario verá la hora convertida a su país automáticamente.</p>
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancelar</button>
                <button disabled={!draft.title || createRaffle.isPending} onClick={() => createRaffle.mutate()} className="flex-1 py-2 rounded-lg gradient-neon font-bold text-sm text-primary-foreground disabled:opacity-50">Crear</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {raffles?.length === 0 && <p className="text-sm text-muted-foreground">{t("sorteos.empty", "No hay sorteos activos.")}</p>}
        {raffles?.map(r => (
          <RaffleCard key={r.id} raffle={r} isAdmin={!!isAdmin} onDelete={() => removeRaffle.mutate(r.id)} />
        ))}
      </div>
    </div>
  );
}

function TimeBadge({ raffle, userTz }: { raffle: Raffle; userTz: string }) {
  if (!raffle.event_time) return null;
  const baseTz = raffle.base_timezone || userTz;
  const local = formatInTz(raffle.event_time, userTz);
  const base = formatInTz(raffle.event_time, baseTz);
  const same = local === base;
  return (
    <div className="mt-2 rounded-lg border border-secondary/40 bg-secondary/5 px-3 py-2 flex items-start gap-2">
      <Clock className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
      <div className="text-[11px] leading-snug">
        <p className="font-bold text-white">Tu hora local: <span className="text-secondary">{local}</span></p>
        {!same && <p className="text-muted-foreground">Hora base ({baseTz.split("/").pop()?.replace(/_/g, " ")}): {base}</p>}
      </div>
    </div>
  );
}

function RaffleCard({ raffle, isAdmin, onDelete }: { raffle: Raffle; isAdmin: boolean; onDelete: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useTexts();
  const { data: profile } = useProfile(user?.id);
  const userTz = (profile as any)?.timezone || detectTimezone();

  const [editingTime, setEditingTime] = useState(false);
  const [timeDraft, setTimeDraft] = useState({
    date: raffle.event_time && raffle.base_timezone ? utcIsoToLocalInput(raffle.event_time, raffle.base_timezone) : "",
    baseTz: raffle.base_timezone || "America/Mexico_City",
  });

  const updateTime = useMutation({
    mutationFn: async () => {
      const payload: any = timeDraft.date
        ? { event_time: localInputToUtcIso(timeDraft.date, timeDraft.baseTz), base_timezone: timeDraft.baseTz }
        : { event_time: null, base_timezone: null };
      const { error } = await supabase.from("events").update(payload).eq("id", raffle.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Hora actualizada"); setEditingTime(false); qc.invalidateQueries({ queryKey: ["raffles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: regs } = useQuery({
    enabled: !!user?.id,
    queryKey: ["raffle-regs", raffle.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("raffle_registrations" as any).select("*").eq("event_id", raffle.id).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Reg[];
    },
  });

  const mine = regs?.find(r => r.user_id === user?.id) ?? null;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ real_name: "", ff_id: "", ff_nick: "", whatsapp: "" });

  useEffect(() => {
    if (mine) setForm({ real_name: mine.real_name, ff_id: mine.ff_id, ff_nick: mine.ff_nick, whatsapp: mine.whatsapp });
  }, [mine?.id]);

  const register = useMutation({
    mutationFn: async () => {
      const payload = {
        event_id: raffle.id,
        user_id: user!.id,
        real_name: form.real_name.trim(),
        ff_id: form.ff_id.trim(),
        ff_nick: form.ff_nick.trim(),
        whatsapp: form.whatsapp.trim(),
      };
      if (!payload.real_name || !payload.ff_id || !payload.ff_nick || !payload.whatsapp) throw new Error("Completa todos los campos");
      if (!/^\d{6,15}$/.test(payload.ff_id)) throw new Error("ID inválido (6-15 dígitos)");
      if (mine) {
        const { error } = await supabase.from("raffle_registrations" as any).update(payload).eq("id", mine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("raffle_registrations" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(mine ? "Registro actualizado" : "Te registraste al sorteo"); setEditing(false); qc.invalidateQueries({ queryKey: ["raffle-regs", raffle.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const unregister = useMutation({
    mutationFn: async () => {
      if (!mine) return;
      const { error } = await supabase.from("raffle_registrations" as any).delete().eq("id", mine.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registro eliminado"); qc.invalidateQueries({ queryKey: ["raffle-regs", raffle.id] }); },
  });

  const removeReg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("raffle_registrations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registro removido"); qc.invalidateQueries({ queryKey: ["raffle-regs", raffle.id] }); },
  });

  const sheetRef = useRef<HTMLDivElement>(null);

  // Editable export texts
  const exportKicker = t("sorteos.export.kicker", "GAME OVER · Sorteo oficial");
  const exportFooterBrand = t("sorteos.export.brand", "GAME OVER");
  const exportEmpty = t("sorteos.export.empty", "Sin inscritos aún.");
  const exportHelp = t("sorteos.export.help", "Exporta como imagen lista para compartir o PDF para archivar.");
  const exportCountLabel = t("sorteos.export.count_label", "Inscritos");
  const exportGenerated = t("sorteos.export.generated", "Generado");
  const exportHeaders = {
    count: t("sorteos.export.table.count", "#"),
    realName: t("sorteos.export.table.real_name", "Nombre real"),
    id: t("sorteos.export.table.id", "ID"),
    nick: t("sorteos.export.table.nick", "Nick"),
    whatsapp: t("sorteos.export.table.whatsapp", "WhatsApp"),
  };

  const exportPng = async () => {
    if (!sheetRef.current) { toast.error("Lista no disponible"); return; }
    try {
      const { toPng } = await import("html-to-image");
      // Wait two frames to ensure the sheet has fully rendered/measured.
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const url = await toPng(sheetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0a0a",
        skipFonts: true,
        filter: (node: any) => !(node?.dataset?.noExport),
      });
      const a = document.createElement("a"); a.href = url; a.download = `sorteo-${raffle.title}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success("Imagen descargada");
    } catch (e: any) {
      console.error("PNG export error", e);
      toast.error("No se pudo exportar imagen. Usa PDF como alternativa.");
    }
  };

  const exportPdf = async () => {
    try {
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = (autoTableMod as any).default || (autoTableMod as any).autoTable;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFillColor(232, 38, 31); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, "F");
      doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(20);
      doc.text(`SORTEO: ${raffle.title}`, 28, 44);
      doc.setFontSize(10); doc.setTextColor(255,255,255);
      doc.text(`${exportKicker} · ${new Date().toLocaleString()}`, 28, 60);
      autoTable(doc, {
        startY: 90,
        head: [[exportHeaders.count, exportHeaders.realName, exportHeaders.id, exportHeaders.nick, exportHeaders.whatsapp, "Registrado"]],
        body: (regs ?? []).map((r, i) => [i + 1, r.real_name, r.ff_id, r.ff_nick, compactPhone(r.whatsapp), new Date(r.created_at).toLocaleString()]),
        headStyles: { fillColor: [232, 38, 31], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 235, 235] },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 100 },
          2: { cellWidth: 80 },
          3: { cellWidth: 90 },
          4: { cellWidth: 100 },
          5: { cellWidth: "auto" },
        },
      });
      doc.save(`sorteo-${raffle.title}.pdf`);
      toast.success("PDF descargado");
    } catch (e: any) {
      console.error("PDF export error", e);
      toast.error("No se pudo exportar PDF");
    }
  };

  return (
    <div className="surface-card rounded-2xl overflow-hidden border border-border">
      {/* Branded header */}
      <div className="relative px-5 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #2a0606 0%, #0a0a0a 70%)" }}>
        <div className="absolute -right-6 -top-6 h-32 w-32 opacity-25 pointer-events-none">
          <img src={clanLogo} alt="" className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(232,38,31,0.6)]" />
        </div>
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-black/40 border border-primary/50 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={clanLogo} alt="Clan" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-300 font-black">GAME OVER · Sorteo</p>
            <h2 className="font-black text-lg text-white leading-tight truncate">🎁 {raffle.title}</h2>
            {raffle.description && <p className="text-xs text-white/70 mt-1 line-clamp-2">{raffle.description}</p>}
            <TimeBadge raffle={raffle} userTz={userTz} />
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/40">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">{regs?.length ?? 0} participantes</span>
            </div>
          </div>
          {isAdmin && (
            <button onClick={onDelete} className="h-8 w-8 rounded-md border border-white/20 bg-black/30 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="px-5 pt-3">
          {!editingTime ? (
            <button onClick={() => setEditingTime(true)} className="text-[11px] text-secondary font-bold inline-flex items-center gap-1 hover:underline">
              <Clock className="h-3 w-3" /> {raffle.event_time ? "Editar hora" : "Programar hora"}
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-input/30 p-3 space-y-2">
              <FieldLabel label="Fecha y hora (en la zona base)">
                <input type="datetime-local" value={timeDraft.date} onChange={e => setTimeDraft(v => ({ ...v, date: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
              </FieldLabel>
              <FieldLabel label="Zona horaria base">
                <select value={timeDraft.baseTz} onChange={e => setTimeDraft(v => ({ ...v, baseTz: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm">
                  {BASE_TIMEZONES.map(o => <option key={o.tz} value={o.tz}>{o.label}</option>)}
                </select>
              </FieldLabel>
              <div className="flex gap-2">
                <button onClick={() => setEditingTime(false)} className="flex-1 py-1.5 rounded-md border border-border text-xs">Cancelar</button>
                <button onClick={() => updateTime.mutate()} disabled={updateTime.isPending} className="flex-1 py-1.5 rounded-md gradient-neon font-bold text-xs text-primary-foreground">Guardar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {mine && !editing ? (
          <div className="rounded-xl border border-primary/50 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" /> Ya estás inscrito
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div><dt className="text-muted-foreground">Nombre</dt><dd className="font-semibold truncate">{mine.real_name}</dd></div>
              <div><dt className="text-muted-foreground">ID FF</dt><dd className="font-semibold truncate">{mine.ff_id}</dd></div>
              <div><dt className="text-muted-foreground">Nick</dt><dd className="font-semibold truncate">{mine.ff_nick}</dd></div>
              <div><dt className="text-muted-foreground">WhatsApp</dt><dd className="font-semibold truncate">{mine.whatsapp}</dd></div>
            </dl>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditing(true)} className="flex-1 py-2 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1"><Pencil className="h-3 w-3" />Editar</button>
              <button onClick={() => unregister.mutate()} className="flex-1 py-2 rounded-lg border border-destructive/60 text-destructive text-xs font-bold">Salir</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black whitespace-nowrap">{editing ? t("sorteos.edit", "Editar inscripción") : "Inscribirse"}</p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            </div>
            <FieldLabel label="Nombre real">
              <input placeholder="Tu nombre completo" value={form.real_name} onChange={e => setForm(v => ({ ...v, real_name: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            </FieldLabel>
            <FieldLabel label="ID Free Fire">
              <input placeholder="Solo números (6-15 dígitos)" inputMode="numeric" value={form.ff_id} onChange={e => setForm(v => ({ ...v, ff_id: e.target.value.replace(/\D/g, "") }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            </FieldLabel>
            <FieldLabel label="Nick en el juego">
              <input placeholder="Como apareces en Free Fire" value={form.ff_nick} onChange={e => setForm(v => ({ ...v, ff_nick: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            </FieldLabel>
            <FieldLabel label="WhatsApp">
              <input placeholder="+52 555 123 4567" value={form.whatsapp} onChange={e => setForm(v => ({ ...v, whatsapp: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            </FieldLabel>
            <div className="flex gap-2 pt-1">
              {editing && <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancelar</button>}
              <button disabled={register.isPending} onClick={() => register.mutate()} className="flex-1 py-2.5 rounded-lg gradient-neon font-black text-sm text-primary-foreground uppercase tracking-wider disabled:opacity-50">
                {editing ? "Guardar" : t("sorteos.register", "Registrarme")}
              </button>
            </div>
          </div>
        )}
      </div>


      {isAdmin && (
        <div className="mt-5 pt-4 border-t border-border px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-secondary font-bold">Lista de participantes</p>
            <div className="flex gap-1">
              <button onClick={exportPng} className="h-8 px-2 rounded-md border border-border flex items-center gap-1 text-xs"><FileImage className="h-3.5 w-3.5" />PNG</button>
              <button onClick={exportPdf} className="h-8 px-2 rounded-md border border-border flex items-center gap-1 text-xs"><FileText className="h-3.5 w-3.5" />PDF</button>
            </div>
          </div>

          {/* Horizontal scroll wrapper so the on-screen card never breaks the layout on mobile.
              The ref captures the inner sheet at its full width so the export looks polished. */}
          <div className="overflow-x-auto -mx-1 px-1">
            <div ref={sheetRef} style={{ width: 720, maxWidth: "none", background: "#0a0a0a", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Arial, Helvetica, sans-serif" }}>
              {/* Header banner */}
              <div style={{ position: "relative", padding: "24px 28px", background: "linear-gradient(135deg, #e8261f 0%, #7a0b06 60%, #1a0303 100%)" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>{exportKicker}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.6)", marginTop: 4 }}>🎁 {raffle.title}</div>
                    {raffle.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{raffle.description}</div>}
                    {raffle.event_time && raffle.base_timezone && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 6 }}>
                        🕒 {formatInTz(raffle.event_time, raffle.base_timezone)} ({BASE_TIMEZONES.find(b => b.tz === raffle.base_timezone)?.label || raffle.base_timezone})
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 56, width: 56, borderRadius: 16, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{regs?.length ?? 0}</span>
                    </div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", marginTop: 4, fontWeight: 700 }}>{exportCountLabel}</div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ padding: "12px 12px 4px 12px" }}>
                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: 38 }} />
                      <col style={{ width: 160 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 140 }} />
                      <col style={{ width: 160 }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "linear-gradient(90deg, #1a0303, #2a0606)" }}>
                        <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e8261f", fontWeight: 900 }}>{exportHeaders.count}</th>
                        <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e8261f", fontWeight: 900 }}>{exportHeaders.realName}</th>
                        <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e8261f", fontWeight: 900 }}>{exportHeaders.id}</th>
                        <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e8261f", fontWeight: 900 }}>{exportHeaders.nick}</th>
                        <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e8261f", fontWeight: 900 }}>{exportHeaders.whatsapp}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(regs ?? []).length === 0 && (
                        <tr><td colSpan={5} style={{ padding: "20px 8px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>{exportEmpty}</td></tr>
                      )}
                      {(regs ?? []).map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 ? "rgba(232,38,31,0.05)" : "transparent", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 8px", fontWeight: 900, color: "#e8261f", whiteSpace: "nowrap" }}>{String(i + 1).padStart(2, "0")}</td>
                          <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 600, wordBreak: "break-word" }}>{r.real_name}</td>
                          <td style={{ padding: "10px 8px", fontFamily: "Menlo, Consolas, monospace", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>{r.ff_id}</td>
                          <td style={{ padding: "10px 8px", color: "#fff", wordBreak: "break-word" }}>{r.ff_nick}</td>
                          <td style={{ padding: "10px 8px", fontFamily: "Menlo, Consolas, monospace", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>{compactPhone(r.whatsapp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", background: "linear-gradient(90deg, #1a0303, #0a0a0a)", color: "rgba(255,255,255,0.6)" }}>
                <span style={{ fontWeight: 700 }}>{exportGenerated} · {new Date().toLocaleString()}</span>
                <span style={{ fontWeight: 900, color: "#e8261f" }}>{exportFooterBrand}</span>
              </div>
            </div>
          </div>

          {/* Per-row admin controls (not part of the export) */}
          {(regs ?? []).length > 0 && (
            <div className="mt-3 space-y-1">
              {(regs ?? []).map((r, i) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground px-2 py-1 rounded border border-border/60">
                  <span className="truncate"><span className="text-primary font-bold mr-1">{String(i + 1).padStart(2, "0")}</span>{r.ff_nick}</span>
                  <button onClick={() => removeReg.mutate(r.id)} className="h-6 w-6 rounded border border-border inline-flex items-center justify-center text-destructive shrink-0"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1"><Download className="h-3 w-3" />{exportHelp}</p>
        </div>
      )}
    </div>
  );
}
