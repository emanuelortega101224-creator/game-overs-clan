import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-profile";

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);

  // "Yo" (Perfil) se accede tocando la foto de arriba — no se duplica aquí.
  const items = [
    { to: "/panel" as const, icon: Home, label: "Inicio" },
    { to: "/eventos/" as const, icon: Calendar, label: "Eventos" },
    { to: "/integrantes" as const, icon: Users, label: "Clan" },
    ...(isAdmin ? [{ to: "/admin" as const, icon: Shield, label: "Admin" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/80 backdrop-blur-lg">
      <div className="max-w-md mx-auto grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/panel" && pathname.startsWith(to));
          return (
            <Link key={to} to={to} className={`flex flex-col items-center gap-1 py-3 transition ${active ? "text-primary text-glow-orange" : "text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
