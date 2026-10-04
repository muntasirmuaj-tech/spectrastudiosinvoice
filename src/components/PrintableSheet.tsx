import { useEffect, useRef, useState } from "react";
import { InvoiceSheet } from "./InvoiceSheet";
import type { Invoice, Settings } from "@/lib/invoice";

const A4_PX = 794; // 210mm at 96dpi

/** Scaled live preview + an unscaled off-screen copy used for PDF and printing. */
export function PrintableSheet({ invoice, settings, paid }: { invoice: Invoice; settings: Settings; paid: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(1123);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / A4_PX));
      if (inner.current) setH(inner.current.offsetHeight);
    });
    ro.observe(el);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div ref={wrap} className="w-full">
        <div style={{ height: h * scale }} className="relative mx-auto" >
          <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_PX }} className="absolute left-0 top-0">
            <InvoiceSheet invoice={invoice} settings={settings} paid={paid} />
          </div>
        </div>
      </div>
      <div id="print-root" aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <InvoiceSheet id="invoice-sheet" invoice={invoice} settings={settings} paid={paid} />
      </div>
    </>
  );
}
