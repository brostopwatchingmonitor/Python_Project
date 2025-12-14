from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import logging
import traceback
import sys
import shutil
import os
import tempfile
import io

class DummyLogger:
    def debug(self, msg):
        pass

    def warning(self, msg):
        pass

    def error(self, msg):
        pass

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Advanced Logging Configuration ---
# Create a custom formatter that includes timestamp, log level, and message
log_formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)

# Console Handler (prints to terminal)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.DEBUG)

# File Handler (saves logs to a file)
file_handler = logging.FileHandler('app.log')
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.DEBUG)

# Apply handlers to the app logger
app.logger.addHandler(console_handler)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.DEBUG)

# Also configure the root logger to catch everything else
logging.getLogger().addHandler(console_handler)
logging.getLogger().addHandler(file_handler)
logging.getLogger().setLevel(logging.INFO)

def get_video_info(url):
    """
    Helper function to extract video info using yt-dlp.
    """
    ydl_opts = {
        'format': 'best',
        'quiet': True,
        'no_warnings': True,
        'forceurl': True,
        'noplaylist': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }

    try:
        app.logger.info(f"Processing URL: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            app.logger.info(f"Successfully extracted info for: {info.get('title', 'Unknown')}")
            
            formats = info.get('formats', [])
            app.logger.info(f"Found {len(formats)} formats")

            # --- Video Selection Logic ---
            # Priority: progressive mp4 (http/https) > any video with audio
            video_url = None
            
            # Filter for progressive streams (direct download links)
            # We exclude 'm3u8', 'm3u8_native', 'http_dash_segments' which are streaming manifests
            progressive_formats = [
                f for f in formats 
                if f.get('protocol') in ['https', 'http'] 
                and f.get('vcodec') != 'none' 
                and f.get('acodec') != 'none'
            ]
            
            # 1. Try to find mp4 progressive video
            mp4_progressive = [f for f in progressive_formats if f.get('ext') == 'mp4']
            if mp4_progressive:
                best_video = max(mp4_progressive, key=lambda f: f.get('height', 0) or 0)
                video_url = best_video.get('url')
                app.logger.info(f"Selected Progressive MP4 video: {best_video.get('format_id')} ({best_video.get('height')}p)")
            
            # 2. Fallback: Any progressive video
            if not video_url and progressive_formats:
                best_video = max(progressive_formats, key=lambda f: f.get('height', 0) or 0)
                video_url = best_video.get('url')
                app.logger.info(f"Selected fallback progressive video: {best_video.get('format_id')} ({best_video.get('height')}p)")

            # 3. Last Resort: Generic url field (might be manifest, but better than nothing if no progressive found)
            if not video_url:
                video_url = info.get('url')
                app.logger.info("Selected generic fallback URL (No progressive stream found)")

            # --- Audio Selection Logic ---
            # Priority: m4a > any audio-only
            audio_url = None
            
            # 1. Try to find m4a audio only
            m4a_audio = [f for f in formats if f.get('ext') == 'm4a' and f.get('vcodec') == 'none' and f.get('acodec') != 'none']
            if m4a_audio:
                best_audio = max(m4a_audio, key=lambda f: f.get('abr', 0) or 0)
                audio_url = best_audio.get('url')
                app.logger.info(f"Selected M4A audio: {best_audio.get('format_id')} ({best_audio.get('abr')}kbps)")

            # 2. Fallback: Any audio only
            if not audio_url:
                any_audio = [f for f in formats if f.get('vcodec') == 'none' and f.get('acodec') != 'none']
                if any_audio:
                    best_audio = max(any_audio, key=lambda f: f.get('abr', 0) or 0)
                    audio_url = best_audio.get('url')
                    app.logger.info(f"Selected fallback audio: {best_audio.get('format_id')} ({best_audio.get('abr')}kbps)")
            
            return {
                'status': 'success',
                'title': info.get('title', 'Video without title'),
                'thumbnail': info.get('thumbnail', ''),
                'video_url': video_url,
                'audio_url': audio_url,
                'ext': info.get('ext', 'mp4'),
                'platform': info.get('extractor_key', 'Unknown'),
                'duration': info.get('duration', 0)
            }
            
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        app.logger.error(f"yt-dlp DownloadError: {error_msg}")
        # Log the full traceback for debugging
        app.logger.debug(traceback.format_exc())
        return {'status': 'error', 'message': 'Video not found, private, or invalid URL.', 'debug_error': error_msg}
    except Exception as e:
        error_msg = str(e)
        app.logger.error(f"General Error: {error_msg}")
        app.logger.critical(traceback.format_exc())
        return {'status': 'error', 'message': 'Internal Server Error.', 'debug_error': error_msg}

@app.route('/')
def index():
    """Renders the main UI page."""
    app.logger.info("Serving index page")
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download_video():
    """API Endpoint to process URL."""
    try:
        data = request.get_json()
        
        if not data:
            app.logger.warning("Received request with no JSON data")
            return jsonify({'error': 'Request body must be JSON'}), 400
            
        if 'url' not in data:
            app.logger.warning("Received request missing 'url' parameter")
            return jsonify({'error': 'URL parameter is required'}), 400

        url = data['url']
        app.logger.info(f"Received download request for: {url}")
        
        if not url.startswith(('http://', 'https://')):
            app.logger.warning(f"Invalid URL format: {url}")
            return jsonify({'error': 'Invalid URL format. Use http:// or https://'}), 400

        result = get_video_info(url)

        if result['status'] == 'error':
            app.logger.error(f"Failed to process URL: {url} - Reason: {result['message']}")
            return jsonify({'error': result['message'], 'details': result.get('debug_error')}), 400

        return jsonify(result)

    except Exception as e:
        app.logger.exception("Unhandled exception in /download endpoint")
        return jsonify({'error': 'An unexpected error occurred on the server.'}), 500

@app.route('/download_mp3', methods=['POST'])
def download_mp3():
    """API Endpoint to download audio as MP3 (requires FFmpeg)."""
    try:
        # 1. Add local bin to PATH
        base_dir = os.path.dirname(os.path.abspath(__file__))
        bin_dir = os.path.join(base_dir, 'bin')
        if os.path.exists(bin_dir):
            os.environ["PATH"] += os.pathsep + bin_dir
            app.logger.info(f"Added {bin_dir} to PATH")

        # 2. Check for FFmpeg again
        if not shutil.which('ffmpeg'):
            return jsonify({
                'error': 'FFmpeg is not installed on this server. Please install FFmpeg to enable MP3 conversion.',
                'code': 'FFMPEG_MISSING'
            }), 500

        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL parameter is required'}), 400

        app.logger.info(f"Processing MP3 download for: {url}")

        # 3. Create a temporary directory for the download
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Configure yt-dlp for MP3 conversion
            # Use a fixed filename 'download' to avoid invalid characters in path
            # We will rename it back to the title when sending to user
            ydl_opts = {
                'format': 'bestaudio/best',
                'logger': DummyLogger(), # Silence all output
                'noprogress': True,      # Disable progress bars
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'outtmpl': os.path.join(temp_dir, 'download.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'ffmpeg_location': bin_dir if os.path.exists(bin_dir) else None
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                
                # The file is expected to be 'download.mp3' in temp_dir
                mp3_filename = os.path.join(temp_dir, 'download.mp3')
                
                if not os.path.exists(mp3_filename):
                    app.logger.error(f"Converted file not found: {mp3_filename}")
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    return jsonify({'error': 'Conversion failed.'}), 500

                # Read into memory
                with open(mp3_filename, 'rb') as f:
                    file_data = io.BytesIO(f.read())
                
                # Clean up immediately
                shutil.rmtree(temp_dir, ignore_errors=True)
                app.logger.info(f"Cleaned up temp dir: {temp_dir}")
                
                # Determine output filename
                title = info.get('title', 'audio')
                download_name = f"{title}.mp3"
                
                # Sanitize filename for HTTP header if needed (flask usually handles this, 
                # but good to be careful if we wanted to be strict. For now letting flask handle quoting)
                
                app.logger.info(f"Serving file from memory: {download_name}")
                
                return send_file(
                    file_data,
                    as_attachment=True,
                    download_name=download_name,
                    mimetype='audio/mpeg'
                )

        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise e

    except Exception as e:
        app.logger.exception("Unhandled exception in /download_mp3 endpoint")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server...")
    print("Logs will be saved to 'app.log' and printed to console.")
    app.run(debug=True, port=5000)