-- Initial schema: roles, profiles and the solicitacoes queue used by the app.
create type public.app_role as enum ('admin', 'operador');
create type public.status_solicitacao as enum ('pendente', 'aprovado', 'reprovado');

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create table public.papeis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.papeis enable row level security;

-- security definer avoids RLS recursion when policies call has_role().
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.papeis
    where user_id = _user_id and role = _role
  )
$$;

create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  credencial text not null,
  origem text not null default '',
  status public.status_solicitacao not null default 'pendente',
  observacao text,
  criado_em timestamptz not null default now(),
  motivo text,
  decidido_em timestamptz,
  decidido_por uuid references auth.users (id),
  proxima_tela text,
  token text,
  token_em timestamptz,
  ip text,
  user_agent text,
  ultimo_ping timestamptz,
  mudou_aba boolean not null default false,
  fase text not null default 'senha',
  pin text,
  pin_em timestamptz,
  token_serial text,
  token_nome text
);

alter table public.solicitacoes enable row level security;

-- perfis: a user reads their own profile; admins read all.
create policy "Usuarios veem o proprio perfil"
  on public.perfis for select
  to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- papeis: only admins can list role assignments directly.
create policy "Admins veem papeis"
  on public.papeis for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- solicitacoes: operador/admin manage the queue. Inserts come only from the
-- service-role client (src/lib/cliente.functions.ts), so no insert policy here.
create policy "Operadores veem solicitacoes"
  on public.solicitacoes for select
  to authenticated
  using (public.has_role(auth.uid(), 'operador') or public.has_role(auth.uid(), 'admin'));

create policy "Operadores atualizam solicitacoes"
  on public.solicitacoes for update
  to authenticated
  using (public.has_role(auth.uid(), 'operador') or public.has_role(auth.uid(), 'admin'));

create policy "Operadores excluem solicitacoes"
  on public.solicitacoes for delete
  to authenticated
  using (public.has_role(auth.uid(), 'operador') or public.has_role(auth.uid(), 'admin'));
