-- Anonymous read policies for testnet monitor dashboard (zkagentic.ai)

CREATE POLICY "public can read chain_status"
  ON public.chain_status FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "public can read agents"
  ON public.agents FOR SELECT
  TO anon
  USING (true);
