# Vercel env setup

Definir estas variáveis em Production, Preview e Development, conforme o ambiente:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_STORAGE_BUCKET=vertice-assets

SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_PROJECT_REF=wplgpfwpxjocprypdlix
SUPABASE_STORAGE_BUCKET=vertice-assets

ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

## Regras

- Não colar `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD` ou `ADMIN_SESSION_SECRET` em conversas.
- Usar o dashboard da Vercel ou `vercel env add` depois de fazer login local.
- `ADMIN_SESSION_SECRET` deve ter pelo menos 32 caracteres aleatórios.
- Depois de alterar envs em Production, fazer novo deploy.

## Comandos quando Vercel CLI estiver autenticado

```bash
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_SUPABASE_STORAGE_BUCKET production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add SUPABASE_PROJECT_REF production
vercel env add SUPABASE_STORAGE_BUCKET production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SESSION_SECRET production
```

Repetir para `preview` e `development` se esses ambientes forem usados.
