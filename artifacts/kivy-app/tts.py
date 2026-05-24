"""Offline German text-to-speech helper.

Runs pyttsx3 on a dedicated worker thread so the Kivy UI thread is never blocked
by the SAPI5/NSSpeechSynthesizer/espeak driver (which is what causes the
"button does nothing" symptom on Windows in particular).

Usage:
    from tts import speak, last_error
    speak("Hallo Welt")
    err = last_error()  # returns None or an error string
"""

from __future__ import annotations
import queue
import threading
from kivy.logger import Logger

_q: "queue.Queue[str | None]" = queue.Queue()
_worker: threading.Thread | None = None
_last_error: str | None = None
_lock = threading.Lock()


def _set_error(msg: str | None) -> None:
    global _last_error
    with _lock:
        _last_error = msg


def last_error() -> str | None:
    with _lock:
        return _last_error


def _pick_german_voice(engine) -> None:
    try:
        for v in engine.getProperty('voices'):
            name = (getattr(v, 'name', '') or '').lower()
            vid  = (getattr(v, 'id', '') or '').lower()
            langs = getattr(v, 'languages', []) or []
            lang_str = ' '.join(
                (l.decode('utf-8', 'ignore') if isinstance(l, (bytes, bytearray)) else str(l))
                for l in langs
            ).lower()
            if ('german' in name
                    or 'deutsch' in name
                    or 'de-de' in vid
                    or 'de_de' in vid
                    or vid.endswith('\\de')
                    or 'de-de' in lang_str
                    or lang_str.startswith('de')):
                engine.setProperty('voice', v.id)
                Logger.info(f'TTS: selected German voice: {v.name} ({v.id})')
                return
        Logger.warning('TTS: no German voice found, using system default.')
    except Exception as e:
        Logger.warning(f'TTS: voice enumeration failed: {e}')


def _worker_loop() -> None:
    try:
        import pyttsx3
    except Exception as e:
        _set_error(f'pyttsx3 not installed: {e}. Run: pip install pyttsx3')
        Logger.error(f'TTS: import failed — {e}')
        return

    engine = None
    while True:
        text = _q.get()
        if text is None:
            break
        if not text.strip():
            continue
        try:
            # Re-init each call on Windows SAPI5 to avoid the known
            # "second runAndWait does nothing" bug.
            engine = pyttsx3.init()
            _pick_german_voice(engine)
            engine.setProperty('rate', 130)
            engine.say(text)
            engine.runAndWait()
            try:
                engine.stop()
            except Exception:
                pass
            engine = None
            _set_error(None)
        except Exception as e:
            _set_error(f'TTS failed: {e}')
            Logger.error(f'TTS: playback failed — {e}')
            engine = None


def _ensure_worker() -> None:
    global _worker
    if _worker is None or not _worker.is_alive():
        _worker = threading.Thread(target=_worker_loop, name='tts-worker', daemon=True)
        _worker.start()


def speak(text: str) -> None:
    """Queue text to be spoken on the TTS worker thread (non-blocking)."""
    if not text:
        return
    _ensure_worker()
    _q.put(text)
