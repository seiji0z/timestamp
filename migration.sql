-- Fix Timestamp Mapping and 404s

-- 1. Add missing columns to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS frame_count INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS frame_interval INTEGER DEFAULT 50;

-- 2. Update the secure view so the frontend can receive these new variables
-- Drop the view first to avoid PostgreSQL column ordering errors
DROP VIEW IF EXISTS today_game_info;

CREATE VIEW today_game_info AS
SELECT 
    dg.id AS game_id,
    dg.game_date,
    m.runtime_seconds,
    m.frame_count,
    m.frame_interval,
    m.r2_folder_name
FROM 
    daily_games dg
JOIN 
    movies m ON dg.movie_id = m.id
WHERE 
    dg.game_date = CURRENT_DATE;

-- Re-grant access just in case
GRANT SELECT ON today_game_info TO anon, authenticated;
