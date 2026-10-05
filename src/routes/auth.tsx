import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import logoAsset from "@/assets/spectra-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ClientDialog";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Spectra Studios Invoices" },
      { name: "description", content: "Sign in to the Spectra Studios invoice generator." },
      { property: "og:title", content: "Sign in — Spectra Studios Invoices" },
      { property: "og:description", content: "Sign in to the Spectra Studios invoice generator." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/documents" });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) navigate({ to: "/documents" });
        else toast.success("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="font-display text-sm tracking-[0.2em]">
          <span className="font-bold">SPECTRA</span> <span className="text-lime">STUDIOS</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Invoices that look as good as the work behind them.</h1>
          <p className="mt-4 text-sidebar-muted">Create, save and print in under a minute.</p>
        </div>
        <div className="text-xs text-sidebar-muted">Private workspace · Digital Services Agency</div>
      </div>
      <div className="flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <img src={logoAsset.url} alt="Spectra Studios" className="mx-auto h-28 w-28 object-contain" />
          <div className="text-center">
            <h2 className="text-2xl font-semibold">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Sign in to manage your invoices." : "Set up your private workspace."}</p>
          </div>
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password"><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
          <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "First time here? Create your account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
