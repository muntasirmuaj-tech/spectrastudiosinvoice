import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileText, MoreHorizontal, Plus, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { db, friendlyError, nextInvoiceNumber, useInvalidate, useInvoices, useSettings } from "@/lib/data";
import { fmtDate, money, paidOf, statusOf, todayISO, addDaysISO, totals, type Invoice, type Status } from "@/lib/invoice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Spectra Studios" }, { name: "description", content: "All Spectra Studios invoices." }] }),
  component: DocumentsPage,
});

const tabs = ["All", "Drafts", "Paid", "Unpaid", "Overdue"] as const;

function DocumentsPage() {
  const { data: invoices, isLoading, isError, refetch } = useInvoices();
  const { data: settings } = useSettings();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  const rows = useMemo(() => {
    return (invoices ?? []).map((inv) => {
      const paid = paidOf(inv.payments);
      const t = totals(inv, paid);
      return { inv, t, status: statusOf(inv, t.total, paid) as Status };
    });
  }, [invoices]);

  const filtered = rows.filter(({ inv, status }) => {
    const matchTab =
      tab === "All" ||
      (tab === "Drafts" && status === "Draft") ||
      (tab === "Paid" && status === "Paid") ||
      (tab === "Unpaid" && (status === "Unpaid" || status === "Partially Paid")) ||
      (tab === "Overdue" && status === "Overdue");
    const s = q.toLowerCase();
    const matchQ = !s || [inv.number, inv.client_snapshot.name, inv.client_snapshot.company].some((v) => v?.toLowerCase().includes(s));
    return matchTab && matchQ;
  });

  async function duplicate(inv: Invoice) {
    if (!settings) return;
    try {
      const number = await nextInvoiceNumber(settings);
      const today = todayISO();
      const { data, error } = await db
        .from("invoices")
        .insert({
          number, client_id: inv.client_id, client_snapshot: inv.client_snapshot, items: inv.items,
          invoice_date: today, due_date: addDaysISO(today, settings.default_due_days),
          discount_type: inv.discount_type, discount_value: inv.discount_value, tax_rate: inv.tax_rate,
          notes: inv.notes, internal_notes: inv.internal_notes, is_draft: true,
        })
        .select()
        .single();
      if (error) throw error;
      await invalidate("invoices", "settings");
      toast.success(`Duplicated as ${number}.`);
      navigate({ to: "/invoices/$id", params: { id: data.id } });
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function remove(inv: Invoice) {
    if (!confirm(`Delete ${inv.number}? This cannot be undone.`)) return;
    const { error } = await db.from("invoices").delete().eq("id", inv.id);
    if (error) return toast.error(friendlyError(error));
    await invalidate("invoices");
    toast.success("Invoice deleted.");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, manage and track your invoices.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("-mb-px border-b-2 px-3 pb-3 text-sm transition-colors", tab === t ? "border-lime font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {t}
              <span className="ml-1.5 text-xs text-muted-foreground tabular">
                {rows.filter(({ status }) => t === "All" || (t === "Drafts" && status === "Draft") || (t === "Paid" && status === "Paid") || (t === "Unpaid" && (status === "Unpaid" || status === "Partially Paid")) || (t === "Overdue" && status === "Overdue")).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative mb-2 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search invoice or client" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 bg-card pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 pt-4">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}</div>
      ) : isError ? (
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">We couldn't load your invoices.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft"><FileText className="h-5 w-5 text-accent-foreground" /></div>
          <h2 className="mt-5 text-lg font-semibold">No invoices yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Create your first invoice to start managing your agency billing.</p>
          <Button asChild className="mt-6"><Link to="/invoices/new"><Plus className="h-4 w-4" /> Create Invoice</Link></Button>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 font-medium">Invoice</th>
              <th className="py-3 font-medium">Client</th>
              <th className="hidden py-3 font-medium sm:table-cell">Date</th>
              <th className="py-3 text-right font-medium">Amount</th>
              <th className="py-3 pl-6 font-medium">Status</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ inv, t, status }) => (
              <tr key={inv.id} className="group cursor-pointer border-t transition-colors hover:bg-card" onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}>
                <td className="py-4 font-semibold tabular">{inv.number}</td>
                <td className="py-4">{inv.client_snapshot.company || inv.client_snapshot.name || <span className="text-muted-foreground">—</span>}</td>
                <td className="hidden py-4 text-muted-foreground sm:table-cell">{fmtDate(inv.invoice_date)}</td>
                <td className="py-4 text-right font-medium tabular">{money(t.total, settings?.currency_symbol)}</td>
                <td className="py-4 pl-6"><StatusBadge status={status} /></td>
                <td className="py-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Invoice actions"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}><FileText className="h-4 w-4" /> Open</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(inv)}><Copy className="h-4 w-4" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id }, search: { action: "pdf" } })}><Download className="h-4 w-4" /> Download PDF</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id }, search: { action: "print" } })}><Printer className="h-4 w-4" /> Print</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => remove(inv)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">No invoices match.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
