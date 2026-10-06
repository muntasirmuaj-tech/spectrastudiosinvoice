<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
# Project rules
- Data access uses the browser client with per-owner RLS (owner_id = auth.uid()); no server functions needed for this private single-user app.
- Invoice line items and client details are stored as snapshots on the invoice so later edits to clients/services never change past invoices.
- Logo/QR images are stored as downscaled data URLs in settings (public storage buckets are blocked in this workspace) so PDFs render without cross-origin issues.
- PDF = html2canvas-pro capture of the off-screen #invoice-sheet copy; print uses #print-root with dedicated print CSS.
