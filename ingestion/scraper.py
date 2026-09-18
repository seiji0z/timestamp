import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def scrape_movie_frames(url, output_dir, skip_interval=5):
    """
    Scrape images from a movie screencaps gallery.
    Args:
        url: The URL to the first page of the gallery.
        output_dir: Directory to save the downloaded images.
        skip_interval: Save 1 out of every `skip_interval` images.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': url
    }

    current_url = url
    image_count = 0
    saved_count = 0
    
    print(f"Starting scrape from: {url}")
    print(f"Saving 1 in every {skip_interval} images to {output_dir}")

    while current_url:
        print(f"Fetching page: {current_url}")
        try:
            response = requests.get(current_url, headers=headers)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {current_url}: {e}")
            break

        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all images
        # Restrict to the main content area to avoid other divs
        main_content = soup.find('article') or soup.find('div', class_='entry-content') or soup
        images = main_content.find_all('img')
        
        for img in images:
            img_src = img.get('src') or img.get('data-src')
            if not img_src:
                continue
                
            # Filter out gravatars, tracking pixels, etc. Only keep actual frames/posters.
            if 'b-cdn.net' not in img_src and 'movie-screencaps.com' not in img_src:
                continue
                
            if '?class=thumbnail' in img_src:
                img_src = img_src.split('?class=thumbnail')[0]
                
            # Filter out non-gallery images (logos, banners, etc)
            if 'logo' in img_src.lower() or 'banner' in img_src.lower() or 'avatar' in img_src.lower():
                continue

            full_img_url = urljoin(current_url, img_src)

            if '?' in full_img_url:
                full_img_url = full_img_url.split('?')[0]
            
            import re
            # Extract true frame number from URL (e.g. ...-1234.jpg or .../1234.jpg)
            match = re.search(r'-(\d+)\.(jpg|jpeg|png|webp)$', full_img_url, re.IGNORECASE)
            if not match:
                match = re.search(r'/(\d+)\.(jpg|jpeg|png|webp)$', full_img_url, re.IGNORECASE)
                
            if not match:
                # If no number is found, it's likely a junk thumbnail, skip 
                continue
                
            true_frame_number = int(match.group(1))
            
            # Keep track of the highest frame number we've seen (for max_timestamp)
            if true_frame_number > image_count:
                image_count = true_frame_number

            # Implement skip interval based on true frame number
            rounded_frame_number = round(true_frame_number / skip_interval) * skip_interval
            filename = f"frame_{rounded_frame_number}.jpg"
            filepath = os.path.join(output_dir, filename)
            
            # Save if we reached the rounded interval and haven't saved it yet
            if not os.path.exists(filepath) and true_frame_number >= rounded_frame_number:
                try:
                    img_resp = requests.get(full_img_url, headers=headers)
                    img_resp.raise_for_status()
                    with open(filepath, 'wb') as f:
                        f.write(img_resp.content)
                    saved_count += 1
                    print(f"Saved {filename} (from true frame {true_frame_number})")
                except Exception as e:
                    print(f"Failed to download {full_img_url}: {e}")
            
        # Find next page link (Site-specific selector)
        next_link_tag = soup.find('a', string=lambda t: t and 'Next' in t) or soup.select_one('a.next, a.next-page, a.page-link[rel="next"]')
        if next_link_tag and next_link_tag.get('href') and next_link_tag.get('href') != '#':
            current_url = urljoin(current_url, next_link_tag.get('href'))
            time.sleep(1) # Be polite xD
        else:
            current_url = None
            print("No more pages found.")

    max_timestamp = image_count - 1 if image_count > 0 else 0
    print(f"Scraping complete. Processed {image_count} total images, saved {saved_count} frames.")
    return max_timestamp