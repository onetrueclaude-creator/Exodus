-- Allow anonymous inserts to waitlist (email form, no OAuth required)
-- Duplicate emails rejected by unique constraint on email column

CREATE POLICY "anon can insert waitlist"
  ON public.waitlist FOR INSERT
  TO anon
  WITH CHECK (true);
