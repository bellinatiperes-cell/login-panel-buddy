import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { listarSolicitacoes } from "@/lib/solicitacoes.functions";
import { StatusBadge, formatarData, type StatusSolicitacao } from "@/components/solicitacoes-ui";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de decisões — Painel do Operador" },
      {
        name: "description",
        content: "Registro de todas as solicitações já aprovadas ou reprovadas, com operador e motivo.",
      },
      { property: "og:title", content: "Histórico de decisões — Painel do Operador" },
      {
        property: "og:description",
        content: "Registro das validações concluídas, com operador responsável e motivo.",
      },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const listar = useServerFn(listarSolicitacoes);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | "aprovado" | "reprovado">("todos");

  const lista = useQuery({
    queryKey: ["solicitacoes", "historico", busca, status],
    queryFn: () => listar({ data: { status: "todos", busca, periodo: "tudo" } }),
  });

  const decididas = (lista.data ?? []).filter(
    (s) => s.status !== "pendente" && (status === "todos" || s.status === status),
  );

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Histórico de decisões</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tudo que já foi validado, com operador responsável e motivo.
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
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["todos", "aprovado", "reprovado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                status === s
                  ? "bg-accent text-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <th className="px-3 py-2 text-left font-normal">Usuário</th>
              <th className="px-3 py-2 text-left font-normal">Decisão</th>
              <th className="px-3 py-2 text-left font-normal">Operador</th>
              <th className="px-3 py-2 text-left font-normal">Quando</th>
              <th className="px-3 py-2 text-left font-normal">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {lista.isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!lista.isLoading && decididas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhuma decisão registrada ainda.
                </td>
              </tr>
            )}
            {decididas.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-mono text-foreground">{s.usuario}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={s.status as StatusSolicitacao} />
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.operador ?? "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{formatarData(s.decidido_em)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.motivo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
