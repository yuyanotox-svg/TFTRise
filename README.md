# TFTRise

TFT tournament operation app prototype.

## Features

- Account-style login/register UI
- Tournament creation and admin controls
- Entry, check-in, and cancellation rules
- 6-game total point format
- One-day elimination format
- TPC-style multi-day format
- Staged lobby generation
- Player lobby/my page views
- Result reporting by screenshot OCR or manual fallback
- Overall standings with tiebreakers
- Past tournament archive
- Local JSON export/import

## Current Data Storage

This prototype stores data in browser `localStorage`.

For production release, the next step is moving accounts, tournaments, entries, lobbies, reports, and standings to a shared backend such as Supabase.

## Local Preview

Open `index.html` directly, or run a local server:

```bash
python -m http.server 4175 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4175/
```
