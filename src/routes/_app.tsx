import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthGate>
      <div className="min-h-dvh max-w-md mx-auto pb-24">
        <Outlet />
        <BottomNav />
      </div>
    </AuthGate>
  );
}
