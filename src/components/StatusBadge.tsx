import { cn } from "@/lib/utils";
import type { Status } from "@/lib/invoice";

const styles: Record<Status, string> = {
  Paid: "bg-status-paid-bg text-status-paid",
  "Partially Paid": "bg-status-partial-bg text-status-partial",
  Unpaid: "bg-secondary text-secondary-foreground",
  Overdue: "bg-status-overdue-bg text-status-overdue",
  Draft: "bg-status-draft-bg text-muted-foreground",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
