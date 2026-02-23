import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Get the authenticated user from the Supabase session. Returns null if not authenticated. */
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
