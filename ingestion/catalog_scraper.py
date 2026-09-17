import os
import re
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

def get_supabase_client() -> Client:
    # Service role key to insert movies because movies table is protected
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.")
    return create_client(url, key)

def scrape_catalog():
    print("Fetching movie directory...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    res = requests.get('https://movie-screencaps.com/movie-directory/', headers=headers)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, 'html.parser')
    
    # The links are typically inside .entry-content or similar, but we can just grab all links
    links = soup.find_all('a')
    
    movies = []
    
    # Regex to match URLs like https://movie-screencaps.com/iron-man-2008/
    # It looks for a slug ending in a 4-digit year.
    pattern = re.compile(r'^https://movie-screencaps\.com/([a-z0-9\-]+)-([12][0-9]{3})/?$')
    
    for a in links:
        href = a.get('href')
        if not href:
            continue
            
        match = pattern.match(href)
        if match:
            slug = match.group(1)
            year_str = match.group(2)
            
            # Format the title (e.g., 'the-a-team' -> 'The A Team')
            title = slug.replace('-', ' ').title()
            
            movies.append({
                'title': title,
                'release_year': int(year_str),
                'runtime_seconds': 7200, # Default to 2 hours for now
                'r2_folder_name': f"{slug}-{year_str}",
                'url': href
            })

    # Remove duplicates
    unique_movies = {m['url']: m for m in movies}.values()
    movies_list = list(unique_movies)
    
    print(f"Found {len(movies_list)} movies in directory.")
    
    # Insert into Supabase
    supabase = get_supabase_client()
    
    inserted_count = 0
    print("Uploading to database...")
    # Batch insertion
    batch_size = 100
    for i in range(0, len(movies_list), batch_size):
        batch = movies_list[i:i+batch_size]
        try:
            # Upsert based on URL or r2_folder_name to avoid errors on re-runs
            # In Supabase, if we want to upsert, we need to specify on_conflict
            response = supabase.table('movies').upsert(batch, on_conflict='r2_folder_name').execute()
            inserted_count += len(response.data)
            print(f"Inserted/Updated {inserted_count}/{len(movies_list)}")
        except Exception as e:
            print(f"Error inserting batch: {e}")
            
    print("Catalog generation complete!")

if __name__ == "__main__":
    load_dotenv()
    scrape_catalog()
