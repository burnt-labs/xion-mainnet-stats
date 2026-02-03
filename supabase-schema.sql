-- Xion Mainnet Stats Database Schema
-- This schema file can be executed in Supabase SQL Editor to set up the required tables and functions

-- ============================================================================
-- Table: feegrant_balance
-- Stores wallet balance snapshots with timestamps
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feegrant_balance (
    id BIGSERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    balance TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feegrant_balance
CREATE INDEX IF NOT EXISTS idx_feegrant_balance_address ON public.feegrant_balance(address);
CREATE INDEX IF NOT EXISTS idx_feegrant_balance_created_at ON public.feegrant_balance(created_at);
CREATE INDEX IF NOT EXISTS idx_feegrant_balance_address_created_at ON public.feegrant_balance(address, created_at DESC);

-- ============================================================================
-- Table: Xion Holders
-- Stores total holder count snapshots over time
-- Note: Table name includes a space, which requires quotes in SQL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public."Xion Holders" (
    id BIGSERIAL PRIMARY KEY,
    total_holders TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Xion Holders
CREATE INDEX IF NOT EXISTS idx_xion_holders_updated_at ON public."Xion Holders"(updated_at);

-- ============================================================================
-- Table: subscribers
-- Stores Telegram chat IDs for wallet balance notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscribers (
    chat_id BIGINT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Function: get_daily_feegrant_balances
-- Aggregates feegrant_balance data by day for efficient querying of 7d/all intervals
-- Returns daily aggregated balances per address
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_daily_feegrant_balances()
RETURNS TABLE (
    address TEXT,
    balance TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fb.address,
        fb.balance,
        DATE_TRUNC('day', fb.created_at)::TIMESTAMPTZ AS created_at
    FROM public.feegrant_balance fb
    INNER JOIN (
        SELECT 
            address,
            DATE_TRUNC('day', created_at)::DATE AS day,
            MAX(created_at) AS max_created_at
        FROM public.feegrant_balance
        GROUP BY address, DATE_TRUNC('day', created_at)::DATE
    ) latest ON fb.address = latest.address 
        AND fb.created_at = latest.max_created_at
    ORDER BY fb.address, created_at DESC;
END;
$$;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- Enable RLS if you want to restrict access, or disable if using service role key
-- ============================================================================

-- Enable RLS on tables (optional - depends on your security requirements)
-- ALTER TABLE public.feegrant_balance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Xion Holders" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment if needed):
-- Policy to allow service role to do everything
-- CREATE POLICY "Service role can do everything" ON public.feegrant_balance
--     FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Grant permissions (adjust based on your Supabase setup)
-- ============================================================================
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON public.feegrant_balance TO postgres, service_role;
GRANT SELECT ON public.feegrant_balance TO anon, authenticated;

GRANT ALL ON public."Xion Holders" TO postgres, service_role;
GRANT SELECT ON public."Xion Holders" TO anon, authenticated;

GRANT ALL ON public.subscribers TO postgres, service_role;
GRANT SELECT, INSERT, DELETE ON public.subscribers TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION public.get_daily_feegrant_balances() TO postgres, service_role, anon, authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE public.feegrant_balance IS 'Stores wallet balance snapshots for fee grant wallets';
COMMENT ON COLUMN public.feegrant_balance.address IS 'Xion wallet address';
COMMENT ON COLUMN public.feegrant_balance.balance IS 'Balance amount as string (in uxion)';
COMMENT ON COLUMN public.feegrant_balance.data IS 'Full API response data as JSON';

COMMENT ON TABLE public."Xion Holders" IS 'Stores total holder count snapshots over time';
COMMENT ON COLUMN public."Xion Holders".total_holders IS 'Total number of holders at snapshot time (stored as TEXT to match API response format)';
COMMENT ON COLUMN public."Xion Holders".data IS 'Full denom_owners array from API';

COMMENT ON TABLE public.subscribers IS 'Telegram chat IDs subscribed to wallet balance notifications';
COMMENT ON COLUMN public.subscribers.chat_id IS 'Telegram chat ID (primary key)';

COMMENT ON FUNCTION public.get_daily_feegrant_balances() IS 'Returns daily aggregated wallet balances for efficient 7d/all interval queries';

