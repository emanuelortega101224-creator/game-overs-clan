import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { ArrowLeft, Users, Plus, LogIn, LogOut, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useRealtime } from "@/hooks/use-realtime";

const LABELS: Record<string, string> = { guerra: "Guerra de Clanes", competencia: "Competencias", versus: "Versus" };

export const Route = createFileRoute("/_app/eventos/$type")({
  head: ({ params }) => ({ meta: [{ title: `${LABELS[params.type] ?? "Eventos"} · GAME OVER` }] }),
  component: EventoTypePage,
});

function EventoTypePage() {
  const { type } = Route.useParams();
  const { user } = useAuth();
  const { can } = usePermissions();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "" });

  useRealtime(`eventos-${type}`, [
    { table: "events", keys: [["events", type]] },
    { table: "groups", keys: [["groups-by-type"]] },
    { table: "group_members", keys: [["groups-by-type"]] },
  ]);

  const { data: events } = useQuery({
    queryKey: ["events", type],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("type", type as "guerra"|"competencia"|"versus").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: groups } = useQuery({
    enabled: !!events && events.length > 0 && !!user?.id,
    queryKey: ["groups-by-type", type, user?.id, events?.map(e => e.id).join(",")],
    queryFn: async () => {
      const ids = events!.map(e => e.id);
      const { data: gs, error } = await supabase.from("groups").select("*").in("event_id", ids);
      if (error) throw error;
      const { data: ms } = await supabase.from("group_members").select("group_id, user_id");
      return (gs ?? []).map(g => {
        const members = (ms ?? []).filter(m => m.group_id === g.id);
        return { ...g, count: members.length, joined: members.some(m => m.user_id === user?.id) };
      });
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("events").insert({
        type: type as "guerra"|"competencia"|"versus",
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Evento creado"); setCreating(false); setNewEvent({ title:"", description:"" }); qc.invalidateQueries({ queryKey: ["events", type] }); },
    onError: (e) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: user!.id });
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => { toast.success("Te uniste al grupo"); qc.invalidateQueries({ queryKey: ["groups-by-type"] }); navigate({ to: "/grupos/$id", params: { id: groupId } }); },
    onError: (e: any, groupId) => {
      const msg = String(e?.message || "");
      const code = String(e?.code || "");
      if (msg.includes("GROUP_FULL")) {
        toast.error("Este grupo ya está lleno", { description: "Ya no se permiten más integrantes." });
      } else if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
        // Already a member — just refresh and open the group.
        qc.invalidateQueries({ queryKey: ["groups-by-type"] });
        navigate({ to: "/grupos/$id", params: { id: groupId } });
      } else {
        toast.error(msg || "No se pudo unir");
      }
    },
  });

  const leave = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saliste del grupo"); qc.invalidateQueries({ queryKey: ["groups-by-type"] }); },
  });

  return (
    <div className="px-5 pt-8">
      <Link to="/eventos/" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Eventos</Link>
      <h1 className="mt-4 text-2xl font-black text-glow-orange uppercase">{LABELS[type]}</h1>

      {can("create_event") && (
        <div className="mt-4">
          {!creating ? (
            <button onClick={() => setCreating(true)} className="w-full surface-card rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold text-secondary">
              <Plus className="h-4 w-4" /> Crear evento
            </button>
          ) : (
            <div className="surface-card rounded-xl p-4 space-y-3">
              <input placeholder="Título" value={newEvent.title} onChange={e => setNewEvent(v => ({ ...v, title: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
              <textarea placeholder="Descripción (opcional)" value={newEvent.description} onChange={e => setNewEvent(v => ({ ...v, description: e.target.value }))} className="w-full bg-input/60 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary min-h-20" />
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancelar</button>
                <button disabled={!newEvent.title || createEvent.isPending} onClick={() => createEvent.mutate()} className="flex-1 py-2 rounded-lg gradient-neon font-bold text-sm text-primary-foreground disabled:opacity-50">Crear</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {events?.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos todavía.</p>}
        {events?.map(ev => {
          const evGroups = groups?.filter(g => g.event_id === ev.id) ?? [];
          return <EventCard key={ev.id} ev={ev as any} evGroups={evGroups} canCreateGroup={can("create_group")} canEditEvent={can("edit_event")} join={join} leave={leave} qc={qc} />;
        })}
      </div>
    </div>
  );
}

function EventCard({ ev, evGroups, canCreateGroup, canEditEvent, join, leave, qc }: any) {
  const bg = useSignedUrl("event-backgrounds", ev.background_url);

  return (
    <div className="relative surface-card rounded-2xl p-5 overflow-hidden">
      {bg && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        </>
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-black text-lg">{ev.title}</h2>
            {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
          </div>
          {canEditEvent && <EventBgManager ev={ev} onChanged={() => qc.invalidateQueries({ queryKey: ["events", ev.type] })} />}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-primary font-bold">Grupos disponibles</p>
            {canCreateGroup && <CreateGroup eventId={ev.id} onCreated={() => qc.invalidateQueries({ queryKey: ["groups-by-type"] })} />}
          </div>

          {evGroups.length === 0 && <p className="text-xs text-muted-foreground">Sin grupos aún.</p>}


          <div className="space-y-2">
            {evGroups.map((g: any) => {
              const full = g.count >= g.max_members;
              return (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-input/40 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{g.count}/{g.max_members}</p>
                  </div>
                  {g.joined ? (
                    <>
                      <Link to="/grupos/$id" params={{ id: g.id }} className="px-3 py-1.5 rounded-md gradient-neon text-xs font-bold text-primary-foreground">Abrir</Link>
                      <button onClick={() => leave.mutate(g.id)} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-destructive"><LogOut className="h-3.5 w-3.5" /></button>
                    </>
                  ) : (
                    <button disabled={full || join.isPending} onClick={() => join.mutate(g.id)} className="px-3 py-1.5 rounded-md border border-primary/60 text-xs font-bold text-primary disabled:opacity-40 flex items-center gap-1">
                      <LogIn className="h-3 w-3" /> {full ? "Lleno" : "Unirse"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventBgManager({ ev, onChanged }: { ev: any; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const path = `${ev.id}/bg-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("event-backgrounds").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      // remove old if existed
      if (ev.background_url) {
        await supabase.storage.from("event-backgrounds").remove([ev.background_url]).catch(() => {});
      }
      const { error } = await supabase.from("events").update({ background_url: path }).eq("id", ev.id);
      if (error) throw error;
      toast.success("Fondo actualizado");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      if (ev.background_url) {
        await supabase.storage.from("event-backgrounds").remove([ev.background_url]).catch(() => {});
      }
      const { error } = await supabase.from("events").update({ background_url: null }).eq("id", ev.id);
      if (error) throw error;
      toast.success("Fondo eliminado");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <label className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-primary cursor-pointer" title="Subir fondo">
        <ImageIcon className="h-4 w-4" />
        <input type="file" accept="image/*" className="hidden" disabled={busy}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      </label>
      {ev.background_url && (
        <button onClick={onRemove} disabled={busy} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-destructive" title="Quitar fondo">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function CreateGroup({ eventId, onCreated }: { eventId: string; onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [max, setMax] = useState(6);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("groups").insert({ event_id: eventId, name: name.trim(), max_members: max, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Grupo creado"); setOpen(false); setName(""); onCreated(); },
    onError: (e) => toast.error(e.message),
  });
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-primary font-bold flex items-center gap-1"><Plus className="h-3 w-3" />Grupo</button>;
  return (
    <div className="flex gap-2 items-center w-full">
      <input placeholder="Nombre del grupo" value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-input/60 border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-primary" />
      <select value={max} onChange={e => setMax(+e.target.value)} className="bg-input/60 border border-border rounded-md px-2 py-1 text-xs">
        {[4,5,6].map(n => <option key={n} value={n}>{n}p</option>)}
      </select>
      <button disabled={!name || m.isPending} onClick={() => m.mutate()} className="px-2 py-1 rounded-md gradient-neon text-xs font-bold text-primary-foreground disabled:opacity-50">OK</button>
      <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">✕</button>
    </div>
  );
}
