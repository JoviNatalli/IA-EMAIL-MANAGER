# dev-db — Postgres local sem instalação

Servidor Postgres local para desenvolvimento, sem precisar instalar
PostgreSQL, Docker, ou ter privilégios de root na máquina.

Usa [PGlite](https://pglite.dev) (Postgres real compilado para WASM) exposto
através do protocolo de fio (wire protocol) do Postgres via
`@electric-sql/pglite-socket`, para que `postgres-js`/Drizzle (ou qualquer
cliente Postgres, incluindo `psql`) se liguem normalmente a
`postgresql://127.0.0.1:5433/postgres`.

> Isto é uma ferramenta de desenvolvimento, não faz parte da app. Em
> produção, `DATABASE_URL` deve apontar para um Postgres real gerido
> (Neon, Supabase, Railway, Vercel Postgres, etc.).

## Uso

Num terminal, a partir da raiz do projeto:

```bash
pnpm db:local
```

Deixe esse terminal aberto — é o próprio processo do servidor. Nele vai
aparecer `listening on postgresql://127.0.0.1:5433/postgres`.

Noutro terminal, o fluxo normal:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Os dados persistem em `dev-db/pgdata/` entre reinícios (ignorado pelo git).
Para recomeçar do zero, pare o servidor e apague essa pasta.

## Alternativa

Se preferir um Postgres "a sério" localmente (Postgres.app, Homebrew,
Docker), ignore esta pasta por completo — basta apontar `DATABASE_URL` no
`.env.local` para essa instância.
