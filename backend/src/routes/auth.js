import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const router = Router()
const ALLOWED_ROLES = new Set(['ADMIN', 'CLERK', 'LINE EXECUTIVE'])
const SYSTEM_USERNAMES = new Set(['admin', 'clerk', 'line'])

function signUser(user) {
  const payload = { id: user.id, username: user.username, name: user.name, role: user.role }
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
  return { ok: true, token, user: payload }
}

router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  const { rows } = await query(
    `SELECT id, username, password_hash, name, role FROM auth_users WHERE username = $1`,
    [username]
  )
  const user = rows[0]
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid username or password.' })

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return res.status(401).json({ ok: false, error: 'Invalid username or password.' })

  return res.json(signUser(user))
})

router.post('/register', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const name = String(req.body?.name || '').trim().toUpperCase()
  const roleRaw = String(req.body?.role || 'CLERK').trim().toUpperCase()
  const role = ALLOWED_ROLES.has(roleRaw) ? roleRaw : 'CLERK'

  if (SYSTEM_USERNAMES.has(username)) {
    return res.status(400).json({ ok: false, error: 'That username is reserved.' })
  }
  if (!username || username.length < 3) {
    return res.status(400).json({ ok: false, error: 'Username must be at least 3 characters.' })
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return res.status(400).json({ ok: false, error: 'Username can only use letters, numbers, . _ -' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' })
  }
  if (!name) {
    return res.status(400).json({ ok: false, error: 'Display name is required.' })
  }

  const existing = await query(`SELECT id FROM auth_users WHERE username = $1`, [username])
  if (existing.rowCount > 0) {
    return res.status(409).json({ ok: false, error: 'That username is already taken.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { rows } = await query(
    `INSERT INTO auth_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, name, role`,
    [username, passwordHash, name, role]
  )

  return res.status(201).json(signUser(rows[0]))
})

export default router
