import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string; hint?: string };

export function SearchSelect({
  options, value, onSelect, placeholder, addLabel, onAdd, className, triggerLabel,
}: {
  options: Opt[]; value?: string | null; onSelect: (v: string) => void; placeholder: string;
  addLabel: string; onAdd: (query: string) => void; className?: string; triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            className,
          )}
        >
          <span className={cn("truncate", !current && !triggerLabel && "text-muted-foreground")}>{triggerLabel ?? current?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">No matches</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label} ${o.hint ?? ""} ${o.value}`} onSelect={() => { onSelect(o.value); setOpen(false); setQ(""); }}>
                  <Check className={cn("h-3.5 w-3.5", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent"
            onClick={() => { setOpen(false); onAdd(q); setQ(""); }}
          >
            <Plus className="h-4 w-4" /> {addLabel}{q && ` “${q}”`}
          </button>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
