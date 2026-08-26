# Remix of Remix of Remix of Operator Dashboard

criar tela de login com usuario e senha e criar tela do painel de operador onde recebe os dados para validação

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Configure the Supabase project before starting the app:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The service role key is server-only and must never be exposed as a `VITE_*` variable.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

For production, build and start the Nitro server:

```sh
npm run build
npm run start
```

## Deploy on Render

Create a new **Blueprint** in Render using this repository. The included
`render.yaml` configures the web service automatically. Add these environment
variables in the Render dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use the Supabase publishable key in the `VITE_*` variable and keep the service
role key server-only. Render must use Node.js 20.19 or newer.
