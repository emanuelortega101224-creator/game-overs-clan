import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-profile";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { RolesEditor, PermissionsEditor } from "@/components/admin-roles";
import { ArrowLeft, Save, Image as ImageIcon, Trash2, Upload, Plus, Users, Pencil, X, Swords, Trophy, Zap, Gift, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin · GAME OVER" }] }),
  component: AdminPage,
});

const TEXT_SECTIONS = [
  { id: "login", label: "Login", fields: [
    ["auth.brand.title", "GAME OVER"], ["auth.brand.subtitle", "Free Fire · Comunidad"], ["auth.tab.login", "Entrar"], ["auth.tab.signup", "Crear cuenta"],
    ["auth.login.title", "Inicia sesión"], ["auth.login.subtitle", "Ingresa con tu cuenta del clan."], ["auth.signup.title", "Únete al clan"], ["auth.signup.subtitle", "Crea tu cuenta para participar en eventos."],
    ["auth.email.label", "Email"], ["auth.email.placeholder", "tucorreo@ejemplo.com"], ["auth.password.label", "Contraseña"], ["auth.password.placeholder", "Mínimo 6 caracteres"],
    ["auth.login.button", "Entrar al clan"], ["auth.signup.button", "Crear cuenta"],
    ["registro.country.label", "País detectado"],
  ]},
  { id: "inicio", label: "Inicio", fields: [
    ["panel.welcome", "Bienvenido"], ["panel.hero.kicker", "Clan oficial"], ["panel.hero.title", "FREE FIRE"], ["panel.hero.subtitle", "Únete a la batalla. Comparte estrategia."],
    ["panel.section.community", "Comunidad"], ["panel.section.clan", "Clan"], ["panel.section.admin", "Administración"], ["panel.ranking.title", "Ranking MVP"], ["panel.ranking.subtitle", "Top jugadores del clan"],
    ["panel.admin.title", "Panel admin"], ["panel.admin.subtitle", "Eventos, MVPs, textos y enlaces"],
  ]},
  { id: "eventos", label: "Eventos", fields: [
    ["eventos.title", "EVENTOS"], ["eventos.subtitle", "Elige tu modo"], ["eventos.guerra.title", "Guerra de Clanes"], ["eventos.guerra.desc", ""],
    ["eventos.competencia.title", "Competencias"], ["eventos.competencia.desc", ""], ["eventos.versus.title", "Versus"], ["eventos.versus.desc", ""],
    ["eventos.sorteo.title", "Sorteos"], ["eventos.sorteo.desc", "Regístrate para participar en sorteos del clan"],
  ]},
  { id: "sorteos", label: "Sorteos", fields: [
    ["sorteos.title", "Sorteos"], ["sorteos.subtitle", "Inscríbete y participa"], ["sorteos.empty", "No hay sorteos activos."], ["sorteos.create", "Crear sorteo"],
    ["sorteos.form.title", "Título del sorteo"], ["sorteos.form.description", "Descripción (opcional)"], ["sorteos.form.date", "Fecha y hora (opcional)"], ["sorteos.form.tz", "Zona horaria base"],
    ["sorteos.register", "Registrarme"], ["sorteos.edit", "Editar inscripción"],
  ]},
  { id: "sorteos_export", label: "Sorteos · Export", fields: [
    ["sorteos.export.kicker", "GAME OVER · Sorteo oficial"],
    ["sorteos.export.brand", "GAME OVER"],
    ["sorteos.export.empty", "Sin inscritos aún."],
    ["sorteos.export.help", "Exporta como imagen lista para compartir o PDF para archivar."],
    ["sorteos.export.table.count", "#"],
    ["sorteos.export.table.real_name", "Nombre real"],
    ["sorteos.export.table.id", "ID"],
    ["sorteos.export.table.nick", "Nick"],
    ["sorteos.export.table.whatsapp", "WhatsApp"],
    ["sorteos.export.count_label", "Inscritos"],
    ["sorteos.export.generated", "Generado"],
  ]},
  { id: "registro", label: "Registro", fields: [
    ["registro.title", "COMPLETA TU PERFIL"], ["registro.subtitle", "Datos del jugador"], ["registro.avatar", "Foto personal"], ["registro.avatar.note", "(obligatoria)"],
    ["registro.game", "Foto personal"], ["registro.game.note", "(obligatoria)"], ["registro.game.help", "Tu foto se usará para identificar tu cuenta dentro de la app."], ["registro.ffid", "ID de Free Fire"],
    ["registro.ffid.placeholder", "Solo números"], ["registro.nick", "Nick de Free Fire"], ["registro.real_name", "Nombre real"], ["registro.phone", "Teléfono"], ["registro.submit", "Entrar al panel"],
  ]},
  { id: "perfil", label: "Perfil", fields: [
    ["perfil.title", "MI PERFIL"], ["perfil.data", "Datos"], ["perfil.ffid", "ID de Free Fire"], ["perfil.phone", "Teléfono"], ["perfil.real_name", "Nombre real"],
    ["perfil.hidden.help", "Los campos marcados están ocultos a otros integrantes."], ["perfil.participaciones", "Participaciones"], ["perfil.game.title", "Mi captura del juego"], ["perfil.game.help", "Solo el admin del clan puede verla."],
  ]},
  { id: "integrantes", label: "Integrantes", fields: [
    ["integrantes.title", "INTEGRANTES"], ["integrantes.subtitle", "soldados"], ["integrantes.empty", "Aún no hay miembros."],
  ]},
  { id: "ranking", label: "Ranking", fields: [
    ["ranking.kicker", "Hall of Fame"], ["ranking.title", "RANKING MVP"], ["ranking.subtitle", "Los mejores del clan medidos por MVPs en cada categoría de evento."], ["ranking.empty", "Cuando termine un evento de esta categoría aparecerán los mejores aquí."],
  ]},
] as const;

