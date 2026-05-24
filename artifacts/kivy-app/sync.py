"""Sync local SQLite progress with the API server when signed in."""

import threading
import json
from urllib import request as urllib_request
from urllib.parse import urlencode

import api_client
import auth
import local_storage


def _authed_request(path, method="GET", body=None):
    url = api_client.API_BASE_URL + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib_request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    token = auth.get_token()
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib_request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def push_local_progress(on_done=None):
    """Push every locally-known card to the server so progress carries over."""

    def _run():
        pushed = 0
        try:
            cards = local_storage.get_cards(limit=10_000)["items"]
            for card in cards:
                if not card.get("known"):
                    continue
                try:
                    _authed_request(
                        f"/flashcards/{card['id']}/progress",
                        method="PATCH",
                        body={"known": True},
                    )
                    pushed += 1
                except Exception:
                    continue
        finally:
            if on_done:
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: on_done(pushed), 0)

    threading.Thread(target=_run, daemon=True).start()


def pull_remote_progress(on_done=None):
    """Pull per-level stats from the server and mark cards known locally."""

    def _run():
        marked = 0
        try:
            for level in ["A1", "A2", "B1", "B2", "C1"]:
                params = urlencode({"level": level, "limit": 500})
                data = _authed_request(f"/flashcards?{params}")
                for card in data.get("items", []):
                    local_storage.upsert_api_card(card)
                    if card.get("known"):
                        local_storage.update_progress(card["id"], True)
                        marked += 1
        except Exception:
            pass
        finally:
            if on_done:
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: on_done(marked), 0)

    threading.Thread(target=_run, daemon=True).start()


def full_sync(on_done=None):
    """Push then pull; call after sign-in."""

    def _after_push(_pushed):
        pull_remote_progress(on_done=on_done)

    push_local_progress(on_done=_after_push)


