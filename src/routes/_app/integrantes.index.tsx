import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl } from "@/hooks/use-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-profile";
import { useRealtime } from "@/hooks/use-realtime";
import { useTexts } from "@/hooks/use-texts";
import { Shield, ArrowLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/integrantes/")({
  head: () => ({ meta: [{ title: "Integrantes · GAME OVER" }] }),
  component: IntegrantesPage,
});

type Member = {
  id: string; real_name: string; ff_nick: string; ff_id: string | null;
  phone: string; avatar_url: string | null; hidden_fields: string[]; isAdmin: boolean;
};

function IntegrantesPage() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { t } = useTexts();
  useRealtime("integrantes", [
    { table: "profiles", keys: [["members"]] },
    { table: "user_roles", keys: [["members"]] },
  ]);

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_members");
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id, ff_nick: p.ff_nick, avatar_url: p.avatar_url,
        real_name: p.real_name ?? "—", ff_id: p.ff_id, phone: "",
        hidden_fields: p.hidden_fields ?? [], isAdmin: !!p.is_admin,
      })) as Member[];
    },
  });

  return (
    <div className="px-5 pt-8 pb-8">
      <Link to="/panel" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Volver</Link>
      <h1 className="mt-4 text-2xl font-black text-glow-orange">{t("integrantes.title", "INTEGRANTES")}</h1>
      <p className="text-xs text-muted-foreground uppercase tracking-widest">{members?.length ?? 0} {t("integrantes.subtitle", "soldados")}</p>

      <ul className="mt-6 space-y-3">
        {members?.map(m => (
          <MemberRow key={m.id} m={m} currentUserId={user?.id} isAdmin={!!isAdmin} />
        ))}
        {members?.length === 0 && <p className="text-muted-foreground text-sm">{t("integrantes.empty", "Aún no hay miembros.")}</p>}
      </ul>
    </div>
  );
}

function MemberRow({ m, currentUserId, isAdmin }: { m: Member; currentUserId: string | undefined; isAdmin: boolean }) {
  const avatar = useAvatarUrl(m.avatar_url);
  const isSelf = currentUserId === m.id;
  const canSeeRealName = isAdmin || isSelf || !m.hidden_fields.includes("real_name");
  const canSeeFfId = isAdmin || isSelf || !m.hidden_fields.includes("ff_id");
  const realName = canSeeRealName ? m.real_name : "—";
  const ffId = canSeeFfId ? m.ff_id : null;

  return (
    <li>
      <Link to="/integrantes/$id" params={{ id: m.id }}
        className="surface-card rounded-xl p-3 flex items-center gap-3 hover:border-primary/50 transition">
        <div className="h-12 w-12 rounded-lg overflow-hidden bg-surface-2 flex items-center justify-center shrink-0">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">🔥</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold truncate">{m.ff_nick}</p>
            {m.isAdmin && <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded gradient-neon text-primary-foreground flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" />Admin</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {realName}{ffId ? ` · ID ${ffId}` : ""}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </Link>
    </li>
  );
}
