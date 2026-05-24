import json
import threading
from urllib import request as urllib_request
from urllib.error import HTTPError
from urllib.parse import urlencode
import os

API_BASE_URL = "http://localhost:80/api"


def load_config():
    global API_BASE_URL
    try:
        config_path = os.path.join(os.path.dirname(__file__), "config.json")
        if os.path.exists(config_path):
            with open(config_path) as f:
                cfg = json.load(f)
                API_BASE_URL = cfg.get("api_base_url", API_BASE_URL)
    except Exception:
        pass


load_config()


def _fetch(path, method="GET", body=None, callback=None, error_callback=None):
    def _run():
        try:
            url = API_BASE_URL + path
            data = json.dumps(body).encode("utf-8") if body is not None else None
            req = urllib_request.Request(url, data=data, method=method)
            req.add_header("Content-Type", "application/json")
            req.add_header("Accept", "application/json")
            try:
                import auth as _auth
                tok = _auth.get_token()
                if tok:
                    req.add_header("Authorization", f"Bearer {tok}")
            except Exception:
                pass
            with urllib_request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                if callback:
                    from kivy.clock import Clock
                    Clock.schedule_once(lambda dt: callback(result), 0)
        except HTTPError as e:
            msg = f"HTTP {e.code}"
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", msg)
            except Exception:
                pass
            if error_callback:
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: error_callback(msg), 0)
        except Exception as exc:
            if error_callback:
                from kivy.clock import Clock
                err_msg = str(exc)
                Clock.schedule_once(lambda dt: error_callback(err_msg), 0)

    threading.Thread(target=_run, daemon=True).start()


def list_flashcards(level=None, category=None, limit=50, offset=0,
                    callback=None, error_callback=None):
    params = {"limit": limit, "offset": offset}
    if level:
        params["level"] = level
    if category:
        params["category"] = category
    _fetch(f"/flashcards?{urlencode(params)}", callback=callback,
           error_callback=error_callback)


def get_daily_flashcards(level=None, callback=None, error_callback=None):
    params = {}
    if level:
        params["level"] = level
    q = f"?{urlencode(params)}" if params else ""
    _fetch(f"/flashcards/daily{q}", callback=callback,
           error_callback=error_callback)


def get_stats(callback=None, error_callback=None):
    _fetch("/flashcards/stats", callback=callback,
           error_callback=error_callback)


def update_progress(card_id, known, callback=None, error_callback=None):
    _fetch(f"/flashcards/{card_id}/progress", method="PATCH",
           body={"known": known}, callback=callback,
           error_callback=error_callback)


def generate_flashcards(level, category=None, count=10,
                        callback=None, error_callback=None):
    body = {"level": level, "count": count}
    if category:
        body["category"] = category
    _fetch("/flashcards/generate", method="POST", body=body,
           callback=callback, error_callback=error_callback)
