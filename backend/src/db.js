import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL missing. Copy backend/.env.example to backend/.env')
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export function query(text, params) {
  return pool.query(text, params)
}
