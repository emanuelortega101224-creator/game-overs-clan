import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTexts() {
  const q = useQuery({
    queryKey: ["site_texts"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_texts").select("key, value");
      if (error) throw error;
      const m: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      return m;
    },
  });
  const t = (key: string, fallback = "") => q.data?.[key] ?? fallback;
  return { t, texts: q.data ?? {}, isLoading: q.isLoading };
}
