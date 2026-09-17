-- ==========================================
-- 1. Create Tables
-- ==========================================

-- Movies Table (Strictly Private)
-- Holds the actual movie data. The client should never query this directly.
CREATE TABLE movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    release_year INTEGER NOT NULL,
    runtime_seconds INTEGER NOT NULL,
    -- We can store the R2 folder name (e.g. 'test_movie_id') here to easily construct URLs.
    r2_folder_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Games Table
-- Maps a date to a movie.
CREATE TABLE daily_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_date DATE UNIQUE NOT NULL,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Enable Row Level Security (RLS)
-- ==========================================

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_games ENABLE ROW LEVEL SECURITY;

-- No policies are created for `movies`, meaning NO ONE (except superusers/service roles) can read it via the API.

-- Allow public read access to `daily_games`, but ONLY for today or past games.
-- We do not want users looking ahead at tomorrow's games.
CREATE POLICY "Allow public read access to active and past daily games"
ON daily_games
FOR SELECT
TO public
USING (game_date <= CURRENT_DATE);

-- ==========================================
-- 3. Secure View for Today's Game Setup
-- ==========================================
-- The frontend needs to know the game_id, runtime, and the R2 folder name to load images,
-- but it MUST NOT know the movie title. We create a view for this.

CREATE OR REPLACE VIEW today_game_info AS
SELECT 
    dg.id AS game_id,
    dg.game_date,
    m.runtime_seconds,
    m.r2_folder_name
FROM 
    daily_games dg
JOIN 
    movies m ON dg.movie_id = m.id
WHERE 
    dg.game_date = CURRENT_DATE;

-- Grant access to the view
GRANT SELECT ON today_game_info TO anon, authenticated;

-- ==========================================
-- 4. Secure RPC for Guessing
-- ==========================================
-- This function runs on the server. The client calls this function with the game_id and their guess.
-- It returns TRUE if the guess matches the movie title (case-insensitive), FALSE otherwise.

CREATE OR REPLACE FUNCTION guess_movie(p_game_id UUID, p_guess_title TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges so it can read the 'movies' table
AS $$
DECLARE
    actual_title TEXT;
BEGIN
    -- Look up the actual movie title for the given game_id
    SELECT m.title INTO actual_title
    FROM daily_games dg
    JOIN movies m ON dg.movie_id = m.id
    WHERE dg.id = p_game_id;

    -- If no game found, return false
    IF actual_title IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Compare the guess with the actual title (ignoring case and leading/trailing whitespace)
    -- You can make this comparison more robust later (e.g., stripping punctuation)
    IF LOWER(TRIM(p_guess_title)) = LOWER(TRIM(actual_title)) THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Grant execution to anonymous users
GRANT EXECUTE ON FUNCTION guess_movie(UUID, TEXT) TO anon, authenticated;
