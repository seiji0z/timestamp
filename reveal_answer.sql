CREATE OR REPLACE FUNCTION reveal_answer()
RETURNS TABLE(title TEXT, release_year INTEGER)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT m.title, m.release_year
  FROM daily_games dg
  JOIN movies m ON m.id = dg.movie_id
  WHERE dg.game_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION reveal_answer() TO anon, authenticated;
