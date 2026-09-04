import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSession, logout } from "@/lib/auth.functions";
import { ShieldCheck, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.authenticated) throw redirect({ to: "/operador" });
    return { usuario: session.usuario };
  },
  component: OperadorShell,
});

function OperadorShell() {
  const { usuario } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sairFn = useServerFn(logout);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await sairFn();
    navigate({ to: "/operador", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Central de Validação
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/painel"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              Fila
            </Link>
            <Link
              to="/historico"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              Histórico
            </Link>
            <Link
              to="/tokens"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              Tokens
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {usuario}
            </span>
            <button
              onClick={sair}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
