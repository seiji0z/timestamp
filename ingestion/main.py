import os
import sys
import shutil
import argparse
from dotenv import load_dotenv

from scraper import scrape_movie_frames
from uploader import upload_frames_to_r2

def main():
    parser = argparse.ArgumentParser(description="Framedle Ingestion Pipeline")
    parser.add_argument("url", help="URL to the first page of the movie screencaps gallery")
    parser.add_argument("movie_id", help="The database ID for this movie (used for the R2 prefix)")
    parser.add_argument("--skip-interval", type=int, default=5, help="Save 1 out of every N images (default: 5)")
    parser.add_argument("--bucket", default="framedle-frames", help="The Cloudflare R2 bucket name")
    
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    temp_workspace = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_workspace')
    
    if os.path.exists(temp_workspace):
        shutil.rmtree(temp_workspace)
    os.makedirs(temp_workspace)
    
    try:
        print(f"Scraping frames for movie_id {args.movie_id}...")
        scrape_movie_frames(args.url, temp_workspace, args.skip_interval)
        
        print(f"\nUploading frames to Cloudflare R2...")
        upload_frames_to_r2(temp_workspace, args.bucket, args.movie_id)
        
    finally:
        # Cleanup
        print("\nCleaning up workspace...")
        if os.path.exists(temp_workspace):
            shutil.rmtree(temp_workspace)
        print("Done!")

if __name__ == "__main__":
    main()