const EVENT_TYPES: { col: "bg_guerra"|"bg_competencia"|"bg_versus"; label: string }[] = [
  { col: "bg_guerra", label: "Guerra" },
  { col: "bg_competencia", label: "Competencia" },
  { col: "bg_versus", label: "Versus" },
];

const EVENT_TYPE_OPTIONS = [
  { key: "guerra", label: "Guerra", icon: Swords },
  { key: "competencia", label: "Competencia", icon: Trophy },
  { key: "versus", label: "Versus", icon: Zap },
  { key: "sorteo", label: "Sorteo", icon: Gift },
] as const;

function AdminPage() {
  const { user } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"links"|"texts"|"backgrounds"|"stickers"|"eventos"|"mvp"|"roles"|"perms">("links");
  const [whats, setWhats] = useState("");
  const [disc, setDisc] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clan_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (settings) { setWhats(settings.whatsapp_url ?? ""); setDisc(settings.discord_url ?? ""); }
  }, [settings]);

  useEffect(() => {
    if (!isLoading && isAdmin === false) navigate({ to: "/panel", replace: true });
  }, [isAdmin, isLoading, navigate]);

  const saveLinks = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clan_settings").upsert({ id: 1, whatsapp_url: whats.trim(), discord_url: disc.trim(), updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Enlaces guardados"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)}
      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${tab===id ? "gradient-neon text-primary-foreground" : "bg-input/60 text-muted-foreground border border-border"}`}>
      {label}
    </button>
  );

  return (
    <div className="px-5 pt-8 pb-10">
      <Link to="/panel" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Volver</Link>
      <h1 className="mt-4 text-2xl font-black text-glow-purple">PANEL ADMIN</h1>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <TabBtn id="roles" label="Roles" />
        <TabBtn id="perms" label="Permisos" />
        <TabBtn id="eventos" label="Eventos" />
        <TabBtn id="mvp" label="MVPs" />
        <TabBtn id="links" label="Enlaces" />
        <TabBtn id="texts" label="Textos" />
        <TabBtn id="backgrounds" label="Fondos" />
        <TabBtn id="stickers" label="Stickers" />
      </div>

      {tab === "links" && (
        <section className="mt-4 surface-card rounded-2xl p-5 space-y-4">
          <h2 className="font-bold uppercase tracking-wider text-sm">Enlaces del clan</h2>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp</label>
            <input value={whats} onChange={e => setWhats(e.target.value)} placeholder="https://chat.whatsapp.com/..."
              className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Discord</label>
            <input value={disc} onChange={e => setDisc(e.target.value)} placeholder="https://discord.gg/..."
              className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
          </div>
          <button onClick={() => saveLinks.mutate()} disabled={saveLinks.isPending} className="w-full gradient-neon font-bold py-2.5 rounded-lg text-primary-foreground flex items-center justify-center gap-2">
            <Save className="h-4 w-4" /> Guardar
          </button>
        </section>
      )}

      {tab === "texts" && <TextsEditor />}
      {tab === "backgrounds" && <BackgroundsEditor settings={settings} />}
      {tab === "stickers" && <StickersEditor />}
      {tab === "mvp" && <MvpEditor />}
      {tab === "roles" && <RolesEditor />}
      {tab === "perms" && <PermissionsEditor />}


      {tab === "eventos" && <AdminEventsEditor />}
    </div>
  );
}

function TextsEditor() {
  const qc = useQueryClient();
  const [section, setSection] = useState<string>(TEXT_SECTIONS[0].id);
  const { data: rows } = useQuery({
    queryKey: ["admin-texts"],
    queryFn: async () => (await supabase.from("site_texts").select("*")).data as any[] ?? [],
  });
  const [edits, setEdits] = useState<Record<string,string>>({});

  const currentSection = TEXT_SECTIONS.find(s => s.id === section)!;
  const valueFor = (k: string, fallback: string) => edits[k] ?? rows?.find(r => r.key === k)?.value ?? fallback;

  const save = useMutation({
    mutationFn: async () => {
      const upserts = Object.entries(edits).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
      if (!upserts.length) return;
      const { error } = await supabase.from("site_texts").upsert(upserts);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Textos guardados"); setEdits({}); qc.invalidateQueries({ queryKey: ["admin-texts"] }); qc.invalidateQueries({ queryKey: ["site_texts"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="mt-4 surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold uppercase tracking-wider text-sm">Textos editables</h2>
        <p className="text-xs text-muted-foreground mt-1">Selecciona un apartado y edita los textos.</p>
      </div>
      <select value={section} onChange={e => setSection(e.target.value)}
        className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm">
        {TEXT_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <div className="space-y-3">
        {currentSection.fields.map(([k, fallback]) => (
          <div key={k}>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{k}</label>
            <textarea value={valueFor(k, fallback)} onChange={e => setEdits(prev => ({ ...prev, [k]: e.target.value }))}
              className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm min-h-12 outline-none focus:border-primary resize-y" />
          </div>
        ))}
      </div>
      <button onClick={() => save.mutate()} disabled={!Object.keys(edits).length || save.isPending}
        className="w-full gradient-neon font-bold py-2.5 rounded-lg text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
        <Save className="h-4 w-4" /> Guardar cambios
      </button>
    </section>
  );
}

function AdminEventsEditor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<(typeof EVENT_TYPE_OPTIONS)[number]["key"]>("guerra");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "" });

  const { data: events } = useQuery({
    queryKey: ["admin-events-inline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["admin-groups-inline"],
    queryFn: async () => {
      const { data: gs, error } = await supabase.from("groups").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      const { data: ms } = await supabase.from("group_members").select("group_id, user_id");
      return (gs ?? []).map((g: any) => ({ ...g, count: (ms ?? []).filter(m => m.group_id === g.id).length }));
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-events-inline"] });
    qc.invalidateQueries({ queryKey: ["admin-groups-inline"] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["groups-by-type"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        type: type as any,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Evento creado"); setCreating(false); setDraft({ title: "", description: "" }); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (events ?? []).filter((ev: any) => ev.type === type);

  return (
    <section className="mt-4 space-y-4">
      <div className="surface-card rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-bold uppercase tracking-wider text-sm">Gestionar eventos</h2>
          <p className="text-xs text-muted-foreground mt-1">Crea, edita, elimina y arma grupos sin salir del admin.</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {EVENT_TYPE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button key={opt.key} onClick={() => setType(opt.key)}
                className={`rounded-xl border py-2 px-1 flex flex-col items-center gap-1 ${type === opt.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-input/30 text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {!creating ? (
          <button onClick={() => setCreating(true)} className="w-full rounded-xl border border-primary/50 bg-primary/10 py-3 text-sm font-black text-primary flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo evento
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-input/30 p-3 space-y-3">
            <input placeholder="Título" value={draft.title} onChange={e => setDraft(v => ({ ...v, title: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            <textarea placeholder="Descripción" value={draft.description} onChange={e => setDraft(v => ({ ...v, description: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm min-h-20 outline-none focus:border-primary" />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button disabled={!draft.title.trim() || create.isPending} onClick={() => create.mutate()} className="flex-1 py-2 rounded-lg gradient-neon font-bold text-sm text-primary-foreground disabled:opacity-50">Crear</button>
            </div>
          </div>
        )}
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground px-1">No hay eventos en esta categoría.</p>}
      {filtered.map((ev: any) => <AdminEventCard key={ev.id} ev={ev} groups={(groups ?? []).filter((g: any) => g.event_id === ev.id)} onChanged={refresh} />)}
    </section>
  );
}

function AdminEventCard({ ev, groups, onChanged }: { ev: any; groups: any[]; onChanged: () => void }) {
  const { user } = useAuth();
  const bg = useSignedUrl("event-backgrounds", ev.background_url);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: ev.title ?? "", description: ev.description ?? "" });
  const [groupName, setGroupName] = useState("");
  const [max, setMax] = useState(6);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").update({ title: draft.title.trim(), description: draft.description.trim() || null }).eq("id", ev.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Evento actualizado"); setEditing(false); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").delete().eq("id", ev.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Evento eliminado"); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("groups").insert({ event_id: ev.id, name: groupName.trim(), max_members: max, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Grupo creado"); setGroupName(""); setMax(6); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="relative surface-card rounded-2xl overflow-hidden border border-border">
      {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
      {bg && <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />}
      <div className="relative p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input value={draft.title} onChange={e => setDraft(v => ({ ...v, title: e.target.value }))} className="w-full bg-input/70 border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-primary" />
                <textarea value={draft.description} onChange={e => setDraft(v => ({ ...v, description: e.target.value }))} className="w-full bg-input/70 border border-border rounded-lg px-3 py-2 text-sm min-h-16 outline-none focus:border-primary" />
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-primary font-black">{ev.type}</p>
                <h3 className="font-black text-lg leading-tight">{ev.title}</h3>
                {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
              </>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {editing ? (
              <button onClick={() => { setEditing(false); setDraft({ title: ev.title ?? "", description: ev.description ?? "" }); }} className="h-8 w-8 rounded-md border border-border flex items-center justify-center"><X className="h-4 w-4" /></button>
            ) : (
              <button onClick={() => setEditing(true)} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-primary"><Pencil className="h-4 w-4" /></button>
            )}
            <AdminEventBgButton ev={ev} onChanged={onChanged} />
            <button onClick={() => remove.mutate()} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        {editing && <button onClick={() => save.mutate()} disabled={!draft.title.trim() || save.isPending} className="w-full gradient-neon rounded-lg py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Guardar evento</button>}
        {ev.type !== "sorteo" && (
          <div className="rounded-xl border border-border bg-input/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-secondary font-black">Grupos</p>
              <span className="text-[10px] text-muted-foreground">{groups.length}</span>
            </div>
            {groups.map(g => <AdminGroupRow key={g.id} group={g} onChanged={onChanged} />)}
            <div className="grid grid-cols-[1fr_4.5rem_auto] gap-2">
              <input placeholder="Nombre del grupo" value={groupName} onChange={e => setGroupName(e.target.value)} className="bg-input/70 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary min-w-0" />
              <input type="number" min={1} max={50} value={max} onChange={e => setMax(Number(e.target.value))} className="bg-input/70 border border-border rounded-lg px-2 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={() => createGroup.mutate()} disabled={!groupName.trim() || createGroup.isPending} className="h-10 w-10 rounded-lg gradient-neon text-primary-foreground flex items-center justify-center disabled:opacity-50"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminEventBgButton({ ev, onChanged }: { ev: any; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = `${ev.id}/bg-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("event-backgrounds").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      if (ev.background_url) await supabase.storage.from("event-backgrounds").remove([ev.background_url]).catch(() => {});
      const { error } = await supabase.from("events").update({ background_url: path }).eq("id", ev.id);
      if (error) throw error;
      toast.success("Fondo del evento actualizado");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <label className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-primary cursor-pointer" title="Fondo">
      <ImageIcon className="h-4 w-4" />
      <input type="file" accept="image/*" className="hidden" disabled={busy}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </label>
  );
}

function AdminGroupRow({ group, onChanged }: { group: any; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name ?? "");
  const [max, setMax] = useState(group.max_members ?? 6);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("groups").update({ name: name.trim(), max_members: max }).eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Grupo actualizado"); setEditing(false); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("groups").delete().eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Grupo eliminado"); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (editing) return (
    <div className="rounded-lg border border-border bg-background/40 p-2 space-y-2">
      <div className="grid grid-cols-[1fr_4.5rem] gap-2">
        <input value={name} onChange={e => setName(e.target.value)} className="bg-input/70 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary min-w-0" />
        <input type="number" min={1} max={50} value={max} onChange={e => setMax(Number(e.target.value))} className="bg-input/70 border border-border rounded-lg px-2 py-2 text-sm outline-none focus:border-primary" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setEditing(false); setName(group.name ?? ""); setMax(group.max_members ?? 6); }} className="flex-1 py-1.5 rounded-md border border-border text-xs">Cancelar</button>
        <button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} className="flex-1 py-1.5 rounded-md gradient-neon text-xs font-bold text-primary-foreground disabled:opacity-50">Guardar</button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
      <Users className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{group.name}</p>
        <p className="text-[10px] text-muted-foreground">{group.count ?? 0}/{group.max_members} jugadores</p>
      </div>
      <Link to="/admin/grupo/$id" params={{ id: group.id }} className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-secondary" title="Espiar chat"><Eye className="h-3.5 w-3.5" /></Link>
      <AdminGroupBgButton group={group} onChanged={onChanged} />
      <button onClick={() => setEditing(true)} className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-primary"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={() => remove.mutate()} className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function AdminGroupBgButton({ group, onChanged }: { group: any; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = `group-${group.id}/${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("event-backgrounds").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      if (group.background_url) await supabase.storage.from("event-backgrounds").remove([group.background_url]).catch(() => {});
      const { error } = await supabase.from("groups").update({ background_url: path } as any).eq("id", group.id);
      if (error) throw error;
      toast.success("Fondo del grupo actualizado");
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <label className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-primary cursor-pointer" title="Fondo del chat">
      <ImageIcon className="h-3.5 w-3.5" />
      <input type="file" accept="image/*" className="hidden" disabled={busy}
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </label>
  );
}

function BackgroundsEditor({ settings }: { settings: any }) {
  return (
    <section className="mt-4 surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold uppercase tracking-wider text-sm">Fondos por tipo de evento</h2>
        <p className="text-xs text-muted-foreground mt-1">Se mostrarán en la lista de Eventos.</p>
      </div>
      {EVENT_TYPES.map(et => (
        <BgRow key={et.col} col={et.col} label={et.label} path={settings?.[et.col]} />
      ))}
    </section>
  );
}

function BgRow({ col, label, path }: { col: "bg_guerra"|"bg_competencia"|"bg_versus"; label: string; path: string | null | undefined }) {
  const qc = useQueryClient();
  const url = useSignedUrl("event-backgrounds", path);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const p = `type-${col}/${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("event-backgrounds").upload(p, file, { upsert: true });
      if (upErr) throw upErr;
      if (path) await supabase.storage.from("event-backgrounds").remove([path]).catch(() => {});
      const { error } = await supabase.from("clan_settings").upsert({ id: 1, [col]: p, updated_at: new Date().toISOString() } as any);
      if (error) throw error;
      toast.success("Fondo actualizado");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      if (path) await supabase.storage.from("event-backgrounds").remove([path]).catch(() => {});
      const { error } = await supabase.from("clan_settings").upsert({ id: 1, [col]: null, updated_at: new Date().toISOString() } as any);
      if (error) throw error;
      toast.success("Fondo quitado");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-border p-3 bg-input/30">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1">
          <label className="h-8 px-2 rounded-md border border-border flex items-center gap-1 text-xs text-primary cursor-pointer">
            <ImageIcon className="h-3.5 w-3.5" /> {path ? "Cambiar" : "Subir"}
            <input type="file" accept="image/*" className="hidden" disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>
          {path && (
            <button onClick={remove} disabled={busy} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {url ? (
        <div className="aspect-[16/7] rounded-md overflow-hidden bg-surface-2">
          <img src={url} alt={label} className="w-full h-full object-cover" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin fondo. Se usará el color por defecto.</p>
      )}
    </div>
  );
}

function StickersEditor() {
  const qc = useQueryClient();
  const { data: stickers } = useQuery({
    queryKey: ["admin-stickers"],
    queryFn: async () => (await supabase.from("stickers").select("*").order("created_at", { ascending: false })).data as any[] ?? [],
  });
  const [busy, setBusy] = useState(false);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const p = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${f.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("stickers").upload(p, f);
        if (upErr) throw upErr;
        const { error } = await supabase.from("stickers").insert({ image_path: p });
        if (error) throw error;
      }
      toast.success("Stickers subidos");
      qc.invalidateQueries({ queryKey: ["admin-stickers"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("stickers").remove([path]).catch(() => {});
    const { error } = await supabase.from("stickers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sticker eliminado");
    qc.invalidateQueries({ queryKey: ["admin-stickers"] });
  };

  return (
    <section className="mt-4 surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold uppercase tracking-wider text-sm">Pack de stickers</h2>
        <p className="text-xs text-muted-foreground mt-1">PNG / GIF transparente, idealmente 256x256.</p>
      </div>
      <label className="w-full block border-2 border-dashed border-primary/50 rounded-xl py-6 text-center text-sm text-primary cursor-pointer">
        <Upload className="h-5 w-5 mx-auto mb-1" />
        {busy ? "Subiendo..." : "Subir uno o varios"}
        <input type="file" accept="image/*" multiple className="hidden" disabled={busy}
          onChange={e => { onUpload(e.target.files); e.target.value = ""; }} />
      </label>
      <div className="grid grid-cols-4 gap-2">
        {stickers?.length === 0 && <p className="col-span-4 text-xs text-muted-foreground text-center py-3">Aún no hay stickers.</p>}
        {stickers?.map(s => <AdminStickerThumb key={s.id} sticker={s} onRemove={() => remove(s.id, s.image_path)} />)}
      </div>
    </section>
  );
}

function AdminStickerThumb({ sticker, onRemove }: { sticker: any; onRemove: () => void }) {
  const url = useSignedUrl("stickers", sticker.image_path);
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-input/40 group">
      {url ? <img src={url} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full animate-pulse bg-muted" />}
      <button onClick={onRemove} className="absolute top-1 right-1 h-6 w-6 rounded-md bg-background/80 border border-border text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function MvpEditor() {
  const qc = useQueryClient();
  const [eventId, setEventId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const { data: events } = useQuery({
    queryKey: ["admin-events-all"],
    queryFn: async () => (await supabase.from("events").select("id, title, type").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: members } = useQuery({
    queryKey: ["admin-members-all"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_members" as any);
      return (data ?? []) as any[];
    },
  });
  const { data: mvps } = useQuery({
    queryKey: ["admin-mvps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_mvps" as any)
        .select("id, created_at, event_id, user_id, events(title, type), profiles(ff_nick)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!eventId || !userId) throw new Error("Selecciona evento y jugador");
      const { error } = await supabase.from("event_mvps" as any).insert({ event_id: eventId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("MVP asignado");
      setEventId(""); setUserId("");
      qc.invalidateQueries({ queryKey: ["admin-mvps"] });
      qc.invalidateQueries({ queryKey: ["mvp-ranking"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_mvps" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("MVP eliminado");
      qc.invalidateQueries({ queryKey: ["admin-mvps"] });
      qc.invalidateQueries({ queryKey: ["mvp-ranking"] });
    },
  });

  return (
    <section className="mt-4 surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold uppercase tracking-wider text-sm">MVPs por evento</h2>
        <p className="text-xs text-muted-foreground mt-1">Marca al mejor jugador de cada evento. Esto alimenta el ranking.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3 bg-input/30">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Evento</label>
          <select value={eventId} onChange={e => setEventId(e.target.value)}
            className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Selecciona...</option>
            {events?.map((e: any) => (
              <option key={e.id} value={e.id}>[{e.type}] {e.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Jugador MVP</label>
          <select value={userId} onChange={e => setUserId(e.target.value)}
            className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Selecciona...</option>
            {members?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.ff_nick || "—"}</option>
            ))}
          </select>
        </div>
        <button onClick={() => add.mutate()} disabled={!eventId || !userId || add.isPending}
          className="w-full gradient-neon font-bold py-2.5 rounded-lg text-primary-foreground text-sm uppercase tracking-wider disabled:opacity-50">
          Asignar MVP
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Historial</p>
        {(!mvps || mvps.length === 0) && <p className="text-xs text-muted-foreground">Sin MVPs aún.</p>}
        {mvps?.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-input/40 border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{m.profiles?.ff_nick || "—"}</p>
              <p className="text-[10px] text-muted-foreground truncate">[{m.events?.type}] {m.events?.title}</p>
            </div>
            <button onClick={() => remove.mutate(m.id)} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

