export type StatusSolicitacao = "pendente" | "aprovado" | "reprovado";

export function StatusBadge({ status }: { status: StatusSolicitacao }) {
  const estilos: Record<StatusSolicitacao, string> = {
    pendente: "border-primary/40 bg-primary/10 text-primary",
    aprovado: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    reprovado: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${estilos[status]}`}
    >
      {status}
    </span>
  );
}

export function formatarData(valor: string | null) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function tempoRelativo(valor: string) {
  const diff = Date.now() - new Date(valor).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}
