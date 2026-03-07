import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const getEnvValue = (primaryKey, aliases = []) => {
  for (const key of [primaryKey, ...aliases]) {
    const value = process.env[key]?.trim()
    if (value) return value
  }

  return ''
}

const requireEnvValue = (primaryKey, aliases = []) => {
  const value = getEnvValue(primaryKey, aliases)

  if (!value) {
    throw new Error(`Missing required environment variable: ${[primaryKey, ...aliases].join(' or ')}`)
  }

  return value
}

const normalizeSupabaseUrl = (rawUrl) => {
  try {
    return new URL(rawUrl).origin
  } catch {
    throw new Error(`Invalid SUPABASE_URL: ${rawUrl}`)
  }
}

const supabaseUrl = normalizeSupabaseUrl(requireEnvValue('SUPABASE_URL'))
const serviceKey = requireEnvValue('SUPABASE_SERVICE_KEY', ['SUPABASE_SERVICE_ROLE_KEY'])

const supabase = createClient(
  supabaseUrl,
  serviceKey
)

export function createAuthClient(initialAccessToken) {
  const anonKey = requireEnvValue('SUPABASE_ANON_KEY')
  const client = createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: initialAccessToken
        ? { headers: { Authorization: `Bearer ${initialAccessToken}` } }
        : undefined,
    }
  )
  return client
}

export const supabaseConfig = {
  url: supabaseUrl,
  host: new URL(supabaseUrl).host,
}

export default supabase
export { supabase }
