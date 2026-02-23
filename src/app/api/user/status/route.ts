import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** GET /api/user/status — returns onboarding completeness for middleware */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, subscription_tier, phantom_wallet_hash')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({
    username: profile?.username ?? null,
    subscription: profile?.subscription_tier ?? null,
    hasPhantomWallet: !!profile?.phantom_wallet_hash,
  });
}
