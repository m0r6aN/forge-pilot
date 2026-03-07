import { createClient } from '@supabase/supabase-js'

export interface HydratedDomainProfile {
  profileId: number
  schemaId: string
  profileVersion: string
  source: string
  payloadHash: string
  payload: Record<string, unknown>
}

let cachedSupabaseClient: ReturnType<typeof createClient> | null = null

function mustGetEnv(key: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

function getSupabaseAdminClient() {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient
  }

  const supabaseUrl = mustGetEnv('SUPABASE_URL')
  const serviceRoleKey = mustGetEnv('SUPABASE_SERVICE_ROLE_KEY')

  cachedSupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedSupabaseClient
}

export async function hydrateDomainProfile(
  domainKey: string,
  schemaId: string
): Promise<HydratedDomainProfile | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('domain_profiles')
    .select('profile_id, schema_id, profile_version, source, payload_hash, payload')
    .eq('domain_key', domainKey)
    .eq('schema_id', schemaId)
    .eq('status', 'active')
    .limit(2)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return null
  }

  if (data.length > 1) {
    throw new Error(`Fail-closed: multiple active domain profiles for ${domainKey}@${schemaId}`)
  }

  const row = data[0] as {
    profile_id: number
    schema_id: string
    profile_version: string
    source: string
    payload_hash: string
    payload: Record<string, unknown>
  }

  return {
    profileId: row.profile_id,
    schemaId: row.schema_id,
    profileVersion: row.profile_version,
    source: row.source,
    payloadHash: row.payload_hash,
    payload: row.payload,
  }
}
