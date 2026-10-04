import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Invoice, Service, Settings } from "./invoice";

// Loosely typed handle — row shapes are defined in ./invoice.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

async function run<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    await run(db.rpc("ensure_workspace"));
    return run<Settings>(db.from("settings").select("*").single());
  },
});
export const clientsQuery = queryOptions({
  queryKey: ["clients"],
  queryFn: () => run<Client[]>(db.from("clients").select("*").order("name")),
});
export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: () => run<Service[]>(db.from("services").select("*").order("name")),
});
export const invoicesQuery = queryOptions({
  queryKey: ["invoices"],
  queryFn: () => run<Invoice[]>(db.from("invoices").select("*, payments(*)").order("created_at", { ascending: false })),
});
export const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ["invoice", id],
    queryFn: () => run<Invoice>(db.from("invoices").select("*, payments(*)").eq("id", id).single()),
  });

export const useSettings = () => useQuery(settingsQuery);
export const useClients = () => useQuery(clientsQuery);
export const useServices = () => useQuery(servicesQuery);
export const useInvoices = () => useQuery(invoicesQuery);

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export async function saveClient(c: Partial<Client>) {
  const { id, created_at: _c, ...rest } = c as Client;
  if (id) return run<Client>(db.from("clients").update(rest).eq("id", id).select().single());
  return run<Client>(db.from("clients").insert(rest).select().single());
}
export async function saveService(s: Partial<Service>) {
  const { id, ...rest } = s as Service;
  if (id) return run<Service>(db.from("services").update(rest).eq("id", id).select().single());
  return run<Service>(db.from("services").insert(rest).select().single());
}
export async function saveSettings(s: Partial<Settings>) {
  const { owner_id, ...rest } = s as Settings;
  return run<Settings>(db.from("settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("owner_id", owner_id).select().single());
}

/** Reserve the next invoice number; skips numbers already taken. */
export async function nextInvoiceNumber(settings: Settings) {
  const year = new Date().getFullYear();
  let n = settings.next_number;
  const existing = await run<{ number: string }[]>(db.from("invoices").select("number"));
  const taken = new Set(existing.map((e) => e.number));
  const fmt = (k: number) => `${settings.invoice_prefix}-${year}-${String(k).padStart(4, "0")}`;
  while (taken.has(fmt(n))) n++;
  await run(db.from("settings").update({ next_number: n + 1 }).eq("owner_id", settings.owner_id));
  return fmt(n);
}

export function friendlyError(e: unknown) {
  const msg = (e as { message?: string })?.message ?? "";
  if (/duplicate key/.test(msg)) return "That invoice number is already used. Try another.";
  if (/network|fetch/i.test(msg)) return "Connection problem. Check your internet and try again.";
  return "Something went wrong. Please try again.";
}
