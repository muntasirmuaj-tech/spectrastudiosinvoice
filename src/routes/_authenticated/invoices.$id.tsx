import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { Button } from "@/components/ui/button";
import { invoiceQuery, useSettings } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  validateSearch: z.object({ action: z.enum(["pdf", "print"]).optional() }),
  head: () => ({ meta: [{ title: "Invoice — Spectra Studios" }, { name: "description", content: "Edit, download or print this invoice." }] }),
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const { action } = Route.useSearch();
  const { data: settings } = useSettings();
  const { data: invoice, isLoading, isError, refetch } = useQuery(invoiceQuery(id));
  if (isError)
    return (
      <div className="p-16 text-center">
        <p className="text-sm text-muted-foreground">We couldn't open this invoice.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          <Button asChild variant="ghost"><Link to="/documents">Back to documents</Link></Button>
        </div>
      </div>
    );
  if (isLoading || !invoice || !settings) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  return <InvoiceEditor key={invoice.id} initial={invoice} settings={settings} isNew={false} autoAction={action} />;
}
