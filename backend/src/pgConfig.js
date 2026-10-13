/** Connection settings for local Postgres and hosted Neon. */
export function pgConfig(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL missing. Copy backend/.env.example to backend/.env')
  }

  const url = new URL(connectionString)
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  url.searchParams.delete('sslmode')
  url.searchParams.delete('channel_binding')

  return {
    connectionString: url.toString(),
    ssl: local ? undefined : { rejectUnauthorized: false },
  }
}
