import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TEST_EMAIL = 'beta_tester@zkagenticnetwork.test'
const TEST_PASSWORD = 'TestPass123!'
const TEST_USERNAME = 'beta_tester_01'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

async function seed() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create or re-use test user
  const { data: lookupData } = await admin.auth.admin.getUserByEmail(TEST_EMAIL)
  const existingUser = lookupData?.user

  let userId: string
  if (existingUser) {
    userId = existingUser.id
    console.log('Test user exists:', userId)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { username: TEST_USERNAME },
    })
    if (error) throw error
    userId = data.user.id
    console.log('Created test user:', userId)
  }

  // Upsert agent row (homenode at origin)
  const { error: agentErr } = await admin.from('agents').upsert(
    {
      id: `${userId}-homenode`,
      user_id: userId,
      username: TEST_USERNAME,
      tier: 'sonnet',
      is_primary: true,
      visual_x: 0,
      visual_y: 0,
      border_radius: 1,
      cpu_per_turn: 10,
      mining_rate: 1,
      staked_cpu: 5,
      density: 0.5,
      storage_slots: 10,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (agentErr) console.warn('Agent upsert warning:', agentErr.message)

  // Sign in to get session
  const browser_client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: session, error: signInErr } = await browser_client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInErr || !session.session) throw signInErr ?? new Error('No session returned')

  const { access_token, refresh_token } = session.session

  // Write storageState — Supabase SSR stores tokens in localStorage under project-ref key
  // The key format is: sb-<project-ref>-auth-token
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: storageKey,
            value: JSON.stringify({
              access_token,
              refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: 'bearer',
            }),
          },
        ],
      },
    ],
  }

  mkdirSync('playwright/.auth', { recursive: true })
  writeFileSync('playwright/.auth/user.json', JSON.stringify(storageState, null, 2))
  console.log('Session written to playwright/.auth/user.json')
  console.log('Storage key used:', storageKey)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
