import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing env.${name}`)
  }

  return value
}

let browserClient: SupabaseClient | null = null

function getSupabaseUrl() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL')
}

function getSupabasePublishableKey() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
}

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient(
      getSupabaseUrl(),
      getSupabasePublishableKey()
    )
  }

  return browserClient
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient()
    const value = client[property as keyof SupabaseClient]

    if (typeof value === 'function') {
      return value.bind(client)
    }

    return value
  },
})

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client can only be used on the server')
  }

  return createClient(getSupabaseUrl(), requireEnv('SUPABASE_SECRET_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
