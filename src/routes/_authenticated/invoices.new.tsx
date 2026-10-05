import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { useSettings } from "@/lib/data";
import { addDaysISO, todayISO, uid, type Invoice } from "@/lib/invoice";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({ meta: [{ title: "New Invoice — Spectra Studios" }, { name: "description", content: "Create a new invoice." }] }),
  component: NewInvoice,
});

function NewInvoice() {
  const { data: settings, isLoading } = useSettings();
  const initial = useMemo<Invoice | null>(() => {
    if (!settings) return null;
    const today = todayISO();
    const now = new Date().toISOString();
    return {
      id: "", number: "", client_id: null, client_snapshot: {},
      items: [{ key: uid(), service_id: null, name: "", description: "", qty: 1, rate: 0 }],
      invoice_date: today, due_date: addDaysISO(today, settings.default_due_days),
      discount_type: "fixed", discount_value: 0, tax_rate: 0, status_override: null, is_draft: false,
      notes: settings.default_note, internal_notes: "", created_at: now, updated_at: now, payments: [],
    };
  }, [settings]);
  if (isLoading || !settings || !initial) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  return <InvoiceEditor initial={initial} settings={settings} isNew />;
}
