import os
import random
import shutil
import boto3
from datetime import date, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

from scraper import scrape_movie_frames
from uploader import upload_frames_to_r2

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

def schedule_tomorrows_game(supabase, bucket_name):
    print("\nScheduling tomorrow's game...")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    
    # Check if tomorrow already exists
    existing = supabase.table('daily_games').select('id').eq('game_date', tomorrow).execute()
    if existing.data:
        print(f"Game for tomorrow ({tomorrow}) is already scheduled. Skipping.")
        return
        
    # Get all used movie_ids
    used_resp = supabase.table('daily_games').select('movie_id').execute()
    used_ids = [row['movie_id'] for row in used_resp.data]
    
    # Fetch unused movies
    query = supabase.table('movies').select('*')
    if used_ids:
        # Not perfect for huge DBs due to URL length limits, but works for thousands of items.
        # Alternatively, fetch all and filter in Python. Let's do that for safety.
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
        
        # Update the actual runtime in the database
        print(f"Updating movie runtime to {max_timestamp} seconds.")
        supabase.table('movies').update({'runtime_seconds': max_timestamp}).eq('id', selected_movie['id']).execute()
        
        # Delete spoiler frames (first 5 mins, last 10 mins) locally before uploading to R2
        for f in os.listdir(temp_workspace):
            if f.startswith('frame_') and f.endswith('.jpg'):
                ts = int(f.replace('frame_', '').replace('.jpg', ''))
                if ts < 300 or ts > (max_timestamp - 600):
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
    load_dotenv()
    supabase = get_supabase_client()
    r2_client = get_r2_client()
    bucket_name = os.environ.get("CLOUDFLARE_R2_BUCKET_NAME")
    
    if not bucket_name:
        raise ValueError("Missing CLOUDFLARE_R2_BUCKET_NAME")

    delete_yesterdays_frames(supabase, r2_client, bucket_name)
    schedule_tomorrows_game(supabase, bucket_name)

if __name__ == "__main__":
    main()
