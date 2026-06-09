import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!path) return null;
    return cache.get(`${bucket}/${path}`) ?? null;
  });
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    const key = `${bucket}/${path}`;
    if (cache.has(key)) { setUrl(cache.get(key)!); return; }
    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => {
      if (cancelled || !data) return;
      cache.set(key, data.signedUrl);
      setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [bucket, path]);
  return url;
}
