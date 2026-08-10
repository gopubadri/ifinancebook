import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseDatabaseUrl(url) {
  const u = new URL(url)
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: Number(u.port || 5432),
    database: u.pathname.replace(/^\//, '') || 'ifinance',
  }
}

async function main() {
  const cfg = parseDatabaseUrl(process.env.DATABASE_URL)
  console.log(`Connecting as ${cfg.user}@${cfg.host}:${cfg.port} ...`)

  const admin = new pg.Client({
    user: cfg.user,
    password: cfg.password,
    host: cfg.host,
    port: cfg.port,
    database: 'postgres',
  })

  await admin.connect()
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [cfg.database])
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${cfg.database}"`)
    console.log(`Created database "${cfg.database}"`)
  } else {
    console.log(`Database "${cfg.database}" already exists`)
  }
  await admin.end()

  const db = new pg.Client({
    user: cfg.user,
    password: cfg.password,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
  })
  await db.connect()

  const schema = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8')
  await db.query(schema)
  console.log('Schema applied')
  await db.end()
  console.log('DB setup complete')
}

main().catch((err) => {
  console.error('DB setup failed:', err.message)
  process.exit(1)
})
