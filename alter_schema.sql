-- Add 'url' column to movies table
ALTER TABLE movies ADD COLUMN url TEXT UNIQUE;

-- We also need to remove the UNIQUE constraint on r2_folder_name because during scraping, we might generate the same folder name if the logic isn't perfect, or we can leave it. Actually, r2_folder_name being unique is fine.
