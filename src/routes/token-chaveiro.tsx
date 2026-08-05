import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TokenPage } from "@/components/token-page";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/token-chaveiro")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Token do chaveiro — Central de Validação" },
      { name: "description", content: "Informe o código exibido no seu chaveiro token físico." },
      { property: "og:title", content: "Token do chaveiro" },
      { property: "og:description", content: "Informe o código exibido no chaveiro token." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function TokenChaveiroPage() {
    const { id } = Route.useSearch();
    return (
      <TokenPage
        id={id}
        fase="token_chaveiro"
        titulo="Token do chaveiro"
        descricao="Pressione o botão do seu chaveiro token e informe o código exibido no visor."
        placeholder="00000000"
        rotulo="Código do chaveiro"
      />
    );
  },
});
