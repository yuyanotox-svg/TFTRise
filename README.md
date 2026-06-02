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
- Automatic JSON backup before tournament delete/reset operations

## Release Roadmap

正式リリースまでの優先タスクは [`RELEASE_TASKS.md`](./RELEASE_TASKS.md) に整理しています。
まずは管理者権限、本番認証、Supabase権限、通し運用テスト、スマホ主要導線の安定化を優先します。

## Data Storage

The app still keeps account/profile session data in browser `localStorage`, but tournament operation data can be synced through Supabase.

To enable shared tournament data:

1. Add these Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PIN`
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Redeploy the Vercel project.

Admin access is verified through `/api/admin-verify`, so the management PIN must be set in Vercel environment variables before release.
Local static preview can unlock the management screen with `Yuuya1228`; production should use the Vercel `ADMIN_PIN` value.
Shared tournament data is read and written through `/api/state`, so the Supabase service role key must stay server-side in Vercel environment variables. Do not expose it in the browser.
When `supabase-schema.sql` has been applied, `/api/state` also keeps server-side JSON backups in `app_state_backups` before each save.
Admins can list and restore those backups through `/api/state-backups` from the management screen. Restoring requires `ADMIN_PIN`.
The management screen also includes a release health check powered by `/api/health` to confirm Vercel environment variables and Supabase tables.
Admins can run a local data audit from the management screen to catch duplicated IDs, missing Riot IDs, check-in state issues, premature lobby generation, and duplicate placements.
Result submissions show richer admin history, including method, submitter, Riot/Discord/X references, tournament target, and submitted placement summary.
Result submissions are validated before saving to block duplicate placements, duplicate players, out-of-lobby players, invalid placements, and too-small OCR results.
Most user-facing validation messages now use in-app toast notifications instead of browser alerts.
Mobile screens use a fixed bottom navigation for the main user flows, reducing header crowding and improving tap targets.
Admins can edit participant display name, Riot ID, Discord ID, X account, and linked email directly from the participant table. Passwords are not editable by admins.
Starting a tournament now runs a readiness check for start time, checked-in players, required player data, Riot ID format, and leftover lobby/result/report data.

Local prototype accounts now store passwords as salted hashes, but full production auth is still a next step: moving login/register/password reset from the local prototype to Supabase Auth.

## Local Preview

Open `index.html` directly, or run a local server:

```bash
python -m http.server 4175 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4175/
```
