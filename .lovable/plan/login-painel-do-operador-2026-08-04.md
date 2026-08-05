# Login + Painel do Operador

Duas telas: um login real (com contas de verdade) e um painel onde o operador recebe solicitações contendo usuário e senha para aprovar ou reprovar.

## Telas

**1. Login (`/`)**
- Campos e-mail e senha, com validação e mensagens de erro claras.
- Link para criar conta de operador.
- Após entrar, redireciona para o painel.

**2. Painel do operador (`/painel`)** — acessível apenas logado
- Lista de solicitações pendentes: usuário informado, data/hora de envio, origem e status.
- Busca por usuário e filtros por status (pendente, aprovado, reprovado) e período.
- Clique abre o detalhe lateral com todos os dados da solicitação, incluindo a senha enviada (mascarada por padrão, com botão "mostrar").
- Botões **Aprovar** e **Reprovar**; reprovar pede um motivo.
- Aba **Histórico**: tudo que já foi decidido, com operador responsável, decisão, motivo e data.

## Backend (Lovable Cloud)

- Autenticação por e-mail/senha, sessão persistente e rota do painel protegida.
- Tabela `perfis` (nome do operador, vinculada ao usuário) e tabela `papeis` separada para controle de acesso.
- Tabela `solicitacoes`: usuário informado, credencial enviada, status, data, operador que decidiu, motivo, data da decisão.
- Regras de acesso: só operadores autenticados leem e decidem solicitações; ninguém pode alterar uma decisão de outro operador.
- Migração inclui algumas solicitações de exemplo para o painel já nascer com conteúdo.

## Detalhes técnicos

- Rotas TanStack: `src/routes/index.tsx` (login), `_authenticated/painel.tsx` e `_authenticated/historico.tsx` sob o gate de autenticação gerenciado.
- Leitura/escrita via server functions autenticadas (`requireSupabaseAuth`) + TanStack Query; aprovar/reprovar invalida a lista.
- Validação com Zod no cliente e no servidor.
- Papéis em tabela própria com função `has_role` (security definer) — nunca no perfil.
- Design: tema escuro sóbrio de ferramenta operacional, densidade alta, tipografia condensada; tokens semânticos em `src/styles.css`.

## Observação

A senha das solicitações fica visível para o operador porque a validação exige isso. Se preferir, posso trocar por comparação automática sem exibir o valor — é só avisar.
