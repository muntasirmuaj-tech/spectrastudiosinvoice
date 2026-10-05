import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/components/ClientDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { db, friendlyError, useClients, useInvalidate, useInvoices, useSettings } from "@/lib/data";
import { fmtDate, money, paidOf, statusOf, totals } from "@/lib/invoice";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Client — Spectra Studios" }, { name: "description", content: "Client profile and invoice history." }] }),
  component: ClientProfile,
});

function ClientProfile() {
  const { id } = Route.useParams();
  const { data: clients = [], isLoading } = useClients();
  const { data: invoices = [] } = useInvoices();
  const { data: settings } = useSettings();
  const [edit, setEdit] = useState(false);
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const client = clients.find((c) => c.id === id);
  const sym = settings?.currency_symbol;
  if (isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!client) return <div className="p-10 text-sm">Client not found. <Link to="/clients" className="underline">Back</Link></div>;

  const mine = invoices.filter((i) => i.client_id === id).map((inv) => {
    const p = paidOf(inv.payments); const t = totals(inv, p);
    return { inv, t, p, status: statusOf(inv, t.total, p) };
  });
  const billed = mine.filter((m) => !m.inv.is_draft).reduce((s, m) => s + m.t.total, 0);
  const paid = mine.filter((m) => !m.inv.is_draft).reduce((s, m) => s + Math.min(m.p, m.t.total), 0);

  async function toggleArchive() {
    if (!client) return;
    if (!client.archived && mine.length > 0 && !confirm(`${client.name} has ${mine.length} invoice(s). Archive anyway? Their invoices stay untouched.`)) return;
    const { error } = await db.from("clients").update({ archived: !client.archived }).eq("id", client.id);
    if (error) return toast.error(friendlyError(error));
    await invalidate("clients");
    toast.success(client.archived ? "Client restored." : "Client archived.");
  }
  async function remove() {
    if (!client) return;
    const msg = mine.length ? `This client has ${mine.length} invoice(s). Delete permanently? Invoices keep their saved client details.` : "Delete this client permanently?";
    if (!confirm(msg)) return;
    const { error } = await db.from("clients").delete().eq("id", client.id);
    if (error) return toast.error(friendlyError(error));
    await invalidate("clients");
    toast.success("Client deleted.");
    navigate({ to: "/clients" });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <Link to="/clients" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{client.company || client.name}</h1>
          <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            {client.company && <div>{client.name}</div>}
            <div>{[client.email, client.phone].filter(Boolean).join(" · ")}</div>
            {client.address && <div className="whitespace-pre-line">{client.address}</div>}
            {client.notes && <div className="mt-2 italic">{client.notes}</div>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="ghost" size="sm" onClick={toggleArchive}>{client.archived ? "Restore" : "Archive"}</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}>Delete</Button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 divide-x rounded-md border bg-card">
        {[["Total billed", billed], ["Paid", paid], ["Outstanding", billed - paid]].map(([l, v]) => (
          <div key={l as string} className="px-5 py-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
            <div className="mt-1 font-display text-xl font-semibold tabular">{money(v as number, sym)}</div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <Button asChild size="sm"><Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link></Button>
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {mine.map(({ inv, t, status }) => (
            <tr key={inv.id} className="cursor-pointer border-t hover:bg-card" onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}>
              <td className="py-3 font-semibold tabular">{inv.number}</td>
              <td className="py-3 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
              <td className="py-3 text-right tabular">{money(t.total, sym)}</td>
              <td className="py-3 pl-6"><StatusBadge status={status} /></td>
            </tr>
          ))}
          {mine.length === 0 && <tr><td className="py-8 text-center text-muted-foreground">No invoices for this client yet.</td></tr>}
        </tbody>
      </table>
      <ClientDialog open={edit} onOpenChange={setEdit} client={client} />
    </div>
  );
}
