-- Migration for Global Telemetry

-- Create the telemetry table
CREATE TABLE IF NOT EXISTS public.game_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.daily_games(id) ON DELETE CASCADE,
    guess_count INTEGER NOT NULL CHECK (guess_count >= 1 AND guess_count <= 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by game_id
CREATE INDEX IF NOT EXISTS idx_game_telemetry_game_id ON public.game_telemetry(game_id);

-- Enable RLS but allow inserts via the RPC
ALTER TABLE public.game_telemetry ENABLE ROW LEVEL SECURITY;

-- RPC to submit telemetry anonymously
CREATE OR REPLACE FUNCTION public.submit_telemetry(p_game_id UUID, p_guess_count INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.game_telemetry (game_id, guess_count)
    VALUES (p_game_id, p_guess_count);
END;
$$;

-- RPC to get global stats
CREATE OR REPLACE FUNCTION public.get_global_stats(p_game_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        '1', COALESCE(SUM(CASE WHEN guess_count = 1 THEN 1 ELSE 0 END), 0),
        '2', COALESCE(SUM(CASE WHEN guess_count = 2 THEN 1 ELSE 0 END), 0),
        '3', COALESCE(SUM(CASE WHEN guess_count = 3 THEN 1 ELSE 0 END), 0),
        '4', COALESCE(SUM(CASE WHEN guess_count = 4 THEN 1 ELSE 0 END), 0),
        '5', COALESCE(SUM(CASE WHEN guess_count = 5 THEN 1 ELSE 0 END), 0),
        'fail', COALESCE(SUM(CASE WHEN guess_count = 6 THEN 1 ELSE 0 END), 0)
    ) INTO result
    FROM public.game_telemetry
    WHERE game_id = p_game_id;

    RETURN result;
END;
$$;
