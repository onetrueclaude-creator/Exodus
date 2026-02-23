import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/** GET /api/user?username=xyz — check if username is available */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username')?.trim();

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, error: 'Invalid format' });
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .single();

  return NextResponse.json({ available: !existing });
}

/** PATCH /api/user — set username (one-time during onboarding) */
export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const username = (body.username as string)?.trim();

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3-20 characters (letters, numbers, underscore)' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  // Check uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('user_id', user.id)
    .select('username')
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Failed to update username' }, { status: 500 });
  }

  return NextResponse.json({ username: profile.username });
}
