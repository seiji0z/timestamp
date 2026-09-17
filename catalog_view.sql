-- Create a secure view for the autocomplete catalog
-- This exposes only the necessary fields, keeping the UUID r2_folder_name hidden!
CREATE OR REPLACE VIEW public_movie_catalog AS
SELECT id, title, release_year
FROM movies
ORDER BY title ASC;

-- Grant access to anonymous users so the frontend can read it
GRANT SELECT ON public_movie_catalog TO anon;
GRANT SELECT ON public_movie_catalog TO authenticated;