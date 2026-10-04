/** Render the on-screen A4 sheet (#invoice-sheet) to a multi-page A4 PDF. */
export async function downloadInvoicePdf(filename: string) {
  const el = document.getElementById("invoice-sheet");
  if (!el) throw new Error("Invoice not found");
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: el.scrollWidth });
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const pxPerMm = canvas.width / pageW;
  const pagePx = Math.floor(pageH * pxPerMm);
  let y = 0;
  let first = true;
  while (y < canvas.height - 4) {
    const h = Math.min(pagePx, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageW, h / pxPerMm);
    first = false;
    y += pagePx;
  }
  pdf.save(filename);
}

/** Read an image file, downscale it, return a data URL (used for logo & QR codes). */
export function fileToDataUrl(file: File, max = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/png"));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
