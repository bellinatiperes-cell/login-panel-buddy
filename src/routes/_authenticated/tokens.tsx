import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Copy, QrCode, KeyRound } from "lucide-react";
import { listarTokensHistorico } from "@/lib/solicitacoes.functions";
import { formatarData } from "@/components/solicitacoes-ui";

export const Route = createFileRoute("/_authenticated/tokens")({
  head: () => ({
    meta: [
      { title: "Histórico de tokens — Painel do Operador" },
      {
        name: "description",
        content: "Registro de todos os tokens e QR Codes enviados pelos clientes.",
      },
      { property: "og:title", content: "Histórico de tokens — Painel do Operador" },
      {
        property: "og:description",
        content: "Todos os tokens (6 dígitos) e QR Codes (8 dígitos) enviados pelos clientes.",
      },
    ],
  }),
  component: TokensPage,
});

function TipoBadge({ tipo }: { tipo: string }) {
  const isQr = tipo === "qrcode";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
        isQr
          ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
          : "border-sky-400/50 bg-sky-400/10 text-sky-300"
      }`}
    >
      {isQr ? <QrCode className="size-3" /> : <KeyRound className="size-3" />}
      {isQr ? "QR Code (8 díg.)" : "Token (6 díg.)"}
    </span>
  );
}

function TokensPage() {
  const listar = useServerFn(listarTokensHistorico);
  const [busca, setBusca] = useState("");

  const lista = useQuery({
    queryKey: ["tokens-historico", busca],
    queryFn: () => listar({ data: { busca } }),
    refetchInterval: 5000,
  });

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Histórico de tokens</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todos os tokens enviados pelos clientes, incluindo reenvios. Token do celular/chaveiro tem 6
        dígitos; código do QR Code (validação digital) tem 8 dígitos.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar usuário"
            maxLength={120}
            className="h-9 w-56 rounded-md border border-input bg-card pr-3 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="px-3 py-2 text-left font-normal">Usuário</th>
              <th className="px-3 py-2 text-left font-normal">Tipo</th>
              <th className="px-3 py-2 text-left font-normal">Token</th>
              <th className="px-3 py-2 text-left font-normal">Enviado em</th>
            </tr>
          </thead>
          <tbody>
            {lista.isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!lista.isLoading && (lista.data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum token enviado ainda.
                </td>
              </tr>
            )}
            {lista.data?.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-mono text-foreground">{t.usuario}</td>
                <td className="px-3 py-2.5">
                  <TipoBadge tipo={t.tipo} />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(t.token).then(
                        () => toast.success("Copiado"),
                        () => toast.error("Não foi possível copiar"),
                      )
                    }
                    className="inline-flex items-center gap-1.5 font-mono text-[13px] tracking-widest text-foreground transition-colors hover:text-primary"
                    title="Copiar"
                  >
                    {t.token}
                    <Copy className="size-3 shrink-0 opacity-60" />
                  </button>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{formatarData(t.enviado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
