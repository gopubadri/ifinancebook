import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pgConfig } from './pgConfig.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { Pool } = pg

export const pool = new Pool(pgConfig())

export function query(text, params) {
  return pool.query(text, params)
}
