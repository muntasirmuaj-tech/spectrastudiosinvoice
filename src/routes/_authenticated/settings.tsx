import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import logoAsset from "@/assets/spectra-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ClientDialog";
import { db, friendlyError, saveSettings, useInvalidate, useSettings } from "@/lib/data";
import { fileToDataUrl } from "@/lib/pdf";
import { formatNumber, type PaymentMethods, type Settings } from "@/lib/invoice";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Spectra Studios" }, { name: "description", content: "Business details, invoice numbering and payment methods." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSettings();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidate();
  useEffect(() => { if (data) setS(structuredClone(data)); }, [data]);
  if (!s) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const setPm = <M extends keyof PaymentMethods>(m: M, patch: Partial<PaymentMethods[M]>) =>
    setS({ ...s, payment_methods: { ...s.payment_methods, [m]: { ...s.payment_methods[m], ...patch } } });
  const txt = (k: keyof Settings) => ({ value: (s[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never) });

  async function save() {
    if (!s) return;
    setBusy(true);
    try {
      await saveSettings({ ...s, next_number: Math.max(1, Number(s.next_number) || 1), default_due_days: Number(s.default_due_days) || 0 });
      await invalidate("settings");
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeDemo() {
    if (!confirm("Remove demo clients and services that aren't used on any invoice?")) return;
    const { data: used } = await db.from("invoices").select("client_id");
    const usedIds = new Set((used ?? []).map((r: { client_id: string | null }) => r.client_id));
    const { data: demo } = await db.from("clients").select("id").eq("is_demo", true);
    const del = (demo ?? []).map((d: { id: string }) => d.id).filter((id: string) => !usedIds.has(id));
    if (del.length) await db.from("clients").delete().in("id", del);
    await db.from("services").delete().eq("is_demo", true);
    await invalidate("clients", "services");
    toast.success("Demo data removed.");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything here appears automatically on your invoices.</p>
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
      </div>

      <Block title="Business">
        <div className="mb-5 flex items-center gap-4">
          <img src={s.logo_url || logoAsset.url} alt="Logo" className="h-16 w-16 rounded-md border bg-card object-contain p-1" />
          <ImagePicker label="Replace logo" onPick={(url) => set("logo_url", url)} />
          {s.logo_url && <Button variant="ghost" size="sm" onClick={() => set("logo_url", null)}>Use default</Button>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business name"><Input {...txt("business_name")} /></Field>
          <Field label="Business type"><Input {...txt("business_type")} /></Field>
          <Field label="Phone"><Input {...txt("phone")} /></Field>
          <Field label="Email"><Input {...txt("email")} /></Field>
          <Field label="Website"><Input {...txt("website")} /></Field>
          <Field label="Tax / VAT ID"><Input {...txt("tax_id")} /></Field>
          <div className="col-span-2"><Field label="Address"><Textarea rows={2} {...txt("address")} /></Field></div>
        </div>
      </Block>

      <Block title="Invoices">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Number prefix"><Input {...txt("invoice_prefix")} /></Field>
          <Field label="Next number"><Input type="number" min={1} value={s.next_number} onChange={(e) => set("next_number", Number(e.target.value))} /></Field>
          <Field label="Due after (days)"><Input type="number" min={0} value={s.default_due_days} onChange={(e) => set("default_due_days", Number(e.target.value))} /></Field>
          <Field label="Currency symbol"><Input {...txt("currency_symbol")} /></Field>
          <div className="col-span-2 self-end pb-2 text-sm text-muted-foreground">Next invoice: <span className="font-semibold text-foreground tabular">{formatNumber(s.invoice_prefix, s.next_number)}</span></div>
          <div className="col-span-3"><Field label="Default note for clients"><Textarea rows={2} {...txt("default_note")} /></Field></div>
        </div>
      </Block>

      <Block title="Payment methods">
        <p className="-mt-2 mb-5 text-sm text-muted-foreground">Only enabled methods appear on invoices.</p>
        <Method title="Bank" enabled={s.payment_methods.bank.enabled} onToggle={(v) => setPm("bank", { enabled: v })} qr={s.payment_methods.bank.qr_url} onQr={(u) => setPm("bank", { qr_url: u })}>
          <Field label="Bank name"><Input value={s.payment_methods.bank.bank_name} onChange={(e) => setPm("bank", { bank_name: e.target.value })} /></Field>
          <Field label="Account name"><Input value={s.payment_methods.bank.account_name} onChange={(e) => setPm("bank", { account_name: e.target.value })} /></Field>
          <Field label="Account number"><Input value={s.payment_methods.bank.account_number} onChange={(e) => setPm("bank", { account_number: e.target.value })} /></Field>
          <Field label="Branch"><Input value={s.payment_methods.bank.branch} onChange={(e) => setPm("bank", { branch: e.target.value })} /></Field>
          <Field label="Routing number"><Input value={s.payment_methods.bank.routing} onChange={(e) => setPm("bank", { routing: e.target.value })} /></Field>
        </Method>
        {(["bkash", "nagad"] as const).map((m) => (
          <Method key={m} title={m === "bkash" ? "bKash" : "Nagad"} enabled={s.payment_methods[m].enabled} onToggle={(v) => setPm(m, { enabled: v })} qr={s.payment_methods[m].qr_url} onQr={(u) => setPm(m, { qr_url: u })}>
            <Field label="Account name"><Input value={s.payment_methods[m].account_name} onChange={(e) => setPm(m, { account_name: e.target.value })} /></Field>
            <Field label={`${m === "bkash" ? "bKash" : "Nagad"} number`}><Input value={s.payment_methods[m].number} onChange={(e) => setPm(m, { number: e.target.value })} /></Field>
          </Method>
        ))}
        <div className="flex items-center justify-between border-t py-4">
          <span className="font-semibold">Cash</span>
          <Switch checked={s.payment_methods.cash.enabled} onCheckedChange={(v) => setPm("cash", { enabled: v })} />
        </div>
      </Block>

      <Block title="Demo data">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Sample clients and services are marked “demo”. Remove them when you're ready.</p>
          <Button variant="outline" size="sm" onClick={removeDemo}>Remove demo data</Button>
        </div>
      </Block>

      <div className="mt-8 flex justify-end"><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button></div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Method({ title, enabled, onToggle, qr, onQr, children }: {
  title: string; enabled: boolean; onToggle: (v: boolean) => void; qr: string | null; onQr: (u: string | null) => void; children: React.ReactNode;
}) {
  return (
    <div className="border-t py-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`Enable ${title}`} />
      </div>
      {enabled && (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-6">
          <div className="grid grid-cols-2 gap-4">{children}</div>
          <div className="flex flex-col items-center gap-2">
            {qr ? (
              <div className="relative">
                <img src={qr} alt={`${title} QR`} className="h-24 w-24 rounded-md border bg-card object-contain p-1" />
                <button aria-label="Remove QR" onClick={() => onQr(null)} className="absolute -right-2 -top-2 rounded-full border bg-card p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">No QR</div>
            )}
            <ImagePicker label={qr ? "Replace QR" : "Upload QR"} onPick={onQr} />
          </div>
        </div>
      )}
    </div>
  );
}

function ImagePicker({ label, onPick }: { label: string; onPick: (dataUrl: string) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
      <Upload className="h-3.5 w-3.5" /> {label}
      <input
        type="file" accept="image/*" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try { onPick(await fileToDataUrl(f)); toast.success("Image ready — remember to save."); } catch { toast.error("That image couldn't be read."); }
          e.target.value = "";
        }}
      />
    </label>
  );
}
