ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_proxima_tela_check;
ALTER TABLE public.solicitacoes ADD CONSTRAINT solicitacoes_proxima_tela_check
  CHECK (proxima_tela = ANY (ARRAY['token_celular'::text, 'token_chaveiro'::text, 'pin'::text, 'interna'::text, 'sucesso'::text, 'interna_token_celular'::text, 'interna_token_chaveiro'::text]));