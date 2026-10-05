import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientDialog } from "@/components/ClientDialog";
import { useClients, useInvoices, useSettings } from "@/lib/data";
import { money, paidOf, totals } from "@/lib/invoice";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [{ title: "Clients — Spectra Studios" }, { name: "description", content: "Saved clients." }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const { data: invoices = [] } = useInvoices();
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const sym = settings?.currency_symbol;

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; billed: number; paid: number }>();
    for (const inv of invoices) {
      if (!inv.client_id || inv.is_draft) continue;
      const p = paidOf(inv.payments);
      const t = totals(inv, p);
      const s = m.get(inv.client_id) ?? { count: 0, billed: 0, paid: 0 };
      s.count++; s.billed += t.total; s.paid += Math.min(p, t.total);
      m.set(inv.client_id, s);
    }
    return m;
  }, [invoices]);

  const list = clients.filter((c) => (showArchived ? c.archived : !c.archived) && [c.name, c.company, c.email, c.phone].some((v) => v?.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">The people and companies you bill.</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Client</Button>
      </div>
      <div className="mt-8 flex items-center justify-between gap-3 border-b pb-3">
        <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "← Active clients" : "View archived"}
        </button>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 bg-card pl-9" />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2 pt-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No clients yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add a client once and reuse them on every invoice.</p>
          <Button className="mt-6" onClick={() => setOpen(true)}>Add Client</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 font-medium">Client</th>
                <th className="hidden py-3 font-medium md:table-cell">Email</th>
                <th className="hidden py-3 font-medium lg:table-cell">Phone</th>
                <th className="py-3 text-right font-medium">Invoices</th>
                <th className="py-3 text-right font-medium">Billed</th>
                <th className="hidden py-3 text-right font-medium sm:table-cell">Paid</th>
                <th className="py-3 text-right font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const s = stats.get(c.id) ?? { count: 0, billed: 0, paid: 0 };
                return (
                  <tr key={c.id} className="cursor-pointer border-t hover:bg-card" onClick={() => navigate({ to: "/clients/$id", params: { id: c.id } })}>
                    <td className="py-3.5">
                      <div className="font-semibold">{c.company || c.name} {c.is_demo && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">demo</span>}</div>
                      {c.company && <div className="text-xs text-muted-foreground">{c.name}</div>}
                    </td>
                    <td className="hidden py-3.5 text-muted-foreground md:table-cell">{c.email}</td>
                    <td className="hidden py-3.5 text-muted-foreground lg:table-cell">{c.phone}</td>
                    <td className="py-3.5 text-right tabular">{s.count}</td>
                    <td className="py-3.5 text-right tabular">{money(s.billed, sym)}</td>
                    <td className="hidden py-3.5 text-right tabular sm:table-cell">{money(s.paid, sym)}</td>
                    <td className="py-3.5 text-right font-semibold tabular">{money(s.billed - s.paid, sym)}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No clients match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <ClientDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
