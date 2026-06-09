import { createServerFn } from "@tanstack/react-start";

export type FfPlayerInfo = {
  nickname: string;
  level: number | null;
  region: string | null;
  avatar: string | null;
};

/**
 * Best-effort lookup using public unofficial Free Fire info endpoints.
 * Any of these endpoints may go offline at any time — the function
 * returns null on failure so the UI can degrade gracefully.
 * Override with the env var FF_API_URL (use {id} as placeholder).
 */
export const lookupFfPlayer = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!/^\d{6,15}$/.test(d.id)) throw new Error("ID inválido");
    return d;
  })
  .handler(async ({ data }): Promise<FfPlayerInfo | null> => {
    const tpl = process.env.FF_API_URL;
    const endpoints = [
      tpl ? tpl.replace("{id}", data.id) : null,
      `https://ff-community-api.vercel.app/api/info?uid=${data.id}`,
      `https://aditya-info-v9op.onrender.com/player-info?uid=${data.id}&region=sg`,
      `https://aditya-info-v9op.onrender.com/player-info?uid=${data.id}&region=br`,
    ].filter(Boolean) as string[];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) continue;
        const j: any = await res.json();
        const basic = j?.basicInfo ?? j?.AccountInfo ?? j?.data ?? j;
        const nickname =
          basic?.nickname ?? basic?.AccountName ?? basic?.name ?? j?.nickname ?? j?.name;
        if (!nickname) continue;
        const level = basic?.level ?? basic?.AccountLevel ?? j?.level ?? null;
        const region = basic?.region ?? j?.region ?? null;
        const avatar =
          j?.profileInfo?.avatarId?.toString?.() ??
          basic?.avatarId?.toString?.() ??
          basic?.AccountAvatarId?.toString?.() ??
          null;
        return { nickname: String(nickname), level: level ? Number(level) : null, region: region ? String(region) : null, avatar };
      } catch {
        /* try next */
      }
    }
    return null;
  });
