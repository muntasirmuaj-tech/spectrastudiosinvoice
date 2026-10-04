import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { friendlyError, saveClient, useInvalidate } from "@/lib/data";
import type { Client } from "@/lib/invoice";

const empty = { name: "", company: "", email: "", phone: "", address: "", notes: "" };

export function ClientDialog({
  open, onOpenChange, client, initialName, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; client?: Client | null; initialName?: string; onSaved?: (c: Client) => void }) {
  const [form, setForm] = useState<Partial<Client>>(empty);
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidate();
  useEffect(() => {
    if (open) setForm(client ? { ...client } : { ...empty, name: initialName ?? "" });
  }, [open, client, initialName]);

  const set = (k: keyof Client) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error("Please enter the client's name.");
    setBusy(true);
    try {
      const { id, name, company, email, phone, address, notes } = form;
      const saved = await saveClient({ id, name, company, email, phone, address, notes });
      await invalidate("clients");
      toast.success(client ? "Client updated." : "Client added successfully.");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Full name *"><Input autoFocus value={form.name ?? ""} onChange={set("name")} /></Field>
          <Field label="Company"><Input value={form.company ?? ""} onChange={set("company")} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={set("email")} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={set("phone")} /></Field>
          <div className="col-span-2"><Field label="Address"><Textarea rows={2} value={form.address ?? ""} onChange={set("address")} /></Field></div>
          <div className="col-span-2"><Field label="Notes (private)"><Textarea rows={2} value={form.notes ?? ""} onChange={set("notes")} /></Field></div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save client"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
