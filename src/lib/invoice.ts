export type PaymentMethods = {
  bank: { enabled: boolean; bank_name: string; account_name: string; account_number: string; branch: string; routing: string; qr_url: string | null };
  bkash: { enabled: boolean; account_name: string; number: string; qr_url: string | null };
  nagad: { enabled: boolean; account_name: string; number: string; qr_url: string | null };
  cash: { enabled: boolean };
};

export type Settings = {
  owner_id: string;
  business_name: string;
  business_type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
  logo_url: string | null;
  currency_symbol: string;
  invoice_prefix: string;
  next_number: number;
  default_due_days: number;
  default_note: string;
  payment_methods: PaymentMethods;
};

export type Client = {
  id: string; name: string; company: string; email: string; phone: string; address: string; notes: string;
  archived: boolean; is_demo: boolean; created_at: string;
};

export type Service = { id: string; name: string; description: string; rate: number; archived: boolean; is_demo: boolean };

export type LineItem = { key: string; service_id: string | null; name: string; description: string; qty: number; rate: number };

export type ClientSnapshot = { name?: string; company?: string; email?: string; phone?: string; address?: string };

export type Payment = {
  id: string; invoice_id: string; amount: number; method: string; paid_on: string; reference: string; notes: string; created_at: string;
};

export type Invoice = {
  id: string;
  number: string;
  client_id: string | null;
  client_snapshot: ClientSnapshot;
  items: LineItem[];
  invoice_date: string;
  due_date: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  tax_rate: number;
  status_override: string | null;
  is_draft: boolean;
  notes: string;
  internal_notes: string;
  created_at: string;
  updated_at: string;
  payments?: Payment[];
};

export type Status = "Draft" | "Unpaid" | "Partially Paid" | "Paid" | "Overdue";

export function totals(inv: Pick<Invoice, "items" | "discount_type" | "discount_value" | "tax_rate">, paid: number) {
  const subtotal = inv.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const dv = Number(inv.discount_value) || 0;
  const discount = Math.min(subtotal, inv.discount_type === "percent" ? (subtotal * dv) / 100 : dv);
  const afterDiscount = subtotal - discount;
  const tax = (afterDiscount * (Number(inv.tax_rate) || 0)) / 100;
  const total = afterDiscount + tax;
  const due = Math.max(0, total - paid);
  return { subtotal, discount, tax, total, paid, due };
}

export function paidOf(payments: Payment[] | undefined) {
  return (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
}

export function statusOf(inv: Invoice, total: number, paid: number): Status {
  if (inv.status_override) return inv.status_override as Status;
  if (inv.is_draft) return "Draft";
  if (total > 0 && paid >= total) return "Paid";
  const today = todayISO();
  if (inv.due_date < today) return "Overdue";
  if (paid > 0) return "Partially Paid";
  return "Unpaid";
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function money(n: number, sym = "৳") {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `${v < 0 ? "-" : ""}${sym}${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
export function num(n: number) {
  return (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDate(iso)}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function formatNumber(prefix: string, n: number, year = new Date().getFullYear()) {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export function pdfFilename(inv: Pick<Invoice, "number" | "client_snapshot">) {
  const client = (inv.client_snapshot.company || inv.client_snapshot.name || "Client").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `Spectra-Studios-${inv.number}-${client}.pdf`;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
