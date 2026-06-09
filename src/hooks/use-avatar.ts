import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => (path && cache.get(path)) || null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    if (cache.has(path)) { setUrl(cache.get(path)!); return; }
    let cancelled = false;
    supabase.storage.from("avatars").createSignedUrl(path, 3600).then(({ data }) => {
      if (cancelled || !data) return;
      cache.set(path, data.signedUrl);
      setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}

export function useAudioUrl(bucket: string, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled && data) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [bucket, path]);
  return url;
}
