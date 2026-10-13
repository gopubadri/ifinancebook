import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import pg from 'pg'
import { pgConfig } from '../src/pgConfig.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '..')

function runScript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: process.env,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${script} exited with code ${code}`))
    })
  })
}

async function applySchema() {
  const client = new pg.Client(pgConfig())
  await client.connect()
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8')
    await client.query(schema)
    console.log('Schema applied')
  } finally {
    await client.end()
  }
}

async function ensureStarterLogins() {
  const client = new pg.Client(pgConfig())
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM auth_users`)
    if (Number(rows[0].n) > 0) {
      console.log('Logins already exist')
      return
    }
    const password = process.env.ADMIN_PASSWORD || 'demo123'
    const passwordHash = await bcrypt.hash(password, 10)
    const users = [
      ['admin', 'RAJA', 'ADMIN'],
      ['clerk', 'DURGA', 'CLERK'],
      ['line', 'KISHORE', 'LINE EXECUTIVE'],
    ]
    for (const [username, name, role] of users) {
      await client.query(
        `INSERT INTO auth_users (username, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
        [username, passwordHash, name, role]
      )
    }
    console.log('Created starter logins: admin, clerk, line')
  } finally {
    await client.end()
  }
}

async function main() {
  await applySchema()
  await runScript('setupPhase2.js')
  await runScript('setupPhase3.js')
  await runScript('setupP0.js')
  await ensureStarterLogins()
  console.log('Database migrate complete')
}

main().catch((err) => {
  console.error('Migrate failed:', err.message)
  process.exit(1)
})
