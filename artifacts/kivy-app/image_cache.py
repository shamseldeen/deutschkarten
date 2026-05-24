import os
import threading
import hashlib

CACHE_DIR = os.path.join(os.path.expanduser("~"), ".deutschkarten", "images")


def _cache_path(url):
    name = hashlib.md5(url.encode()).hexdigest() + ".jpg"
    return os.path.join(CACHE_DIR, name)


def get_cached_path(url):
    """Return local cached path if already downloaded, else None."""
    if not url:
        return None
    p = _cache_path(url)
    return p if os.path.exists(p) else None


def fetch_image(url, on_done):
    """Download image to cache asynchronously. Calls on_done(local_path) or on_done(None)."""
    if not url:
        from kivy.clock import Clock
        Clock.schedule_once(lambda dt: on_done(None), 0)
        return

    cached = get_cached_path(url)
    if cached:
        from kivy.clock import Clock
        Clock.schedule_once(lambda dt: on_done(cached), 0)
        return

    def _run():
        try:
            os.makedirs(CACHE_DIR, exist_ok=True)
            from urllib import request as urllib_request
            req = urllib_request.Request(url)
            req.add_header("User-Agent", "DeutschKarten/1.0")
            with urllib_request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            path = _cache_path(url)
            with open(path, "wb") as f:
                f.write(data)
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: on_done(path), 0)
        except Exception:
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: on_done(None), 0)

    threading.Thread(target=_run, daemon=True).start()
