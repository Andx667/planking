# 🏋️ Plank Tracker

A progressive web app to track your planking exercises. Built with plain HTML, CSS, and JavaScript — no frameworks, no dependencies.

## Features

- **One-tap timer** — Start and stop with a single button press. Displays minutes, seconds, and centiseconds with an animated progress ring.
- **Exercise history** — All sessions are saved locally and grouped by day, showing time-of-day and duration.
- **Daily stats** — See today's session count, your all-time personal best, and total sessions at a glance.
- **Daily chart** — A bar chart showing best and total plank time for each of the last 14 days.
- **Offline support** — Service Worker caches all assets so the app works without an internet connection.
- **Installable** — Includes a web app manifest so it can be added to your home screen as a standalone app.

## Getting Started

Serve the project folder with any static HTTP server. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
├── index.html        # App shell
├── style.css         # Styles (dark theme, responsive)
├── app.js            # Timer, history, chart, persistence
├── sw.js             # Service Worker for offline caching
├── manifest.json     # PWA manifest
└── icons/            # App icons (192px & 512px)
```

## Data Storage

All exercise data is stored in the browser's `localStorage`. No server or account required.
