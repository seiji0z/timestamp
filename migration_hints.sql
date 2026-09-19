-- 1. Add genre and director columns to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS director TEXT;

-- 2. Create the get_hints RPC
CREATE OR REPLACE FUNCTION get_hints(p_game_id UUID, p_guess_count INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
    v_genre TEXT;
    v_director TEXT;
    v_result JSONB := '{}'::jsonb;
BEGIN
    SELECT m.release_year, m.genre, m.director 
    INTO v_year, v_genre, v_director
    FROM daily_games dg
    JOIN movies m ON dg.movie_id = m.id
    WHERE dg.id = p_game_id;

    IF v_year IS NULL THEN
        RETURN v_result;
    END IF;

    -- Hint 1 (After 2 incorrect guesses)
    IF p_guess_count >= 2 THEN
        v_result := v_result || jsonb_build_object('decade', (v_year / 10) * 10);
    END IF;
    
    -- Hint 2 (After 3 incorrect guesses)
    IF p_guess_count >= 3 AND v_genre IS NOT NULL THEN
        v_result := v_result || jsonb_build_object('genre', v_genre);
    END IF;
    
    -- Hint 3 (After 4 incorrect guesses)
    IF p_guess_count >= 4 AND v_director IS NOT NULL THEN
        v_result := v_result || jsonb_build_object('director', v_director);
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_hints(UUID, INTEGER) TO anon, authenticated;
