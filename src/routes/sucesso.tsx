import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/sucesso")({
  head: () => ({
    meta: [
      { title: "Validação aprovada — Central de Validação" },
      { name: "description", content: "Sua solicitação foi aprovada pelo operador." },
      { property: "og:title", content: "Validação aprovada" },
      { property: "og:description", content: "Sua solicitação foi aprovada pelo operador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SucessoPage,
});

function SucessoPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md rounded-md border border-primary/40 bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Validação aprovada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Suas credenciais foram confirmadas pelo operador. Você já pode prosseguir.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm text-foreground hover:bg-card"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
