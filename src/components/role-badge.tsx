import { Crown, Shield, Star, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/hooks/use-permissions";

const CONFIG: Record<AppRole, { label: string; Icon: typeof Crown; cls: string } | null> = {
  admin: { label: "Admin", Icon: ShieldCheck, cls: "bg-primary/15 text-primary border-primary/40" },
  lider: { label: "Líder", Icon: Shield, cls: "bg-primary/15 text-primary border-primary/40" },
  lider_interno: { label: "Líder interno", Icon: Star, cls: "bg-secondary/15 text-secondary border-secondary/40" },
  decano: { label: "Decano", Icon: Crown, cls: "bg-amber-400/15 text-amber-300 border-amber-400/50" },
  member: null,
};

const PRIORITY: AppRole[] = ["admin", "lider", "lider_interno", "decano"];

export function RoleBadge({ roles, size = "sm" }: { roles: AppRole[] | undefined; size?: "xs" | "sm" }) {
  if (!roles?.length) return null;
  const top = PRIORITY.find(r => roles.includes(r));
  if (!top) return null;
  const cfg = CONFIG[top];
  if (!cfg) return null;
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  const icon = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wider ${padding} ${cfg.cls}`}>
      <cfg.Icon className={icon} />
      {cfg.label}
    </span>
  );
}

export function RoleCrown({ roles, className = "h-3.5 w-3.5" }: { roles: AppRole[] | undefined; className?: string }) {
  if (!roles?.length) return null;
  const top = PRIORITY.find(r => roles.includes(r));
  if (!top) return null;
  const cfg = CONFIG[top];
  if (!cfg) return null;
  return <cfg.Icon className={`${className} ${cfg.cls.split(" ").find(c => c.startsWith("text-"))}`} />;
}
