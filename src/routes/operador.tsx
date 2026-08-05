import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/operador")({
  head: () => ({
    meta: [
      { title: "Acesso do operador — Central de Validação" },
      {
        name: "description",
        content:
          "Area restrita: operadores autorizados entram aqui para validar as credenciais recebidas.",
      },
      { property: "og:title", content: "Acesso do operador — Central de Validação" },
      {
        property: "og:description",
        content: "Area restrita para operadores validarem credenciais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperadorLoginPage,
});

const schema = z.object({
  usuario: z
    .string()
    .trim()
    .min(3, "Informe o usuário")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Usuário inválido"),
  senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").max(72),
});

function OperadorLoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const parsed = schema.safeParse({ usuario, senha });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${parsed.data.usuario.toLowerCase()}@app.local`,
        password: parsed.data.senha,
      });
      if (error) {
        setErro("Usuário ou senha incorretos.");
        return;
      }
      navigate({ to: "/painel" });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-card p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <ShieldCheck className="size-5 text-primary" />
          Central de Validação · Operador
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-foreground">
            Fila de credenciais,
            <br />
            decidida em segundos.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Cada solicitação recebida chega com usuário, credencial e origem. O operador confere,
            aprova ou reprova — e tudo fica registrado no histórico.
          </p>
        </div>
        <div className="relative font-mono text-xs text-muted-foreground">
          acesso restrito · uso monitorado
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Voltar para o envio
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Entrar no painel
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Acesso exclusivo do operador autorizado.
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="usuario" className="text-xs font-medium text-muted-foreground">
                Usuário
              </label>
              <input
                id="usuario"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                maxLength={40}
                required
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="senha" className="text-xs font-medium text-muted-foreground">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                maxLength={72}
                required
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
              />
            </div>

            {erro && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {carregando && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
