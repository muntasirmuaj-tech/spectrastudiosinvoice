import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Eye, GripVertical, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchSelect } from "./SearchSelect";
import { ClientDialog, Field } from "./ClientDialog";
import { ServiceDialog } from "./ServiceDialog";
import { PrintableSheet } from "./PrintableSheet";
import { StatusBadge } from "./StatusBadge";
import { db, friendlyError, nextInvoiceNumber, useClients, useInvalidate, useServices } from "@/lib/data";
import { downloadInvoicePdf } from "@/lib/pdf";
import {
  fmtDate, fmtDateTime, formatNumber, money, paidOf, pdfFilename, statusOf, todayISO, totals, uid,
  type Client, type Invoice, type LineItem, type Payment, type Settings,
} from "@/lib/invoice";

type Props = { initial: Invoice; settings: Settings; isNew: boolean; autoAction?: "pdf" | "print" };

const METHODS = ["Bank", "bKash", "Nagad", "Cash", "Other"];

export function InvoiceEditor({ initial, settings, isNew, autoAction }: Props) {
  const [inv, setInv] = useState<Invoice>(initial);
  const [payments, setPayments] = useState<Payment[]>(initial.payments ?? []);
  const [dirty, setDirty] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [clientDlg, setClientDlg] = useState<{ open: boolean; name?: string }>({ open: false });
  const [serviceDlg, setServiceDlg] = useState<{ open: boolean; name?: string; key?: string }>({ open: false });
  const [payDlg, setPayDlg] = useState(false);
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const sym = settings.currency_symbol;

  const paid = paidOf(payments);
  const t = useMemo(() => totals(inv, paid), [inv, paid]);
  const autoStatus = statusOf({ ...inv, status_override: null }, t.total, paid);
  const status = statusOf(inv, t.total, paid);

  const update = (patch: Partial<Invoice>) => { setInv((p) => ({ ...p, ...patch })); setDirty(true); };
  const updateItem = (key: string, patch: Partial<LineItem>) => update({ items: inv.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) });

  useBlocker({
    shouldBlockFn: () => dirty && !saving && !window.confirm("You have unsaved changes. Leave without saving?"),
    enableBeforeUnload: () => dirty,
  });

  // Run "Download PDF" / "Print" when opened from the documents list
  const ran = useRef(false);
  useEffect(() => {
    if (!autoAction || ran.current) return;
    ran.current = true;
    const id = setTimeout(() => (autoAction === "pdf" ? doPdf() : window.print()), 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAction]);

  function selectClient(c: Client) {
    update({ client_id: c.id, client_snapshot: { name: c.name, company: c.company, email: c.email, phone: c.phone, address: c.address } });
  }
  function selectService(key: string, serviceId: string) {
    const s = services.find((x) => x.id === serviceId);
    if (s) updateItem(key, { service_id: s.id, name: s.name, description: s.description ?? "", rate: Number(s.rate) });
  }
  function addItem() {
    update({ items: [...inv.items, { key: uid(), service_id: null, name: "", description: "", qty: 1, rate: 0 }] });
  }
  function moveItem(from: number, to: number) {
    if (to < 0 || to >= inv.items.length) return;
    const items = [...inv.items];
    const [m] = items.splice(from, 1);
    items.splice(to, 0, m);
    update({ items });
  }

  async function save(asDraft = false): Promise<string | null> {
    setSaving(true);
    try {
      const payload = {
        client_id: inv.client_id, client_snapshot: inv.client_snapshot,
        items: inv.items.filter((i) => i.name.trim() || i.rate),
        invoice_date: inv.invoice_date, due_date: inv.due_date,
        discount_type: inv.discount_type, discount_value: Number(inv.discount_value) || 0, tax_rate: Number(inv.tax_rate) || 0,
        status_override: inv.status_override, is_draft: asDraft, notes: inv.notes, internal_notes: inv.internal_notes,
        updated_at: new Date().toISOString(),
      };
      let id = inv.id;
      if (isNew) {
        const number = await nextInvoiceNumber(settings);
        const { data, error } = await db.from("invoices").insert({ ...payload, number }).select().single();
        if (error) throw error;
        id = data.id;
        if (payments.length) {
          const { error: pe } = await db.from("payments").insert(payments.map(({ id: _i, created_at: _c, invoice_id: _v, ...p }) => ({ ...p, invoice_id: id })));
          if (pe) throw pe;
        }
      } else {
        const { error } = await db.from("invoices").update({ ...payload, number: inv.number }).eq("id", inv.id);
        if (error) throw error;
      }
      setInv((p) => ({ ...p, is_draft: asDraft }));
      setDirty(false);
      await invalidate("invoices", "invoice", "settings");
      toast.success(asDraft ? "Draft saved." : "Invoice saved successfully.");
      if (isNew) setTimeout(() => navigate({ to: "/invoices/$id", params: { id }, replace: true }), 0);
      return id;
    } catch (e) {
      toast.error(friendlyError(e));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function doPdf() {
    try {
      await downloadInvoicePdf(pdfFilename(inv));
      toast.success("PDF generated successfully.");
    } catch {
      toast.error("Couldn't generate the PDF. Please try again.");
    }
  }

  async function addPayment(p: Omit<Payment, "id" | "invoice_id" | "created_at">) {
    if (isNew) {
      setPayments((ps) => [...ps, { ...p, id: "tmp-" + uid(), invoice_id: "", created_at: new Date().toISOString() }]);
      setDirty(true);
      return;
    }
    const { data, error } = await db.from("payments").insert({ ...p, invoice_id: inv.id }).select().single();
    if (error) return toast.error(friendlyError(error));
    setPayments((ps) => [...ps, data]);
    await invalidate("invoices", "invoice");
    toast.success("Payment recorded.");
  }
  async function removePayment(p: Payment) {
    if (!p.id.startsWith("tmp-")) {
      const { error } = await db.from("payments").delete().eq("id", p.id);
      if (error) return toast.error(friendlyError(error));
      await invalidate("invoices", "invoice");
    }
    setPayments((ps) => ps.filter((x) => x.id !== p.id));
  }

  const displayNumber = isNew ? formatNumber(settings.invoice_prefix, settings.next_number) : inv.number;
  const sheetInvoice = { ...inv, number: displayNumber };
  const clientOpts = clients.filter((c) => !c.archived || c.id === inv.client_id).map((c) => ({ value: c.id, label: c.company || c.name, hint: c.company ? c.name : undefined }));
  const serviceOpts = services.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name, hint: money(s.rate, sym) }));

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-background/90 px-6 py-3 backdrop-blur print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/documents" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Documents</Link>
          <span className="h-4 w-px bg-border" />
          <span className="font-display font-semibold">{isNew ? "New Invoice" : inv.number}</span>
          <StatusBadge status={status} />
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => save(true)} disabled={saving}>Save draft</Button>
          <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Preview</Button>
          <Button variant="outline" size="sm" onClick={doPdf}><Download className="h-4 w-4" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button size="sm" onClick={() => save(false)} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(460px,1fr)_minmax(0,1.05fr)] print:block">
        {/* Editor */}
        <div className="space-y-8 border-r px-6 py-8 md:px-8 print:hidden">
          <Section title="Bill to">
            <SearchSelect
              options={clientOpts} value={inv.client_id} onSelect={(id) => { const c = clients.find((x) => x.id === id); if (c) selectClient(c); }}
              placeholder="Search or select client…" addLabel="Add new client" onAdd={(q) => setClientDlg({ open: true, name: q })}
            />
            {inv.client_snapshot.name && (
              <div className="mt-2 text-xs text-muted-foreground">
                {[inv.client_snapshot.name, inv.client_snapshot.email, inv.client_snapshot.phone].filter(Boolean).join(" · ")}
              </div>
            )}
          </Section>

          <Section title="Dates">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Invoice date"><Input type="date" value={inv.invoice_date} onChange={(e) => update({ invoice_date: e.target.value })} /></Field>
              <Field label="Due date"><Input type="date" value={inv.due_date} onChange={(e) => update({ due_date: e.target.value })} /></Field>
            </div>
          </Section>

          <Section title="Items">
            <div className="space-y-3">
              {inv.items.map((item, idx) => (
                <div key={item.key} className="group rounded-md border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col pt-1.5 text-muted-foreground">
                      <button type="button" aria-label="Move up" onClick={() => moveItem(idx, idx - 1)} className="hover:text-foreground"><GripVertical className="h-4 w-4" /></button>
                    </div>
                    <div className="grid flex-1 grid-cols-[1fr_70px_110px] gap-2">
                      <SearchSelect
                        options={serviceOpts} value={item.service_id} onSelect={(sid) => selectService(item.key, sid)}
                        placeholder="Search services…" addLabel="Add new service" triggerLabel={item.name || undefined}
                        onAdd={(q) => setServiceDlg({ open: true, name: q, key: item.key })}
                      />
                      <Input type="number" min={0} aria-label="Quantity" value={item.qty} onChange={(e) => updateItem(item.key, { qty: Number(e.target.value) })} className="text-right tabular" />
                      <Input type="number" min={0} aria-label="Rate" value={item.rate} onChange={(e) => updateItem(item.key, { rate: Number(e.target.value) })} className="text-right tabular" />
                      <Input placeholder="Item name" value={item.name} onChange={(e) => updateItem(item.key, { name: e.target.value })} className="col-span-1 h-8 text-xs" />
                      <Input placeholder="Description (optional)" value={item.description} onChange={(e) => updateItem(item.key, { description: e.target.value })} className="col-span-2 h-8 text-xs" />
                    </div>
                    <div className="w-24 pt-2 text-right text-sm font-semibold tabular">{money(item.qty * item.rate, sym)}</div>
                    <button type="button" aria-label="Remove item" onClick={() => update({ items: inv.items.filter((i) => i.key !== item.key) })} className="pt-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4" /> Add item</Button>
            </div>
          </Section>

          <Section title="Totals">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Discount">
                <div className="flex gap-2">
                  <Input type="number" min={0} value={inv.discount_value} onChange={(e) => update({ discount_value: Number(e.target.value) })} className="tabular" />
                  <Select value={inv.discount_type} onValueChange={(v) => update({ discount_type: v as "fixed" | "percent" })}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fixed">{sym}</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent>
                  </Select>
                </div>
              </Field>
              <Field label="Tax % (optional)"><Input type="number" min={0} value={inv.tax_rate} onChange={(e) => update({ tax_rate: Number(e.target.value) })} className="tabular" /></Field>
            </div>
            <div className="mt-4 space-y-1.5 rounded-md bg-card p-4 text-sm tabular">
              <TRow l="Subtotal" v={money(t.subtotal, sym)} />
              {t.discount > 0 && <TRow l="Discount" v={`-${money(t.discount, sym)}`} />}
              {t.tax > 0 && <TRow l="Tax" v={money(t.tax, sym)} />}
              <TRow l="Total" v={money(t.total, sym)} bold />
              <TRow l="Paid" v={money(paid, sym)} />
              <TRow l="Amount due" v={money(t.due, sym)} bold />
            </div>
          </Section>

          <Section title="Payments" action={<Button variant="outline" size="sm" onClick={() => setPayDlg(true)}><Plus className="h-4 w-4" /> Record payment</Button>}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="divide-y rounded-md border bg-card">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div>
                      <div className="font-semibold tabular">{money(p.amount, sym)} <span className="font-normal text-muted-foreground">· {p.method}</span></div>
                      <div className="text-xs text-muted-foreground">{fmtDate(p.paid_on)}{p.reference && ` · Ref ${p.reference}`}{p.notes && ` · ${p.notes}`}</div>
                    </div>
                    <button aria-label="Remove payment" onClick={() => removePayment(p)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Status">
                <Select value={inv.status_override ?? "auto"} onValueChange={(v) => update({ status_override: v === "auto" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic ({autoStatus})</SelectItem>
                    {["Unpaid", "Partially Paid", "Paid", "Overdue"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Notes">
            <div className="space-y-4">
              <Field label="Note for client (shown on invoice)"><Textarea rows={2} value={inv.notes} onChange={(e) => update({ notes: e.target.value })} /></Field>
              <Field label="Internal note (never shown on invoice)"><Textarea rows={2} value={inv.internal_notes} onChange={(e) => update({ internal_notes: e.target.value })} className="bg-status-partial-bg/40" /></Field>
            </div>
          </Section>

          {!isNew && (
            <p className="text-xs text-muted-foreground">Created {fmtDateTime(inv.created_at)} · Updated {fmtDateTime(inv.updated_at)}</p>
          )}
        </div>

        {/* Live preview */}
        <div className="bg-secondary/60 px-6 py-8 print:bg-transparent print:p-0">
          <div className="mx-auto max-w-[794px] xl:sticky xl:top-20">
            <PrintableSheet invoice={sheetInvoice} settings={settings} paid={paid} />
          </div>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[92vh] max-w-[860px] overflow-y-auto bg-secondary p-6">
          <DialogHeader><DialogTitle className="sr-only">Invoice preview</DialogTitle></DialogHeader>
          {preview && <PreviewOnly invoice={sheetInvoice} settings={settings} paid={paid} />}
        </DialogContent>
      </Dialog>

      <ClientDialog open={clientDlg.open} onOpenChange={(o) => setClientDlg({ open: o })} initialName={clientDlg.name} onSaved={selectClient} />
      <ServiceDialog
        open={serviceDlg.open} onOpenChange={(o) => setServiceDlg((s) => ({ ...s, open: o }))} initialName={serviceDlg.name}
        onSaved={(s) => serviceDlg.key && updateItem(serviceDlg.key, { service_id: s.id, name: s.name, description: s.description ?? "", rate: Number(s.rate) })}
      />
      <PaymentDialog open={payDlg} onOpenChange={setPayDlg} defaultAmount={t.due} onSave={addPayment} />
    </div>
  );
}

import { InvoiceSheet } from "./InvoiceSheet";
function PreviewOnly(props: { invoice: Invoice; settings: Settings; paid: number }) {
  return <div className="mx-auto w-fit"><InvoiceSheet {...props} /></div>;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TRow({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{l}</span><span className={bold ? "text-foreground" : "text-foreground/80"}>{v}</span>
    </div>
  );
}

function PaymentDialog({ open, onOpenChange, defaultAmount, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; defaultAmount: number;
  onSave: (p: Omit<Payment, "id" | "invoice_id" | "created_at">) => Promise<void>;
}) {
  const [f, setF] = useState({ amount: "", method: "Bank", paid_on: todayISO(), reference: "", notes: "" });
  useEffect(() => { if (open) setF({ amount: String(defaultAmount || ""), method: "Bank", paid_on: todayISO(), reference: "", notes: "" }); }, [open, defaultAmount]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!amount || amount <= 0) return toast.error("Enter a payment amount.");
    await onSave({ ...f, amount });
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Amount"><Input autoFocus type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Method">
            <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Payment date"><Input type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></Field>
          <Field label="Reference"><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Notes"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field></div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
