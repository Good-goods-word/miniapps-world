
import os
import glob
import shutil
import tempfile
from urllib.parse import urlparse

from flask import Flask, request, jsonify, send_file
import yt_dlp

app = Flask(__name__)

ALLOWED_ORIGIN = "https://miniapps-world.lildavid5h.workers.dev"

ALLOWED_DOMAINS = (
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "instagram.com",
    "facebook.com",
    "fb.watch",
    "x.com",
    "twitter.com",
    "pinterest.com",
    "threads.net",
)

MAX_FILE_SIZE = 100 * 1024 * 1024


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def valid_media_url(value):
    try:
        parsed = urlparse(value)
        host = (parsed.hostname or "").lower()

        return (
            parsed.scheme == "https"
            and parsed.port in (None, 443)
            and not parsed.username
            and not parsed.password
            and any(
                host == domain or host.endswith("." + domain)
                for domain in ALLOWED_DOMAINS
            )
        )
    except ValueError:
        return False


@app.route("/")
def home():
    return jsonify({
        "name": "My Mini Apps Downloader",
        "status": "online"
    })


@app.route("/api/download", methods=["GET", "OPTIONS"])
def download():
    if request.method == "OPTIONS":
        return "", 204

    media_url = request.args.get("url", "").strip()

    if not valid_media_url(media_url):
        return jsonify({
            "error": "This platform or link is not supported."
        }), 400

    folder = tempfile.mkdtemp(prefix="miniapps_")

    try:
        options = {
            "format": "best[ext=mp4]/best",
            "outtmpl": os.path.join(folder, "%(id)s.%(ext)s"),
            "noplaylist": True,
            "max_filesize": MAX_FILE_SIZE,
            "socket_timeout": 20,
            "retries": 1,
            "quiet": True,
            "no_warnings": True,
        }

        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(media_url, download=True)
            file_path = ydl.prepare_filename(info)

        if not os.path.isfile(file_path):
            matches = glob.glob(os.path.join(folder, "*"))
            if not matches:
                raise Exception("No downloadable file was produced.")
            file_path = matches[0]

        if os.path.getsize(file_path) > MAX_FILE_SIZE:
            raise Exception("The file is larger than the 100 MB limit.")

        response = send_file(
            file_path,
            as_attachment=True,
            download_name=os.path.basename(file_path)
        )

        response.call_on_close(
            lambda: shutil.rmtree(folder, ignore_errors=True)
        )
        return response

    except Exception as error:
        print(f"Downloader error: {error}", flush=True)
        shutil.rmtree(folder, ignore_errors=True)
        return jsonify({
            "error": "Download failed. Check backend logs for details."
        }), 400


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
