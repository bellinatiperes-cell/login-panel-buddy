import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { TokenPage } from "@/components/token-page";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/token-celular")({
  validateSearch: (s: Record<string, unknown>) => {
    const r = searchSchema.safeParse(s);
    if (!r.success) throw redirect({ to: "/" });
    return r.data;
  },
  head: () => ({
    meta: [
      { title: "Token do celular — Central de Validação" },
      { name: "description", content: "Informe o token gerado pelo aplicativo do seu celular." },
      { property: "og:title", content: "Token do celular" },
      { property: "og:description", content: "Informe o token gerado no aplicativo do celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function TokenCelularPage() {
    const { id } = Route.useSearch();
    return (
      <TokenPage
        id={id}
        fase="token_celular"
        titulo="Token do celular"
        descricao="Abra o aplicativo autenticador no seu celular e informe o código exibido."
        placeholder="000000"
        rotulo="Código do aplicativo"
      />
    );
  },
});
