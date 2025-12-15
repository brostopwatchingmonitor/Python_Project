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

    async function handleDownload(specificUrl = null) {
        // If specificUrl is provided (e.g. from search result), use that.
        // Otherwise use the input value.
        let isSearch = false;
        let inputValue = videoUrlInput.value.trim();

        // If triggered from button with specific URL
        if (typeof specificUrl === 'string') {
            inputValue = specificUrl;
        } else {
            // Check if input is a URL or a search query
            const urlRegex = /^(http|https):\/\/[^ "]+$/;
            if (inputValue && !urlRegex.test(inputValue)) {
                isSearch = true;
            }
        }

        if (!inputValue) {
            showMessage('Please enter a URL or search query.', 'error');
            return;
        }

        // Reset UI
        showMessage('');
        resultArea.classList.add('hidden');
        document.getElementById('searchResults').classList.add('hidden');
        loading.classList.remove('hidden');
        downloadBtn.disabled = true;

        try {
            let endpoint = '/download';
            let body = { url: inputValue };

            if (isSearch) {
                endpoint = '/search';
                body = { query: inputValue };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch info.');
            }

            // Success
            if (isSearch) {
                displaySearchResults(data.results);
            } else {
                displayResult(data);
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message, 'error');
        } finally {
            loading.classList.add('hidden');
            downloadBtn.disabled = false;
        }
    }

    async function handleMp3Download(urlOrEvent) {
        let urlToCheck = videoUrlInput.value.trim();
        let btn = null;

        // Handle arguments: could be URL string or Event object
        if (typeof urlOrEvent === 'string') {
            urlToCheck = urlOrEvent;
        } else if (urlOrEvent && urlOrEvent.target) {
            // It's an event (from main button if we had one, though main mp3 button logic isn't wired this way yet)
            // But for search results we pass the URL string, so we need a way to pass the button too.
            // We'll update the caller to pass (url, btnElement)
        }

        // Overload handling: (url, btnElement)
        if (arguments.length === 2) {
            urlToCheck = arguments[0];
            btn = arguments[1];
        }

        if (!urlToCheck) {
            showMessage('URL is missing.', 'error');
            return;
        }

        if (btn) setButtonLoading(btn, true);
        else showMessage('Checking system requirements and converting to MP3...', 'info');

        try {
            const response = await fetch('/download_mp3', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: urlToCheck })
            });

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'MP3 download failed.');
                }
                console.log('Received JSON response:', data);
            } else {
                if (!response.ok) {
                    throw new Error('Download failed with status: ' + response.status);
                }

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;

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

                if (!btn) showMessage('Download started successfully!', 'success');
            }

        } catch (error) {
            console.error('MP3 Error:', error);
            if (!btn) showMessage(error.message, 'error');
            else alert("Error: " + error.message); // Fallback for card view
        } finally {
            if (btn) setButtonLoading(btn, false);
        }
    }

    async function handleVideoDownload(url, btn) {
        if (btn) setButtonLoading(btn, true);

        try {
            // 1. Fetch video info to get the direct URL
            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get video link.');
            }

            if (!data.video_url) {
                throw new Error('No direct video link found.');
            }

            // 2. Trigger download
            const a = document.createElement('a');
            a.href = data.video_url;
            a.target = '_blank'; // Direct links often open in new tab or download
            // Note: Programmatic download of cross-origin URL is restricted by browsers 
            // (can't force 'download' attribute), but opening it usually triggers player or download.
            // For better UX, we can try to stream it through backend, but direct link is what we have structure for.
            a.click();

        } catch (error) {
            console.error('Video Error:', error);
            alert("Error: " + error.message);
        } finally {
            if (btn) setButtonLoading(btn, false);
        }
    }

    function setButtonLoading(btn, isLoading) {
        if (isLoading) {
            btn.dataset.originalContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalContent) {
                btn.innerHTML = btn.dataset.originalContent;
            }
        }
    }

    function displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = ''; // Clear previous results

        if (!results || results.length === 0) {
            showMessage('No results found.', 'info');
            return;
        }

        results.forEach(video => {
            const card = document.createElement('div');
            card.className = 'search-card';

            // Format duration
            const durationText = video.duration ? formatDuration(video.duration) : 'N/A';

            card.innerHTML = `
                <div class="search-thumb-container">
                    <img class="search-thumb" src="${video.thumbnail || 'https://via.placeholder.com/300x169?text=No+Thumbnail'}" alt="Thumbnail">
                    <span class="search-duration">${durationText}</span>
                </div>
                <div class="search-content">
                    <h4 class="search-title" title="${video.title}">${video.title}</h4>
                    <p class="search-uploader"><i class="fas fa-user"></i> ${video.uploader || 'Unknown'}</p>
                    <div class="search-actions">
                         <button class="search-btn btn-dl-mp4" data-url="${video.video_url}">
                            <i class="fas fa-video"></i> MP4
                        </button>
                        <button class="search-btn btn-dl-mp3" data-url="${video.video_url}">
                            <i class="fas fa-music"></i> MP3
                        </button>
                    </div>
                </div>
            `;

            resultsContainer.appendChild(card);
        });

        // Add event listeners to new buttons
        resultsContainer.querySelectorAll('.btn-dl-mp4').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                // Pass button element for loading state
                handleVideoDownload(url, e.currentTarget);
            });
        });

        resultsContainer.querySelectorAll('.btn-dl-mp3').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                // Pass button element for loading state
                handleMp3Download(url, e.currentTarget);
            });
        });

        resultsContainer.classList.remove('hidden');
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
