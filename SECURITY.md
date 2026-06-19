# Segurança de produção - VÉRTICE

## Estado esperado

- O frontend não deve fazer `select`, `insert`, `update` ou `delete` direto nas tabelas Supabase.
- As tabelas do jogo e do admin devem ser acessadas apenas pelas APIs Vercel em `api/`, usando `SUPABASE_SERVICE_KEY` no servidor.
- O painel admin deve autenticar com cookie `HttpOnly`, `Secure` em produção e `SameSite=Strict`.
- Uploads de assets devem usar URL assinada temporária criada pelo servidor.
- O bucket `vertice-assets` deve ficar privado. O admin e o jogo recebem URLs assinadas temporárias pelo servidor.

## Variáveis obrigatórias no Vercel

Frontend público:

- `VITE_SUPABASE_URL`: URL pública do projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: anon key pública do Supabase.
- `VITE_SUPABASE_STORAGE_BUCKET`: bucket usado para assets, normalmente `vertice-assets`.

Servidor/API:

- `SUPABASE_URL`: mesma URL do projeto Supabase.
- `SUPABASE_SERVICE_KEY`: service role key do Supabase. Nunca usar no frontend.
- `SUPABASE_STORAGE_BUCKET`: bucket usado pelas APIs de storage, normalmente `vertice-assets`.
- `SUPABASE_PROJECT_REF`: project ref do Supabase, usado por tooling/MCP.
- `ADMIN_PASSWORD`: senha privada do painel admin.
- `ADMIN_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres para assinar a sessão admin.

## Supabase

Aplicar o SQL em `supabase/production-rls.sql` no SQL Editor do Supabase ou via MCP/CLI. Esse script:

- ativa RLS nas tabelas principais;
- remove permissões públicas de leitura/escrita nas tabelas sensíveis;
- remove policies públicas antigas conhecidas;

O Storage deve ser mantido privado:

- o bucket `vertice-assets` deve ter `public = false`;
- uploads usam `createSignedUploadUrl` pelo endpoint admin;
- leituras usam `createSignedUrl` pelo endpoint admin ou pelo estado seguro do jogador;
- `supabase/storage-policy-owner.sql` fica apenas como fallback se algum dia for preciso expor leitura pública de assets não sensíveis.

## Checklist antes de publicar

- Repositório GitHub privado.
- Vercel com acesso ao repositório privado.
- Todas as variáveis acima configuradas em Production, Preview e Development conforme necessário.
- `npm run build` sem erros.
- SQL `supabase/production-rls.sql` aplicado no projeto Supabase correto.
- Bucket `vertice-assets` privado e sem policies públicas de escrita.
- Testar: criar sala, entrar como jogador, iniciar sala, receber pista, terminar jogo, ver ranking, entregar prémio no admin.
