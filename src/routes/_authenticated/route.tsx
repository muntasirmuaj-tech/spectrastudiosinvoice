import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, LogOut, Package, Settings as SettingsIcon, Users } from "lucide-react";
import logoAsset from "@/assets/spectra-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const nav = [
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/services", label: "Services", icon: Package },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function AppShell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sheet">
            <img src={logoAsset.url} alt="" className="h-8 w-8 object-contain" />
          </div>
          <div className="font-display text-[13px] leading-tight tracking-[0.14em]">
            <div className="font-bold">SPECTRA</div>
            <div className="text-lime">STUDIOS</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-foreground font-semibold" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <div className="text-sm font-semibold">Spectra Studios</div>
          <div className="text-xs text-sidebar-muted">Digital Services Agency</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 text-xs text-sidebar-muted hover:text-sidebar-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden print:hidden">
          <span className="font-display text-xs font-bold tracking-[0.14em]">SPECTRA <span className="text-lime">STUDIOS</span></span>
          <div className="flex gap-3 text-xs">
            {nav.map((n) => <Link key={n.to} to={n.to} className="text-sidebar-muted" activeProps={{ className: "!text-sidebar-foreground font-semibold" }}>{n.label}</Link>)}
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
