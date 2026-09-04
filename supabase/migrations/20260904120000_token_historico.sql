-- Histórico de todos os tokens/QR codes enviados pelo cliente. Antes disso,
-- cada envio sobrescrevia a coluna solicitacoes.token e o valor anterior era
-- perdido ao reencaminhar. Toda leitura/escrita passa pelo cliente
-- service-role (supabaseAdmin), então RLS fica habilitado sem policies
-- públicas, no mesmo padrão de solicitacoes.
create table public.token_historico (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes (id) on delete cascade,
  usuario text not null,
  token text not null,
  tipo text not null default 'token',
  enviado_em timestamptz not null default now()
);

alter table public.token_historico enable row level security;

create index token_historico_solicitacao_id_idx on public.token_historico (solicitacao_id);
create index token_historico_enviado_em_idx on public.token_historico (enviado_em desc);
