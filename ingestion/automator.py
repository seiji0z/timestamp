import os
import random
import shutil
import boto3
import requests
import urllib.parse
from datetime import date, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

from scraper import scrape_movie_frames
from uploader import upload_frames_to_r2

def get_movie_metadata(title, year):
    """Fetch the actual movie runtime, genre, and director from TMDB."""
    api_key = os.environ.get("VITE_TMDB_API_KEY") 
    if not api_key:
        return 7200, None, None, False # Fallback to 2 hours
    try:
        query = urllib.parse.quote(title)
        res = requests.get(f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={query}&primary_release_year={year}")
        data = res.json()
        if not data.get('results'):
            # Fallback without year
            res = requests.get(f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={query}")
            data = res.json()
            
        if data.get('results'):
            movie_id = data['results'][0]['id']
            # Fetch details for runtime and genres
            details_res = requests.get(f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={api_key}")
            details = details_res.json()
            
            runtime = 7200
            if details.get('runtime'):
                runtime = details['runtime'] * 60 # Convert minutes to seconds
                
            genres = [g['name'] for g in details.get('genres', [])]
            genre_str = " / ".join(genres[:2]) if genres else None
            
            # Fetch credits for director
            credits_res = requests.get(f"https://api.themoviedb.org/3/movie/{movie_id}/credits?api_key={api_key}")
            credits = credits_res.json()
            
            director = None
            for crew_member in credits.get('crew', []):
                if crew_member.get('job') == 'Director':
                    director = crew_member.get('name')
                    break
                    
            return runtime, genre_str, director, True
    except Exception as e:
        print(f"Error fetching metadata from TMDB: {e}")
    print("WARNING: Falling back to 7200 seconds for runtime! Timestamps will drift if this is incorrect.")
    return 7200, None, None, False

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def get_r2_client():
    r2_endpoint = os.environ.get("R2_ENDPOINT_URL")
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")

    if not r2_endpoint or not access_key or not secret_key:
        raise ValueError("Cloudflare R2 credentials missing from environment variables.")

    return boto3.client(
        's3',
        endpoint_url=r2_endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name='auto',
        config=boto3.session.Config(signature_version='s3v4')
    )

def delete_yesterdays_frames(supabase, r2_client, bucket_name):
    print("Checking for yesterday's frames to delete...")
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    
    # Get yesterday's game
    response = supabase.table('daily_games').select('movie_id').eq('game_date', yesterday).execute()
    
    if not response.data:
        print(f"No game found for yesterday ({yesterday}). Skipping deletion.")
        return
        
    movie_id = response.data[0]['movie_id']
    
    # Get movie details to find r2_folder_name
    movie_resp = supabase.table('movies').select('r2_folder_name').eq('id', movie_id).execute()
    if not movie_resp.data:
        print("Movie data missing for yesterday's game.")
        return
        
    r2_folder_name = movie_resp.data[0]['r2_folder_name']
    prefix = f"movies/{r2_folder_name}/"
    
    print(f"Deleting frames for folder: {prefix}")
    
    # List and delete all objects with this prefix
    paginator = r2_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
    
    delete_count = 0
    for page in pages:
        if 'Contents' in page:
            objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
            r2_client.delete_objects(Bucket=bucket_name, Delete={'Objects': objects_to_delete})
            delete_count += len(objects_to_delete)
            
    print(f"Deleted {delete_count} frames from R2 for {r2_folder_name}.")

def delete_old_telemetry(supabase):
    print("\nChecking for old telemetry data to delete...")
    # Delete telemetry records older than 3 days
    three_days_ago = (date.today() - timedelta(days=3)).isoformat()
    try:
        response = supabase.table('game_telemetry').delete().lt('created_at', three_days_ago).execute()
        # The Supabase Python client returns the deleted rows in response.data
        deleted_count = len(response.data) if response.data else 0
        print(f"Deleted {deleted_count} old telemetry records from before {three_days_ago}.")
    except Exception as e:
        print(f"Error deleting old telemetry: {e}")

def schedule_tomorrows_game(supabase, bucket_name):
    print("\nScheduling the next game...")
    
    # Get the latest game date from the database
    latest_game_resp = supabase.table('daily_games').select('game_date').order('game_date', desc=True).limit(1).execute()
    
    if latest_game_resp.data:
        latest_date_str = latest_game_resp.data[0]['game_date']
        next_game_date = (date.fromisoformat(latest_date_str) + timedelta(days=1)).isoformat()
    else:
        # If no games exist at all, start with today
        next_game_date = date.today().isoformat()
        
    print(f"Target date for next game: {next_game_date}")
    
    # Check if next_game_date already exists 
    existing = supabase.table('daily_games').select('id').eq('game_date', next_game_date).execute()
    if existing.data:
        print(f"Game for {next_game_date} is already scheduled. Skipping.")
        return
        
    # Get all used movie_ids
    used_resp = supabase.table('daily_games').select('movie_id').execute()
    used_ids = [row['movie_id'] for row in used_resp.data]
    
    # Fetch unused movies
    query = supabase.table('movies').select('*')
    if used_ids:
        # Fetch all and filter in Python.
        all_movies_resp = supabase.table('movies').select('*').execute()
        available_movies = [m for m in all_movies_resp.data if m['id'] not in used_ids]
    else:
        all_movies_resp = supabase.table('movies').select('*').execute()
        available_movies = all_movies_resp.data
        
    if not available_movies:
        print("CRITICAL WARNING: No unused movies left in the catalog!")
        return
        
    selected_movie = random.choice(available_movies)
    print(f"Selected Movie: {selected_movie['title']} ({selected_movie['release_year']})")
    
    # Ensure temporary workspace
    temp_workspace = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_workspace')
    if os.path.exists(temp_workspace):
        shutil.rmtree(temp_workspace)
    os.makedirs(temp_workspace)
    
    try:
        print(f"Scraping frames from: {selected_movie['url']}")
        max_timestamp = scrape_movie_frames(selected_movie['url'], temp_workspace, skip_interval=50)
        
        # Get real runtime and metadata from TMDB
        real_runtime, genre, director, tmdb_success = get_movie_metadata(selected_movie['title'], selected_movie['release_year'])
        
        # Update the database with real time and frame metrics
        update_payload = {
            'frame_count': max_timestamp,
            'frame_interval': 50
        }
        if tmdb_success:
            update_payload['runtime_seconds'] = real_runtime
        if genre:
            update_payload['genre'] = genre
        if director:
            update_payload['director'] = director
            
        print(f"Updating movie payload: {update_payload}")
        supabase.table('movies').update(update_payload).eq('id', selected_movie['id']).execute()
        
        # Delete spoiler frames (first 5 mins, last 10 mins) locally before uploading to R2
        # Must convert the real time (300 seconds) to the frame index to delete
        raw_ratio = max_timestamp / real_runtime if real_runtime > 0 else 1
        if raw_ratio < 0.75:
            exact_ratio = 0.5
        elif raw_ratio < 1.5:
            exact_ratio = 1.0
        else:
            exact_ratio = 2.0
            
        safe_start_frame = int(300 * exact_ratio)
        safe_end_frame = int((real_runtime - 600) * exact_ratio)
        
        for f in os.listdir(temp_workspace):
            if f.startswith('frame_') and f.endswith('.jpg'):
                ts = int(f.replace('frame_', '').replace('.jpg', ''))
                if ts < safe_start_frame or ts > safe_end_frame:
                    os.remove(os.path.join(temp_workspace, f))
        
        print(f"Uploading frames to R2 folder: {selected_movie['r2_folder_name']}")
        upload_frames_to_r2(temp_workspace, bucket_name, selected_movie['r2_folder_name'])
        
        print("Inserting game into Supabase...")
        supabase.table('daily_games').insert({
            'game_date': tomorrow,
            'movie_id': selected_movie['id']
        }).execute()
        
        print(f"Successfully scheduled {selected_movie['title']} for {tomorrow}!")
        
    finally:
        if os.path.exists(temp_workspace):
            shutil.rmtree(temp_workspace)

def main():
    # Load environment variables
    load_dotenv('.env')
    supabase = get_supabase_client()
    r2_client = get_r2_client()
    bucket_name = os.environ.get("CLOUDFLARE_R2_BUCKET_NAME") or "framedle-frames"
    
    if not bucket_name:
        raise ValueError("Missing CLOUDFLARE_R2_BUCKET_NAME")

    delete_yesterdays_frames(supabase, r2_client, bucket_name)
    delete_old_telemetry(supabase)
    schedule_tomorrows_game(supabase, bucket_name)

if __name__ == "__main__":
    main()
