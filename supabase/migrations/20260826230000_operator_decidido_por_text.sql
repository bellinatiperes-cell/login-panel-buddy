-- Operator login moved from Supabase Auth to a single fixed account backed by
-- OPERATOR_USER/OPERATOR_PASS env vars. decidido_por now stores that username
-- directly instead of a Supabase auth.users uuid.
ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_decidido_por_fkey;
ALTER TABLE public.solicitacoes ALTER COLUMN decidido_por TYPE text USING decidido_por::text;
