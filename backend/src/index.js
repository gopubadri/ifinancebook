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

app.listen(port, () => console.log(`API on http://localhost:${port}`))
