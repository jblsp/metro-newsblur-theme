#!/usr/bin/env python3
"""Download NewsBlur's current public reference files into .cache/newsblur/.

Fetches CSS, JavaScript, and account backend source, and records source URLs and
the fetch time in sources.json. Uses curl for downloads; the cache is gitignored.
"""

import json
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        value = attrs.get("href" if tag == "link" else "src", "")
        url = urljoin("https://newsblur.com/", value)
        path = urlparse(url).path
        if urlparse(url).netloc != "newsblur.com":
            return
        if tag == "link" and path.startswith("/static/css/common") and path.endswith(".css"):
            self.urls["newsblur-upstream.css"] = url
        elif tag == "script" and path.startswith("/static/js/common") and path.endswith(".js"):
            self.urls["newsblur-upstream.js"] = url


def download(url):
    return subprocess.run(
        ["curl", "--fail", "--silent", "--show-error", "--location", "--max-time", "60", url],
        check=True, stdout=subprocess.PIPE,
    ).stdout


def main():
    root = Path(__file__).resolve().parent.parent
    output = root / ".cache" / "newsblur"
    parser = Assets()
    parser.feed(download("https://newsblur.com/").decode("utf-8"))
    if len(parser.urls) != 2:
        raise SystemExit("Could not locate NewsBlur's common CSS and JavaScript bundles.")
    sources = {
        **parser.urls,
        "profile-forms.py": "https://raw.githubusercontent.com/samuelclay/NewsBlur/master/apps/profile/forms.py",
        "profile-views.py": "https://raw.githubusercontent.com/samuelclay/NewsBlur/master/apps/profile/views.py",
    }
    # Download everything before replacing an existing local reference set.
    files = {name: download(url) for name, url in sources.items()}
    output.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (output / name).write_bytes(content)
        print(f"Fetched .cache/newsblur/{name}")
    manifest = {"fetched_at": datetime.now(timezone.utc).isoformat(), "sources": sources}
    (output / "sources.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
