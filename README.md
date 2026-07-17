# Etch Studio — Hangar Indy

Guest-facing engraving design web app. Guests scan a per-event QR (or use the
iPad kiosk), pick what they're making, then describe / type / upload / photo
their way to a black-and-white engraving-ready PNG. On submit the app stores
the customer + design in Supabase (marketing store of record) and creates a
ClickUp work order in the **Afterburners** queue with the PNG attached.

**Guest flow:** `/?event=<slug>` (per-event QR from Admin) · `&mode=kiosk` for the iPad
**Admin:** `/?page=admin` (staff passcode) — events calendar, item catalog, defaults, orders
**Gallery wall:** `/?page=gallery&event=<slug>` — live design wall for a venue TV

## Stack

- React + TypeScript + Vite, Tailwind (brand tokens in `tailwind.config.js`)
- Supabase: `etch_*` tables + `etch-*` Edge Functions in the shared HandleBar
  Hangar project (source of truth: `handlebar-audit` repo, `supabase/`)
- Hosted on GitHub Pages via `.github/workflows/deploy.yml`

## Local dev

```sh
npm install
cp .env.example .env   # fill in Supabase URL + anon key
npm run dev
```

## Deploy

Push to `main`. The Pages workflow builds with repo variables
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and `VITE_BASE_PATH=/hangar-etch-studio/`.

Server-side configuration lives in Supabase Edge Function secrets:
`OPENAI_API_KEY` (AI design modes), `CLICKUP_API_TOKEN` (work orders),
`ETCH_ADMIN_PASSCODE` (admin gate), optional `ETCH_IMAGE_QUALITY` (low|medium|high).

See `FABLE-PROMPT.md` for the original build brief.
