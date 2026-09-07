// Local dev-only Postgres server for Nuvoly, backed by PGlite (WASM Postgres)
// and exposed over the real Postgres wire protocol via pglite-socket.
//
// This exists because the sandboxed dev environment has no root access and no
// package-manager route to a native PostgreSQL install. It is NOT part of the
// Nuvoly app or its git history — pure local tooling, lives outside the repo.
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
// pgvector: a partir da PGlite 0.5 as extensões vivem em pacotes próprios.
// É o que permite a pesquisa semântica da Fase 6 correr na base local.
import { vector } from '@electric-sql/pglite-pgvector'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'pgdata')
const port = Number(process.env.LOCAL_DB_PORT || 5433)
const host = '127.0.0.1'

const db = await PGlite.create({ dataDir, extensions: { vector } })

const server = new PGLiteSocketServer({
  db,
  port,
  host,
  maxConnections: 5,
})

await server.start()
console.log(`[nuvoly-local-db] listening on postgresql://127.0.0.1:${port}/postgres`)
console.log(`[nuvoly-local-db] data dir: ${dataDir}`)
console.log(`[nuvoly-local-db] pid: ${process.pid}`)

const shutdown = async () => {
  console.log('[nuvoly-local-db] shutting down...')
  await server.stop()
  await db.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
