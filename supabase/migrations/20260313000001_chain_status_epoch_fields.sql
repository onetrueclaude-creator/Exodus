-- Add epoch and economics fields to chain_status
-- These are needed by the testnet monitor at zkagentic.ai

-- Epoch tracking
ALTER TABLE public.chain_status ADD COLUMN IF NOT EXISTS epoch_ring INTEGER DEFAULT 1;
ALTER TABLE public.chain_status ADD COLUMN IF NOT EXISTS hardness NUMERIC DEFAULT 16.0;

-- Economics (v2+)
ALTER TABLE public.chain_status ADD COLUMN IF NOT EXISTS circulating_supply NUMERIC DEFAULT 0.0;
ALTER TABLE public.chain_status ADD COLUMN IF NOT EXISTS burned_fees INTEGER DEFAULT 0;

-- Fix total_mined: change from INTEGER to NUMERIC so small mining rewards aren't rounded to 0
ALTER TABLE public.chain_status ALTER COLUMN total_mined TYPE NUMERIC USING total_mined::NUMERIC;
