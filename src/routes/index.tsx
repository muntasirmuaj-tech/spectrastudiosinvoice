import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spectra Studios — Invoices" },
      { name: "description", content: "Create, manage and print Spectra Studios invoices." },
      { property: "og:title", content: "Spectra Studios — Invoices" },
      { property: "og:description", content: "Create, manage and print Spectra Studios invoices." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/documents" });
  },
});
