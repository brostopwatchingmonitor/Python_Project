# FlashDown - Universal Video Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.x](https://img.shields.io/badge/python-3.x-blue.svg)](https://www.python.org/downloads/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

**FlashDown** is a powerful, modern Flask-based web application designed to seamlessly download videos and extract audio from major platforms like YouTube, Instagram, Facebook, and more. Built with the robust `yt-dlp` library, it offers a clean interface and fast processing.

---

## 🚀 Features

*   **Universal Platform Support**: Compatible with hundreds of sites supported by `yt-dlp`.
*   **Smart Quality Selection**: Automatically retrieves the best progressive MP4 video quality.
*   **Direct Download Links**: Generates instant direct links for ease of use.
*   **Audio Extraction**: Option to download raw M4A audio or convert to MP3 server-side.
*   **Robust MP3 Conversion**: Integrated FFmpeg support for high-quality audio conversion.
*   **Modern UI/UX**: responsive design built with HTML5, CSS3, and JavaScript.
*   **Real-time Logging**: Comprehensive system logging for easy debugging.

## 📋 Prerequisites

Ensure you have the following installed on your system:

*   **Python 3.8+**: [Download Python](https://www.python.org/downloads/)
*   **FFmpeg**: Essential for audio conversion features.
    *   **Windows**: Download static builds from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or [BtbN](https://github.com/BtbN/FFmpeg-Builds/releases). Place `ffmpeg.exe` and `ffprobe.exe` in the `bin/` directory of the project, or add them to your system PATH.
    *   **Linux**: `sudo apt install ffmpeg`
    *   **macOS**: `brew install ffmpeg`

## 🛠️ Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/flashdown.git
    cd flashdown
    ```

2.  **Set up Virtual Environment**
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

## 💻 Usage

1.  **Start the Application**
    ```bash
    python app.py
    ```

2.  **Open in Browser**
    Navigate to `http://localhost:5000`.

3.  **Download Media**
    *   Paste the video URL.
    *   Click **Download**.
    *   Select your format: **Video (MP4)**, **Audio (M4A)**, or **Audio (MP3)**.

## 📂 Project Structure

```text
├── bin/                # Local FFmpeg binaries (ignored by git)
├── static/             # Frontend assets (CSS, JS)
├── templates/          # HTML templates
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── .gitignore          # Git exclusion rules
├── LICENSE             # MIT License
├── CONTRIBUTING.md     # Contribution guidelines
├── CODE_OF_CONDUCT.md  # Community standards
└── README.md           # Project documentation
```

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 📄 Code of Conduct

We are committed to providing a friendly, safe and welcoming environment for all. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## 📝 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---
*Built with ❤️ using Flask and yt-dlp.*
