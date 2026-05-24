import threading
import json
import os

_online = False
_listeners = []
_checked = False

API_BASE_URL = "http://localhost:80/api"


def _load_config():
    global API_BASE_URL
    try:
        path = os.path.join(os.path.dirname(__file__), "config.json")
        if os.path.exists(path):
            with open(path) as f:
                API_BASE_URL = json.load(f).get("api_base_url", API_BASE_URL)
    except Exception:
        pass


_load_config()


def is_online():
    return _online


def add_listener(fn):
    _listeners.append(fn)


def _notify(status):
    global _online
    _online = status
    from kivy.clock import Clock
    for fn in _listeners:
        Clock.schedule_once(lambda dt, f=fn, s=status: f(s), 0)


def check_connectivity(callback=None):
    def _run():
        global _checked
        try:
            from urllib import request as urllib_request
            urllib_request.urlopen(API_BASE_URL + "/healthz", timeout=4)
            _notify(True)
        except Exception:
            _notify(False)
        _checked = True
        if callback:
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: callback(_online), 0)

    threading.Thread(target=_run, daemon=True).start()


def sync_online_cards(on_done=None):
    """Fetch all cards from API and store them locally."""
    def _run():
        try:
            from urllib import request as urllib_request
            from urllib.parse import urlencode
            import local_storage
            for level in ["A1", "A2", "B1", "B2", "C1"]:
                params = urlencode({"level": level, "limit": 100})
                req = urllib_request.Request(API_BASE_URL + f"/flashcards?{params}")
                req.add_header("Accept", "application/json")
                with urllib_request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    for card in data.get("items", []):
                        local_storage.upsert_api_card(card)
            if on_done:
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: on_done(True), 0)
        except Exception:
            if on_done:
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: on_done(False), 0)

    threading.Thread(target=_run, daemon=True).start()
