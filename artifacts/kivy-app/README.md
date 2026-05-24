# DeutschKarten — Kivy Python Desktop App

A German vocabulary flashcard app built with Kivy, connecting to the DeutschKarten API server.

## Features

- **Dashboard** — CEFR level progress bars (A1–C1), quick navigation
- **Browse** — Scrollable card list, filterable by level, colour-coded article genders
- **Study** — Flip-animation flashcards with Known / Unknown buttons
- **Daily Review** — Today's recommended card set, spaced-repetition style
- **Generate AI** — Create new flashcards by topic via the OpenAI-powered API
- **Pronunciation** — German text-to-speech via `pyttsx3`

## Article gender colours

| Article | Colour |
|---------|--------|
| der     | Blue   |
| die     | Red    |
| das     | Green  |

## Setup

### 1. Install Python 3.10+

Download from https://www.python.org/downloads/

### 2. Create a virtual environment (recommended)

```bash
python -m venv .venv
source .venv/bin/activate      # macOS / Linux
.venv\Scripts\activate         # Windows
```

### 3. Install system dependencies (Linux only)

```bash
sudo apt-get install -y \
    python3-dev build-essential git \
    libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
    libportmidi-dev libswscale-dev libavformat-dev libavcodec-dev \
    zlib1g-dev libgstreamer1.0 gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good
```

On **macOS** install via Homebrew:
```bash
brew install sdl2 sdl2_image sdl2_ttf sdl2_mixer
```

On **Windows** no extra step needed — Kivy ships pre-built wheels.

### 4. Install Python packages

```bash
pip install -r requirements.txt
```

### 5. Configure the API server URL

Edit `config.json` and set `api_base_url` to point at your running DeutschKarten API server:

```json
{
  "api_base_url": "http://localhost:80/api"
}
```

If you are running the full project locally (from this repo), the API server is at `http://localhost:8080/api`, so update accordingly:

```json
{
  "api_base_url": "http://localhost:8080/api"
}
```

### 6. Run the app

```bash
python main.py
```

## Project structure

```
kivy-app/
├── main.py              Entry point — creates the App and ScreenManager
├── api_client.py        Async (threaded) HTTP client for the REST API
├── utils.py             Colour constants and helpers
├── config.json          API base URL configuration
├── requirements.txt     Python dependencies
├── screens/
│   ├── dashboard.py     Home screen with level progress cards
│   ├── browse.py        Browse & filter all flashcards
│   ├── study.py         Flip-card study session per level
│   ├── daily.py         Daily review session
│   └── generate.py      AI card generation form
└── components/          (reserved for shared widgets)
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: kivy` | Run `pip install kivy` inside your venv |
| Blank window on Linux | Install SDL2 system packages (see step 3) |
| API connection refused | Check `config.json` URL and ensure the API server is running |
| No German TTS voice | Install a German voice in your OS voice settings; `pyttsx3` uses system TTS |
