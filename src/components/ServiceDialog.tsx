import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./ClientDialog";
import { friendlyError, saveService, useInvalidate } from "@/lib/data";
import type { Service } from "@/lib/invoice";

export function ServiceDialog({
  open, onOpenChange, service, initialName, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; service?: Service | null; initialName?: string; onSaved?: (s: Service) => void }) {
  const [form, setForm] = useState({ name: "", description: "", rate: "" });
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidate();
  useEffect(() => {
    if (open) setForm(service ? { name: service.name, description: service.description ?? "", rate: String(service.rate) } : { name: initialName ?? "", description: "", rate: "" });
  }, [open, service, initialName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Please enter a service name.");
    setBusy(true);
    try {
      const saved = await saveService({ id: service?.id, name: form.name.trim(), description: form.description, rate: Number(form.rate) || 0 });
      await invalidate("services");
      toast.success(service ? "Service updated." : "Service added successfully.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Service name *"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Default description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Default rate (৳)"><Input type="number" min={0} value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></Field>
          <p className="text-xs text-muted-foreground">Changing a price only affects new invoices. Past invoices keep their original price.</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
