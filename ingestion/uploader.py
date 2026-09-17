import os
import boto3
from botocore.config import Config
from botocore.exceptions import NoCredentialsError, ClientError

def upload_frames_to_r2(frames_dir, bucket_name, movie_id):
    """
    Upload extracted frames to Cloudflare R2 bucket.
    Assumes AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and R2_ENDPOINT_URL are in environment variables.
    """
    access_key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    endpoint_url = os.environ.get('R2_ENDPOINT_URL')
    
    if not all([access_key, secret_key, endpoint_url]):
        print("Error: Missing R2 credentials in environment variables.")
        return False
        
    s3 = boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4')
    )
    
    # Upload to a specific dir based on the movie_id
    prefix = f"movies/{movie_id}/"
    
    success_count = 0
    
    for filename in os.listdir(frames_dir):
        if not (filename.endswith('.jpg') or filename.endswith('.webp') or filename.endswith('.png')):
            continue
            
        filepath = os.path.join(frames_dir, filename)
        object_key = prefix + filename
        
        # Set content type and cache control headers
        content_type = 'image/jpeg'
        if filename.endswith('.webp'):
            content_type = 'image/webp'
        elif filename.endswith('.png'):
            content_type = 'image/png'
            
        extra_args = {
            'ContentType': content_type,
            'CacheControl': 'public, max-age=31536000, immutable' # Cache for 1 year
        }
        
        try:
            print(f"Uploading {filename} to {object_key}...")
            s3.upload_file(filepath, bucket_name, object_key, ExtraArgs=extra_args)
            success_count += 1
        except NoCredentialsError:
            print("Credentials not available.")
            return False
        except ClientError as e:
            print(f"Failed to upload {filename}: {e}")
            
    print(f"Upload complete. Successfully uploaded {success_count} frames to R2.")
    return True
