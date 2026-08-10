import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Always load server/.env even if process was started from repo root
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env and set your Postgres password.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query(text, params) {
  return pool.query(text, params)
}
