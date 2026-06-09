import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "admin" | "lider" | "lider_interno" | "decano" | "member";

export type Permission =
  | "create_event" | "edit_event" | "delete_event"
  | "create_group" | "edit_group" | "delete_group"
  | "moderate_chat" | "assign_mvp" | "view_member_contacts"
  | "manage_raffles" | "manage_stickers" | "edit_site_texts";

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: "create_event", label: "Crear eventos", group: "Eventos" },
  { key: "edit_event", label: "Editar eventos", group: "Eventos" },
  { key: "delete_event", label: "Eliminar eventos", group: "Eventos" },
  { key: "create_group", label: "Crear grupos", group: "Grupos" },
  { key: "edit_group", label: "Editar grupos", group: "Grupos" },
  { key: "delete_group", label: "Eliminar grupos", group: "Grupos" },
  { key: "moderate_chat", label: "Moderar chats", group: "Chat" },
  { key: "assign_mvp", label: "Asignar MVPs", group: "Ranking" },
  { key: "view_member_contacts", label: "Ver contactos ocultos", group: "Integrantes" },
  { key: "manage_raffles", label: "Gestionar sorteos", group: "Otros" },
  { key: "manage_stickers", label: "Gestionar stickers", group: "Otros" },
  { key: "edit_site_texts", label: "Editar textos del sitio", group: "Otros" },
];

export const MANAGED_ROLES: { key: Exclude<AppRole, "admin" | "member">; label: string; color: string }[] = [
  { key: "lider", label: "Líder", color: "text-primary" },
  { key: "lider_interno", label: "Líder interno", color: "text-secondary" },
  { key: "decano", label: "Decano", color: "text-amber-400" },
];

export const ASSIGNABLE_ROLES: { key: Exclude<AppRole, "member">; label: string; color: string }[] = [
  { key: "admin", label: "Admin", color: "text-primary" },
  ...MANAGED_ROLES,
];

export function useMyRoles() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ["my-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map(r => r.role as AppRole);
    },
  });
}

export function usePermissions() {
  const { data: roles } = useMyRoles();
  const { data: matrix } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("role, permission, allowed");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isAdmin = !!roles?.includes("admin");
  const can = (perm: Permission) => {
    if (isAdmin) return true;
    if (!roles || !matrix) return false;
    return matrix.some(rp =>
      rp.allowed &&
      rp.permission === perm &&
      roles.includes(rp.role as AppRole)
    );
  };

  return { roles: roles ?? [], isAdmin, can, ready: !!roles && !!matrix };
}

export function useUserRoles(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map(r => r.role as AppRole);
    },
  });
}
