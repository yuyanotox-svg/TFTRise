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

## Data Storage

The app still keeps account/profile session data in browser `localStorage`, but tournament operation data can be synced through Supabase.

To enable shared tournament data:

1. Add these Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Load `remote-sync.js` before `app.js` in `index.html`.
4. Redeploy the Vercel project.

Full production auth is still a next step: moving login/register/password reset from the local prototype to Supabase Auth.

## Local Preview

Open `index.html` directly, or run a local server:

```bash
python -m http.server 4175 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4175/
```
