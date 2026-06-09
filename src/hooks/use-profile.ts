import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfile(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["isAdmin", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!).eq("role", "admin");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });
}
