import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Sub = { table: string; filter?: string; keys: (string | (string | undefined)[])[] };

/**
 * Subscribes to realtime changes on the given tables and invalidates the listed
 * query keys whenever something changes. Use one hook call per page with all the
 * tables that page cares about.
 */
export function useRealtime(channelName: string, subs: Sub[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel(channelName);
    subs.forEach((s) => {
      ch.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
        () => {
          s.keys.forEach((k) => {
            const key = Array.isArray(k) ? k.filter(Boolean) : [k];
            qc.invalidateQueries({ queryKey: key as any });
          });
        }
      );
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, JSON.stringify(subs)]);
}
