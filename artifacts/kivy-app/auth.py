"""Auth state + Clerk sign-in/sign-up via our API server.

Stores `{ token, userId, email, firstName, lastName }` in
~/.deutschkarten/auth.json. Token is a Clerk session JWT that the API
server's clerkMiddleware will validate on every request.
"""

import json
import os
import threading
from urllib import request as urllib_request
from urllib.error import HTTPError

_AUTH_DIR = os.path.join(os.path.expanduser("~"), ".deutschkarten")
_AUTH_PATH = os.path.join(_AUTH_DIR, "auth.json")

_lock = threading.Lock()
_state = {
    "token": None,
    "userId": None,
    "email": None,
    "firstName": None,
    "lastName": None,
}
_listeners = []


def _set_state(updates):
    with _lock:
        for k in _state:
            if k in updates:
                _state[k] = updates[k]


def _clear_state():
    with _lock:
        for k in _state:
            _state[k] = None


def _notify():
    from kivy.clock import Clock
    with _lock:
        snapshot = dict(_state)
    for fn in list(_listeners):
        Clock.schedule_once(lambda dt, f=fn, s=snapshot: f(s), 0)


def add_listener(fn):
    _listeners.append(fn)


def load():
    try:
        if os.path.exists(_AUTH_PATH):
            with open(_AUTH_PATH) as f:
                _set_state(json.load(f))
    except Exception:
        pass


def save():
    try:
        os.makedirs(_AUTH_DIR, exist_ok=True)
        with _lock:
            snapshot = dict(_state)
        with open(_AUTH_PATH, "w") as f:
            json.dump(snapshot, f)
        try:
            os.chmod(_AUTH_PATH, 0o600)
        except Exception:
            pass
    except Exception:
        pass


def is_signed_in():
    with _lock:
        return bool(_state.get("token"))


def current():
    with _lock:
        return dict(_state)


def get_token():
    with _lock:
        return _state.get("token")


def sign_out():
    _clear_state()
    try:
        if os.path.exists(_AUTH_PATH):
            os.remove(_AUTH_PATH)
    except Exception:
        pass
    _notify()


def _api_call(path, body, on_ok, on_err):
    import api_client

    def _run():
        try:
            data = json.dumps(body).encode("utf-8")
            req = urllib_request.Request(
                api_client.API_BASE_URL + path, data=data, method="POST"
            )
            req.add_header("Content-Type", "application/json")
            req.add_header("Accept", "application/json")
            with urllib_request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            _set_state(result)
            save()
            _notify()
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: on_ok(result), 0)
        except HTTPError as e:
            msg = f"HTTP {e.code}"
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", msg)
            except Exception:
                pass
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: on_err(msg), 0)
        except Exception as exc:
            from kivy.clock import Clock
            err_msg = str(exc)
            Clock.schedule_once(lambda dt: on_err(err_msg), 0)

    threading.Thread(target=_run, daemon=True).start()


def sign_in(email, password, on_ok, on_err):
    _api_call("/auth/sign-in", {"email": email, "password": password}, on_ok, on_err)


def sign_up(email, password, on_ok, on_err, first_name=None, last_name=None):
    body = {"email": email, "password": password}
    if first_name:
        body["firstName"] = first_name
    if last_name:
        body["lastName"] = last_name
    _api_call("/auth/sign-up", body, on_ok, on_err)
