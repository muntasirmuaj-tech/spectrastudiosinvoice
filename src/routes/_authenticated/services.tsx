import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServiceDialog } from "@/components/ServiceDialog";
import { db, friendlyError, useInvalidate, useServices, useSettings } from "@/lib/data";
import { money, type Service } from "@/lib/invoice";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({ meta: [{ title: "Services — Spectra Studios" }, { name: "description", content: "Reusable services and default rates." }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState<{ open: boolean; service?: Service | null }>({ open: false });
  const [showArchived, setShowArchived] = useState(false);
  const invalidate = useInvalidate();
  const list = services.filter((s) => s.archived === showArchived && s.name.toLowerCase().includes(q.toLowerCase()));

  async function toggle(s: Service) {
    const { error } = await db.from("services").update({ archived: !s.archived }).eq("id", s.id);
    if (error) return toast.error(friendlyError(error));
    await invalidate("services");
    toast.success(s.archived ? "Service restored." : "Service archived.");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">What you sell, with default rates.</p>
        </div>
        <Button size="lg" onClick={() => setDlg({ open: true, service: null })}><Plus className="h-4 w-4" /> Add Service</Button>
      </div>
      <div className="mt-8 flex items-center justify-between gap-3 border-b pb-3">
        <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "← Active services" : "View archived"}</button>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search services" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 bg-card pl-9" />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2 pt-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <Package className="h-6 w-6 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No services yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save your services to add them to invoices in one click.</p>
          <Button className="mt-6" onClick={() => setDlg({ open: true })}>Add Service</Button>
        </div>
      ) : (
        <div>
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 border-b py-4">
              <button className="flex-1 text-left" onClick={() => setDlg({ open: true, service: s })}>
                <div className="font-semibold">{s.name} {s.is_demo && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">demo</span>}</div>
                {s.description && <div className="text-sm text-muted-foreground">{s.description}</div>}
              </button>
              <div className="font-display font-semibold tabular">{money(s.rate, settings?.currency_symbol)}</div>
              <Button variant="ghost" size="sm" onClick={() => setDlg({ open: true, service: s })}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toggle(s)}>{s.archived ? "Restore" : "Archive"}</Button>
            </div>
          ))}
          {list.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No services match.</p>}
        </div>
      )}
      <ServiceDialog open={dlg.open} onOpenChange={(o) => setDlg((d) => ({ ...d, open: o }))} service={dlg.service} />
    </div>
  );
}
