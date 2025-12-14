import os
import urllib.request
import zipfile
import shutil
import sys

def install_ffmpeg():
    # Define paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bin_dir = os.path.join(base_dir, 'bin')
    temp_zip = os.path.join(base_dir, 'ffmpeg.zip')
    
    # URL for a reliable static build of FFmpeg (gyan.dev or similar reliable source)
    # Using a specific version to ensure stability.
    ffmpeg_url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

    print(f"Base directory: {base_dir}")
    print(f"Target bin directory: {bin_dir}")

    # Create bin directory if it doesn't exist
    if not os.path.exists(bin_dir):
        os.makedirs(bin_dir)
        print(f"Created directory: {bin_dir}")

    # Check if ffmpeg already exists
    if os.path.exists(os.path.join(bin_dir, 'ffmpeg.exe')):
        print("FFmpeg already installed.")
        return

    print(f"Downloading FFmpeg from {ffmpeg_url}...")
    try:
        urllib.request.urlretrieve(ffmpeg_url, temp_zip)
        print("Download complete.")

        print("Extracting FFmpeg...")
        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
            # Find the ffmpeg.exe and ffprobe.exe paths inside the zip
            ffmpeg_path = None
            ffprobe_path = None
            
            for file in zip_ref.namelist():
                if file.endswith('bin/ffmpeg.exe'):
                    ffmpeg_path = file
                elif file.endswith('bin/ffprobe.exe'):
                    ffprobe_path = file
            
            if not ffmpeg_path or not ffprobe_path:
                print("Error: Could not find ffmpeg.exe or ffprobe.exe in the zip file.")
                return

            # Extract specific files to bin_dir
            # We read the bytes and write them to the target location to avoid directory nesting
            with zip_ref.open(ffmpeg_path) as source, open(os.path.join(bin_dir, 'ffmpeg.exe'), 'wb') as target:
                shutil.copyfileobj(source, target)
            
            with zip_ref.open(ffprobe_path) as source, open(os.path.join(bin_dir, 'ffprobe.exe'), 'wb') as target:
                shutil.copyfileobj(source, target)
                
        print("Extraction complete.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Cleanup
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
            print("Cleaned up temporary zip file.")

if __name__ == "__main__":
    install_ffmpeg()
