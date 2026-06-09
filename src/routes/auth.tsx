import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playSound } from "@/hooks/use-sound";
import { useTexts } from "@/hooks/use-texts";
import { useAuth } from "@/hooks/use-auth";
import clanLogo from "@/assets/clan-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Iniciar sesión · GAME OVER" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { t } = useTexts();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/panel", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        playSound("success");
        toast.success("¡Bienvenido!");
        navigate({ to: "/panel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        playSound("success");
        toast.success("Cuenta creada");
        navigate({ to: "/registro" });
      }
    } catch (err) {
      playSound("error");
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Header / logo */}
        <header className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl" />
            <img src={clanLogo} alt="GAME OVER" width={140} height={140}
              className="relative h-32 w-32 object-contain drop-shadow-[0_0_24px_rgba(232,38,31,0.55)]" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-glow-orange leading-none">{t("auth.brand.title", "GAME OVER")}</h1>
          <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-[0.3em]">{t("auth.brand.subtitle", "Free Fire · Comunidad")}</p>
        </header>

        {/* Mode switcher — separado y claro */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-input/40 border border-border">
          <button onClick={() => setMode("login")}
            className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${mode==="login" ? "gradient-neon text-primary-foreground neon-glow-orange" : "text-muted-foreground"}`}>
            {t("auth.tab.login", "Entrar")}
          </button>
          <button onClick={() => setMode("signup")}
            className={`py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${mode==="signup" ? "gradient-neon text-primary-foreground neon-glow-orange" : "text-muted-foreground"}`}>
            {t("auth.tab.signup", "Crear cuenta")}
          </button>
        </div>

        {/* Form card */}
        <div className="surface-card rounded-2xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-black uppercase tracking-wider text-lg">
              {mode === "login" ? t("auth.login.title", "Inicia sesión") : t("auth.signup.title", "Únete al clan")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "login" ? t("auth.login.subtitle", "Ingresa con tu cuenta del clan.") : t("auth.signup.subtitle", "Crea tu cuenta para participar en eventos.")}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("auth.email.label", "Email")}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t("auth.email.placeholder", "tucorreo@ejemplo.com")}
                className="w-full bg-input/60 border border-border rounded-lg px-3 py-3 outline-none focus:border-primary focus:neon-glow-orange transition" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("auth.password.label", "Contraseña")}</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={t("auth.password.placeholder", "Mínimo 6 caracteres")}
                className="w-full bg-input/60 border border-border rounded-lg px-3 py-3 outline-none focus:border-primary focus:neon-glow-orange transition" />
            </div>
            <button disabled={busy}
              className="w-full gradient-neon text-primary-foreground font-black py-3.5 rounded-lg uppercase tracking-widest disabled:opacity-50 neon-glow-orange">
              {busy ? "..." : mode === "login" ? t("auth.login.button", "Entrar al clan") : t("auth.signup.button", "Crear cuenta")}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
