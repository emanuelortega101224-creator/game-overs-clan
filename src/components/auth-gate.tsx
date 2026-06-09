import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!profileLoading) {
      if (!profile) navigate({ to: "/registro", replace: true });
      else setChecked(true);
    }
  }, [user, loading, profile, profileLoading, navigate]);

  if (loading || profileLoading || !checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}

export async function signOut() {
  await supabase.auth.signOut({ scope: "local" });
}
