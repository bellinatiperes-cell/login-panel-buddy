# Serial do token no painel do operador

Adicionar um campo editável na linha de cada solicitação para o operador digitar o número de série do token antes de liberar. O valor fica salvo no banco e é enviado ao cliente junto com a próxima tela (token celular ou chaveiro).

## Como fica no painel

- Nova coluna **Serial do token** entre "Senha" e "Ações", visível em todas as linhas pendentes.
- Input curto com placeholder `XXXXXX213-1`, aceitando letras, números e hífen (até 15 caracteres).
- O valor digitado é salvo automaticamente ao sair do campo (blur) para não perder ao clicar em liberar.
- Ao clicar no **L verde → Token celular/chaveiro**, o serial atual da linha é enviado junto com a aprovação.
- Se o operador tentar liberar sem preencher o serial, aparece um aviso e a liberação é bloqueada.

## Detalhes técnicos

- Migração: adicionar coluna `token_serial text` em `public.solicitacoes` (nullable).
- Server function `enviar` (src/lib/solicitacoes.functions.ts): aceitar `token_serial` no input e gravar no update junto com `proxima_tela` e status `aprovado`.
- Nova server function `salvarSerial` (ou reutilizar update parcial) para persistir o serial durante a digitação, sem mudar status.
- Painel (src/routes/\_authenticated/painel.tsx):
  - Estado local `serials: Record<string, string>` inicializado a partir de `row.token_serial`.
  - Input controlado por linha; onBlur dispara mutation `salvarSerial`.
  - Menu do L verde lê `serials[row.id]` e envia no `enviar({ proxima_tela, token_serial })`; bloqueia se vazio.
- Validação (zod, no server): `token_serial` string, trim, max 15, regex `^[A-Za-z0-9-]+$`.
- RLS: a policy `solicitacoes_update_operador` já cobre update por operador/admin em pendentes; nenhuma nova policy necessária.
