import logoAsset from "@/assets/spectra-logo.png.asset.json";
import { fmtDate, money, num, statusOf, totals, type Invoice, type Settings } from "@/lib/invoice";

type Props = { invoice: Invoice; settings: Settings; paid: number; id?: string };

function QrBox({ src, label }: { src: string | null; label: string }) {
  return src ? (
    <img src={src} alt={`${label} QR code`} className="h-[22mm] w-[22mm] rounded-sm border border-sheet-line object-contain p-1" />
  ) : (
    <div className="flex h-[22mm] w-[22mm] items-center justify-center rounded-sm border border-dashed border-sheet-line text-center text-[7pt] leading-tight text-sheet-muted">
      QR
      <br />
      coming soon
    </div>
  );
}

export function InvoiceSheet({ invoice, settings, paid, id }: Props) {
  const t = totals(invoice, paid);
  const status = statusOf(invoice, t.total, paid);
  const sym = settings.currency_symbol;
  const c = invoice.client_snapshot;
  const pm = settings.payment_methods;
  const logo = settings.logo_url || logoAsset.url;
  const contact = [settings.address, settings.phone, settings.email, settings.website].filter(Boolean);

  return (
    <div id={id} className="a4-sheet flex flex-col px-[16mm] pb-[12mm] pt-[14mm] text-[9.5pt] leading-relaxed">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt={settings.business_name} className="h-[20mm] w-[20mm] object-contain" crossOrigin="anonymous" />
          <div>
            <div className="font-display text-[14pt] font-bold tracking-tight">{settings.business_name.toUpperCase()}</div>
            <div className="text-sheet-muted">{settings.business_type}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[22pt] font-light tracking-[0.18em] text-sheet-ink">INVOICE</div>
          <div className="mt-0.5 font-semibold tabular">{invoice.number}</div>
          <div className="mt-1 inline-block rounded-full bg-lime-soft px-2.5 py-0.5 text-[7.5pt] font-semibold uppercase tracking-wider">{status}</div>
        </div>
      </div>

      <div className="mt-[8mm] h-[2px] w-full bg-sheet-ink" />
      <div className="h-[2px] w-[28mm] bg-lime" />

      {/* Meta */}
      <div className="mt-[7mm] grid grid-cols-[1fr_auto] gap-8">
        <div>
          <div className="text-[7.5pt] font-semibold uppercase tracking-[0.16em] text-sheet-muted">Bill to</div>
          {c.name || c.company ? (
            <div className="mt-1.5 space-y-0.5">
              <div className="text-[11pt] font-semibold">{c.company || c.name}</div>
              {c.company && c.name && <div>{c.name}</div>}
              {c.email && <div className="text-sheet-muted">{c.email}</div>}
              {c.phone && <div className="text-sheet-muted">{c.phone}</div>}
              {c.address && <div className="whitespace-pre-line text-sheet-muted">{c.address}</div>}
            </div>
          ) : (
            <div className="mt-1.5 text-sheet-muted">No client selected</div>
          )}
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 self-start text-right">
          <span className="text-sheet-muted">Invoice date</span>
          <span className="font-medium tabular">{fmtDate(invoice.invoice_date)}</span>
          <span className="text-sheet-muted">Due date</span>
          <span className="font-medium tabular">{fmtDate(invoice.due_date)}</span>
          <span className="text-sheet-muted">Amount due</span>
          <span className="font-semibold tabular">{money(t.due, sym)}</span>
        </div>
      </div>

      {/* Items */}
      <table className="mt-[9mm] w-full border-collapse">
        <thead>
          <tr className="border-b border-sheet-ink text-[7.5pt] uppercase tracking-[0.14em] text-sheet-muted">
            <th className="pb-2 text-left font-semibold">Description</th>
            <th className="w-[16mm] pb-2 text-right font-semibold">Qty</th>
            <th className="w-[28mm] pb-2 text-right font-semibold">Rate</th>
            <th className="w-[30mm] pb-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-sheet-muted">No items yet</td>
            </tr>
          )}
          {invoice.items.map((i) => (
            <tr key={i.key} className="border-b border-sheet-line align-top" style={{ breakInside: "avoid" }}>
              <td className="py-2.5 pr-4">
                <div className="font-semibold">{i.name || "Untitled item"}</div>
                {i.description && <div className="text-[8.5pt] text-sheet-muted">{i.description}</div>}
              </td>
              <td className="py-2.5 text-right tabular">{num(i.qty)}</td>
              <td className="py-2.5 text-right tabular">{num(i.rate)}</td>
              <td className="py-2.5 text-right font-medium tabular">{num(i.qty * i.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-[5mm] flex justify-end">
        <div className="w-[78mm] space-y-1.5 tabular">
          <Row label="Subtotal" value={money(t.subtotal, sym)} />
          {t.discount > 0 && (
            <Row label={`Discount${invoice.discount_type === "percent" ? ` (${num(invoice.discount_value)}%)` : ""}`} value={`-${money(t.discount, sym)}`} />
          )}
          {t.tax > 0 && <Row label={`Tax (${num(invoice.tax_rate)}%)`} value={money(t.tax, sym)} />}
          <div className="flex justify-between border-t border-sheet-ink pt-2 text-[11pt] font-bold">
            <span>Total</span>
            <span>{money(t.total, sym)}</span>
          </div>
          {paid > 0 && <Row label="Paid" value={`-${money(paid, sym)}`} />}
          <div className="mt-1 flex justify-between rounded-sm bg-sheet-ink px-3 py-2 font-semibold text-primary-foreground">
            <span>Amount due</span>
            <span>{money(t.due, sym)}</span>
          </div>
        </div>
      </div>

      {/* Payment info */}
      {(pm.bank.enabled || pm.bkash.enabled || pm.nagad.enabled || pm.cash.enabled) && (
        <div className="mt-[9mm]" style={{ breakInside: "avoid" }}>
          <div className="text-[7.5pt] font-semibold uppercase tracking-[0.16em] text-sheet-muted">Payment information</div>
          <div className="mt-2.5 grid grid-cols-3 gap-4">
            {pm.bank.enabled && (
              <div className="flex gap-3">
                <QrBox src={pm.bank.qr_url} label="Bank" />
                <div className="text-[8.5pt] leading-snug">
                  <div className="font-semibold">Bank transfer</div>
                  {pm.bank.bank_name && <div>{pm.bank.bank_name}</div>}
                  {pm.bank.account_name && <div className="text-sheet-muted">{pm.bank.account_name}</div>}
                  {pm.bank.account_number && <div className="tabular">A/C {pm.bank.account_number}</div>}
                  {pm.bank.branch && <div className="text-sheet-muted">{pm.bank.branch}</div>}
                  {pm.bank.routing && <div className="text-sheet-muted tabular">Routing {pm.bank.routing}</div>}
                </div>
              </div>
            )}
            {(["bkash", "nagad"] as const).map((k) =>
              pm[k].enabled ? (
                <div key={k} className="flex gap-3">
                  <QrBox src={pm[k].qr_url} label={k} />
                  <div className="text-[8.5pt] leading-snug">
                    <div className="font-semibold">{k === "bkash" ? "bKash" : "Nagad"}</div>
                    {pm[k].account_name && <div className="text-sheet-muted">{pm[k].account_name}</div>}
                    {pm[k].number && <div className="tabular">{pm[k].number}</div>}
                  </div>
                </div>
              ) : null,
            )}
            {pm.cash.enabled && (
              <div className="text-[8.5pt]">
                <div className="font-semibold">Cash</div>
                <div className="text-sheet-muted">Accepted at our office</div>
              </div>
            )}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="mt-[8mm]" style={{ breakInside: "avoid" }}>
          <div className="text-[7.5pt] font-semibold uppercase tracking-[0.16em] text-sheet-muted">Notes</div>
          <div className="mt-1.5 whitespace-pre-line">{invoice.notes}</div>
        </div>
      )}

      <div className="mt-auto pt-[10mm]">
        <div className="flex items-end justify-between border-t border-sheet-line pt-3 text-[8pt] text-sheet-muted">
          <div>
            <span className="font-display font-bold text-sheet-ink">SPECTRA</span>{" "}
            <span className="font-display text-lime">STUDIOS</span>
            {settings.tax_id && <span className="ml-3">VAT/Tax ID {settings.tax_id}</span>}
          </div>
          <div className="text-right">{contact.join("  ·  ")}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sheet-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
