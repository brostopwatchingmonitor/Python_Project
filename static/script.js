document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const downloadBtn = document.getElementById('downloadBtn');
    const messageArea = document.getElementById('messageArea');
    const loading = document.getElementById('loading');
    const resultArea = document.getElementById('resultArea');

    // Result Elements
    const thumbnail = document.getElementById('thumbnail');
    const videoTitle = document.getElementById('videoTitle');
    const platform = document.getElementById('platform');
    const duration = document.getElementById('duration');


    const downloadMp3Btn = document.getElementById('downloadMp3');

    downloadBtn.addEventListener('click', handleDownload);

    if (downloadMp3Btn) {
        downloadMp3Btn.addEventListener('click', handleMp3Download);
    }

    // Allow pressing Enter to search
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDownload();
    });

    async function handleDownload() {
        const url = videoUrlInput.value.trim();

        if (!url) {
            showMessage('Please enter a valid URL.', 'error');
            return;
        }

        // Reset UI
        showMessage('');
        resultArea.classList.add('hidden');
        loading.classList.remove('hidden');
        downloadBtn.disabled = true;

        try {
            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch video info.');
            }

            // Success
            displayResult(data);

        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message, 'error');
        } finally {
            loading.classList.add('hidden');
            downloadBtn.disabled = false;
        }
    }

    async function handleMp3Download() {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showMessage('URL is missing.', 'error');
            return;
        }

        showMessage('Checking system requirements and converting to MP3...', 'info');

        try {
            const response = await fetch('/download_mp3', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                // It's a JSON response, likely an error
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'MP3 download failed.');
                }
                // If for some reason it's JSON but ok (shouldn't happen for file download)
                console.log('Received JSON response:', data);
            } else {
                // It's a file (blob)
                if (!response.ok) {
                    throw new Error('Download failed with status: ' + response.status);
                }

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;

                // Try to get filename from Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'audio.mp3';
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (filenameMatch && filenameMatch.length > 1) {
                        filename = filenameMatch[1];
                    }
                }

                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);

                showMessage('Download started successfully!', 'success');
            }

        } catch (error) {
            console.error('MP3 Error:', error);
            showMessage(error.message, 'error');
        }
    }

    function displayResult(data) {
        console.log('Received data:', data);
        console.log('Video URL:', data.video_url);
        console.log('Audio URL:', data.audio_url);
        const downloadVideoBtn = document.getElementById('downloadVideo');
        const downloadAudioBtn = document.getElementById('downloadAudio');
        // downloadMp3Btn is already defined in outer scope

        console.log('Video Btn:', downloadVideoBtn, 'Audio Btn:', downloadAudioBtn);

        thumbnail.src = data.thumbnail || 'https://via.placeholder.com/640x360?text=No+Thumbnail';
        videoTitle.textContent = data.title;
        platform.textContent = data.platform;
        duration.textContent = data.duration ? formatDuration(data.duration) : 'Unknown';

        if (data.video_url) {
            downloadVideoBtn.href = data.video_url;
            downloadVideoBtn.classList.remove('hidden');
        } else {
            downloadVideoBtn.classList.add('hidden');
        }

        if (data.audio_url) {
            downloadAudioBtn.href = data.audio_url;
            downloadAudioBtn.classList.remove('hidden');
        } else {
            downloadAudioBtn.classList.add('hidden');
        }

        // Ensure MP3 button is visible when result is shown
        if (downloadMp3Btn) {
            downloadMp3Btn.classList.remove('hidden');
        }

        resultArea.classList.remove('hidden');
    }

    function showMessage(msg, type = 'info') {
        messageArea.innerHTML = '';
        if (!msg) return;

        const div = document.createElement('div');
        div.textContent = msg;
        if (type === 'error') div.className = 'error-msg';
        else if (type === 'success') div.className = 'success-msg'; // Add success style if needed
        else div.className = 'info-msg';

        messageArea.appendChild(div);
    }

    function formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
});
