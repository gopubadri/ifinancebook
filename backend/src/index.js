import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import customerRoutes from './routes/customers.js'
import miscRoutes from './routes/misc.js'
import txRoutes from './routes/transactions.js'
import accountingRoutes from './routes/accounting.js'
import { requireAuth } from './middleware/auth.js'
import { ensureOfficeSchema } from './utils/office.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/customers', requireAuth, customerRoutes)
app.use('/api/tx', requireAuth, txRoutes)
app.use('/api/accounting', requireAuth, accountingRoutes)
app.use('/api', requireAuth, miscRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

ensureOfficeSchema().catch((err) => console.error('Office schema ensure failed:', err.message))

const server = app.listen(port, () => console.log(`API on http://localhost:${port}`))
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or set PORT in .env.`)
    process.exit(1)
  }
  console.error(err)
  process.exit(1)
})
