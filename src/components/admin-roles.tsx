import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ALL_PERMISSIONS, ASSIGNABLE_ROLES, MANAGED_ROLES, type AppRole, type Permission } from "@/hooks/use-permissions";
import { RoleBadge } from "@/components/role-badge";
import { UserPlus, X, Search } from "lucide-react";
import { toast } from "sonner";

export function PermissionsEditor() {
  const qc = useQueryClient();
  const { data: matrix } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => (await supabase.from("role_permissions").select("role, permission, allowed")).data ?? [],
  });

  const groups = Array.from(new Set(ALL_PERMISSIONS.map(p => p.group)));
  const isAllowed = (role: AppRole, perm: Permission) =>
    matrix?.some(r => r.role === role && r.permission === perm && r.allowed) ?? false;

  const toggle = useMutation({
    mutationFn: async ({ role, perm, allowed }: { role: AppRole; perm: Permission; allowed: boolean }) => {
      const { error } = await supabase.from("role_permissions").upsert({ role, permission: perm, allowed, updated_at: new Date().toISOString() } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-permissions"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section className="mt-4 surface-card rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="font-bold uppercase tracking-wider text-sm">Permisos por rol</h2>
        <p className="text-xs text-muted-foreground mt-1">Marca lo que puede hacer cada rol. ADMIN siempre tiene todo.</p>
      </div>
      {groups.map(g => (
        <div key={g} className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">{g}</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_repeat(3,3rem)] text-[10px] font-bold uppercase bg-input/40 px-3 py-2 text-muted-foreground">
              <span>Acción</span>
              {MANAGED_ROLES.map(r => <span key={r.key} className="text-center">{r.label.split(" ")[0]}</span>)}
            </div>
            {ALL_PERMISSIONS.filter(p => p.group === g).map(p => (
              <div key={p.key} className="grid grid-cols-[1fr_repeat(3,3rem)] px-3 py-2.5 border-t border-border items-center text-sm">
                <span>{p.label}</span>
                {MANAGED_ROLES.map(r => (
                  <div key={r.key} className="flex justify-center">
                    <input type="checkbox" className="h-4 w-4 accent-primary cursor-pointer"
                      checked={isAllowed(r.key, p.key)}
                      onChange={e => toggle.mutate({ role: r.key, perm: p.key, allowed: e.target.checked })} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function RolesEditor() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const { data: members } = useQuery({
    queryKey: ["admin-members-roles"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_members" as any);
      return (data ?? []) as any[];
    },
  });
  const { data: allRoles } = useQuery({
    queryKey: ["admin-all-user-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const rolesByUser = (uid: string) => (allRoles ?? []).filter(r => r.user_id === uid).map(r => r.role as AppRole);

  const filtered = (members ?? []).filter((m: any) =>
    !query || m.ff_nick?.toLowerCase().includes(query.toLowerCase()) || m.real_name?.toLowerCase().includes(query.toLowerCase())
  );

  const setRole = useMutation({
    mutationFn: async ({ uid, role, on }: { uid: string; role: AppRole; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      qc.invalidateQueries({ queryKey: ["my-roles"] });
      qc.invalidateQueries({ queryKey: ["user-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section className="mt-4 surface-card rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold uppercase tracking-wider text-sm">Asignar roles</h2>
        <p className="text-xs text-muted-foreground mt-1">Da rol a cada miembro. Un miembro puede tener varios.</p>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar integrante..."
          className="w-full bg-input/60 border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.map((m: any) => {
          const myRoles = rolesByUser(m.id);
          return (
            <div key={m.id} className="rounded-xl border border-border bg-input/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{m.ff_nick}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.real_name}</p>
                </div>
                <RoleBadge roles={myRoles} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ASSIGNABLE_ROLES.map(r => {
                  const on = myRoles.includes(r.key);
                  return (
                    <button key={r.key} onClick={() => setRole.mutate({ uid: m.id, role: r.key, on: !on })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1 ${on ? "gradient-neon text-primary-foreground border-transparent" : "bg-input/40 text-muted-foreground border-border"}`}>
                      {on ? <X className="h-2.5 w-2.5" /> : <UserPlus className="h-2.5 w-2.5" />}
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
