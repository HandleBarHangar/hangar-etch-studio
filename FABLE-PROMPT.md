# Fable Build Prompt — "Hangar Etch Studio" (guest engraving design web app)

> Paste everything below the line into Fable as a single build brief. It is written to be built end-to-end with no follow-up questions. Anything you (Steve) must supply before launch is collected in the **"Before you launch" checklist** at the very bottom — Fable should stub these with environment variables, never hardcode them.

---

## 0. What we're building (one paragraph)

A **mobile-first, responsive web app** that lets a corporate/team-building guest create a black-and-white engraving-ready design in about **30 seconds**, then hands it off so a staff member at the laser can run it. It works two ways from the same codebase: **guests on their own phone** (scan a QR code / open a link — no app install, no station required) and a **shared iPad kiosk** at the venue. The guest picks **what they're making** (from an item list staff control in Admin — e.g. Mug, Hat, Shirt), then either **describes what they want out loud** (or types it) and we generate the art, or **uploads their own design** (from their phone's camera roll, or AirDropped to the iPad first). They get a limited number of **revisions** (staff-configurable). Optionally we capture their **name / email / phone**, stored for future merch marketing (staff-configurable toggle). There is also an optional **"Crew Caricature"** mode: snap a photo of the group and turn each person into an engraving-ready caricature. On submit, the app does exactly two things: **stores the customer + image + context in Supabase** (our marketing store of record) and **creates a ClickUp work-order task** in the engraver's queue — due immediately, with the image attached — from which the engraver downloads the file, sets the material, and runs the laser.

The app is **event-aware**: staff configure each booked **event** in advance from the Admin panel — its date and start/end time, which items are offered and how many of each were **sold in advance** (a per-type cap), a **per-person limit** (usually 1), the revision count and contact-capture settings for that event, and an optional **co-branding logo** (the client's company logo shown alongside Hangar's on the guest screens). A clean **calendar view** in Admin shows all upcoming events at a glance so staff can confirm everything is set up before the group arrives. Each event gets its own QR code/link. A small, separate **Admin** screen controls all of this and the item list. This is a **guest-only experience with no guest login** — simplicity is the whole point.

---

## 1. Tech stack

Match the existing Hangar stack so it drops into our world:

- **React + TypeScript + Vite**
- **Tailwind CSS + shadcn/ui** components, **lucide-react** icons
- **Supabase** for database, storage, and Edge Functions (all secrets/API calls server-side)
- **@supabase/supabase-js** on the client
- Deploy as a static site at a **single public URL** that works on **any modern phone browser** (iOS Safari + Android Chrome) **and** as an iPad kiosk. Design **mobile-first** (phone is the primary target), then scale up gracefully to tablet/desktop.
- Make it an installable **PWA** (web manifest + icons using the H-star emblem) so guests can optionally "Add to Home Screen," but it must work fully in a plain browser tab with no install.
- Handle both cameras/mics via standard HTML file/media inputs so phone and iPad behave identically.

**Never hardcode secrets or backend identifiers in client code.** Use environment variables only:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. All third-party API keys (OpenAI, ClickUp) live **only** inside Supabase Edge Functions as function secrets — never in the client bundle, never in logs.

---

## 2. Brand system (use these exactly)

**Product name (guest-facing):** "Etch Studio" — powered by Hangar Indy. (Internal/repo name: `hangar-etch-studio`.)

**Color palette (CSS variables):**

```css
:root {
  --navy:        #0E2A56; /* primary page background */
  --navy-mid:    #112F60; /* panels, cards on navy */
  --navy-deep:   #06173A; /* footer, deep sections, tags */
  --gold:        #F5B921; /* primary accent, CTAs, highlights */
  --gold-soft:   #FFD25A; /* hover / lighter accent */
  --cream:       #F4ECD8; /* light cards, surfaces */
  --cream-deep:  #E8DDC2; /* card borders / secondary surface */
  --ink:         #14263F; /* dark text on cream */
  --muted:       #B8C4D6; /* secondary text on navy */
}
```

**Look & feel:** dark navy background, gold accents, cream surfaces. Premium, aviation/hangar-inspired, warm not corporate-sterile. Big touch targets, generous spacing, rounded cards. Feels like a polished kiosk, not a form.

**Fonts (Google Fonts):**
- Headlines / big UI labels: **Bebas Neue** (uppercase, condensed, punchy)
- Body / inputs / buttons: **Inter**

**Headline voice:** short two-beat lines, second beat in gold. Examples for screens: "Your Idea. Engraved." / "Say It. See It." / "Made By You. Made To Last."

**Logos** (I will drop these into `/public/brand/` — reference by these exact filenames):
- `hangar-logo-primary-white.svg` — primary logo, use on navy backgrounds (top of screens)
- `hangar-emblem-hstar-white.png` — compact emblem, use for loading states / favicon / watermark
- If a file is missing, fall back to a text wordmark "HANGAR • ETCH STUDIO" in Bebas Neue gold — never break the layout.

**Footer contact (appears small on the welcome/confirmation screens):** www.HangarIndy.com

---

## 3. The guest flow (the whole point — keep it ~30 seconds)

Full-screen, one-thing-per-screen, large buttons, no clutter. Flow:

### How guests get in (two entry paths, one codebase)
- **On their own phone:** a **QR code / short link** (printed on table tents, coasters, or shown on a venue screen) opens the app. No install, no login. This is the default/primary experience.
- **iPad kiosk:** the same URL opened on the venue iPad, launched with a `?mode=kiosk` query param (or a saved home-screen shortcut).
- **Mode behavior:**
  - `kiosk` mode: after the confirmation screen, **auto-reset to Welcome** after ~12s so the next guest can start; keep it locked to the flow (no external nav).
  - `personal` mode (default, phones): **no auto-reset** — the guest keeps their result on screen, and the confirmation offers "Start Another" only if they tap it.
- **Event context:** the URL carries **`?event=<slug>`** (baked into that event's QR/link in Admin). On load, resolve the event (§7 `events`) and pull **its** config — item list + per-type quotas, per-person limit, revision count, contact-capture settings, and co-brand logo. If there's no `?event=` (a walk-up guest) or it doesn't resolve, fall back to the global **defaults** in `app_settings`. Optionally also accept `?table=` as a free-text tag stored on the order.
- **Co-branding:** if the resolved event has a co-brand logo, show a **"Hangar Indy × {Client}"** lockup (Hangar logo + client logo) on the Welcome and Confirmation screens. If none, show Hangar alone. Never let a missing/oversized client logo break the layout — constrain its height and fall back gracefully.
- **Device identity for per-person limits:** on first load, generate a random **`device_token`** and persist it (localStorage) so the app can enforce the event's per-person cap best-effort without a login (see §6). This is a soft limit — honest about that — staff can always help a guest who needs more.
- Generate each event's QR/link in Admin (see §9) so staff can print or display it.

### Screen 1 — Welcome / Mode select
- Logo area top-center: Hangar logo, or the **"Hangar Indy × {Client}" co-brand lockup** if the event has a client logo. Headline "Your Idea. Engraved."
- If the event has a friendly name, show a small welcome line: "Welcome, {Event Name}! ✦"
- Three big tappable cards:
  1. **🎤 Describe It** — "Say or type what you want."
  2. **⬆️ Upload My Design** — "Pick a photo from your device (or AirDrop to the iPad first)."
  3. **📸 Crew Caricature** — "Turn a group photo into engraved characters." *(only visible if enabled in Admin)*
- Tiny footer: brand + "Ask a Hangar team member if you need help."

### Screen 1.5 — What are we making?
- Shows the items **offered for this event** (the event's `event_items`, intersected with the active catalog) as big tappable cards, each with label and optional emoji/thumbnail: e.g. **Mug · Hat · Shirt**. With no event context, show the globally active catalog items.
- **Sold-out awareness:** for each item, if the event's **per-type quota** is reached (sold count ≥ `quota_total`), show the card as **"Sold out"**, greyed and non-tappable. If every offered item is sold out, show a friendly "This event's engravings are all claimed — see a Hangar team member." and stop.
- One tap selects the item and advances. Store the chosen item on the session; it drives the ClickUp "Item Provided" field (§6.1).
- **Smart skip:** if exactly one item is available, auto-select it and skip this screen (keeps the 30-second promise). If none are configured, treat as "Other Engraved Item" and skip.
- Default position: immediately after Welcome so the item is known before generating.

### Screen 2A — Describe It
- Big microphone button using the **Web Speech API** (`webkitSpeechRecognition`/`SpeechRecognition`) for voice-to-text. As the guest speaks, transcribe live into a text field.
- **Always** show the editable text field as a fallback (Safari voice support is inconsistent — if the API is unavailable, hide the mic gracefully and just show the text field with placeholder "Type your idea… e.g. 'a vintage biplane over mountains'").
- One primary gold button: **"Create My Design →"**.
- Optional quick-pick chips to speed things up (tapping adds to the prompt): "Add our team name", "Vintage", "Bold & simple", "Line art", "Add a date".

### Screen 2B — Upload My Design
- File picker: `<input type="file" accept="image/*">` — on a **phone** this opens the camera roll / photo library (and offers the camera); on the **iPad kiosk** it opens Photos/Files so they can grab an AirDropped image. Same control, works everywhere.
- After selecting, show a preview and a **Black & White** toggle (default ON) with a simple **threshold slider** (client-side canvas conversion to high-contrast 1-bit; see §5). Let them compare original vs B&W.
- Button: **"Use This Design →"**.

### Screen 2C — Crew Caricature *(optional module)*
- Camera capture: `<input type="file" accept="image/*" capture="environment">` (opens the iPad camera) or upload an existing group photo.
- Button: **"Make Our Caricatures →"** → sends to the caricature Edge Function (§6).
- Copy sets expectations: "We'll turn each person into a clean engraved character. Best with a clear, well-lit group photo."

### Screen 3 — Result / Revise
- Show the generated (or uploaded) **black-and-white design** large and centered on a cream card, so it previews exactly how it will engrave.
- Buttons:
  - **✅ Love It — Send to Print** (primary gold)
  - **✏️ Tweak It** (secondary) — reveals a small text field "What should we change?" and a **"Revise"** button. This regenerates using the previous prompt + the tweak.
  - **↺ Start Over** (text link)
- **Revisions counter** visible: "Revisions left: N" where N comes from the **event's** `max_revisions` (or the global default if no event context). Each **Revise** or each new generate on the same session decrements it. When N reaches 0, hide **Tweak It** and show only **Send to Print** / **Start Over** with a friendly note: "That's the last of your free tweaks — this one's a keeper! A team member can help with more."

### Screen 4 — (Conditional) Guest details
- **Only shown if `capture_contact` is ON in Admin.** Otherwise skip straight to Send.
- Fields depend on individual Admin toggles (`capture_name`, `capture_email`, `capture_phone`): Name, Email, Phone. Show only the enabled ones. Mark which are required in Admin (default: name + email required if capture is on; phone optional).
- Micro-consent line under the fields (shown only when email/phone captured): "Drop your info and we'll keep you posted on new merch you can make. No spam." with a checkbox `marketing_opt_in` (default checked, but clearly uncheckable). (We store this now for future marketing; no automated email is sent in this version.)
- Button: **"Send My Design →"**.

### Screen 5 — Confirmation
- Big gold checkmark, headline "Sent to the Hangar! ✦" — carry the co-brand lockup here too if the event has a client logo.
- "Your design is on its way to our engraver. A team member will set your material and start the machine."
- **Per-person limit:** if the guest has now reached the event's `max_items_per_person`, replace "Start Another" with a friendly note: "That's your {N} for this event — see a Hangar team member if you'd like more." If they're still under the limit, show **"Start Another."**
- In `kiosk` mode: auto-reset to Screen 1 after ~12 seconds (unless the per-person note is showing). In `personal` mode: no auto-reset.

**Kiosk niceties:** prevent pinch-zoom weirdness, large hit targets (min 56px), no dead time — show a branded loading animation (using the H-star emblem) whenever the image function is working, with reassuring copy ("Sketching your design…"). Target the full round trip to feel fast.

---

## 4. Output requirements — engraving-ready black & white

Every design that reaches "Send to Print" must be:

- **Pure black on white**, high contrast, **no gradients, no grayscale shading, no photographic tones.**
- Bold, clean, closed line work / silhouettes that engrave well.
- Delivered as a **high-resolution PNG** (at least 2000px on the long edge, white background, black artwork). *SVG is not required for this MVP — our engraver imports PNG directly for engraving. Build the pipeline so an SVG vectorization step can be added later, but do not block on it.*
- No app UI, watermark, or logo baked into the artwork itself — the guest's design only.

**The generation prompt must enforce this.** For AI generations, append a fixed style directive server-side (guest never sees it), e.g.:

> "Black and white line art, high contrast, bold clean solid black lines on a pure white background, no gradients, no shading, no gray tones, no color, minimal detail, vector-style silhouette suitable for laser engraving. Centered, single subject, clean negative space."

For uploaded art, run the client-side B&W threshold conversion (§5) before send unless the guest turns B&W off.

---

## 5. Client-side black & white conversion (for uploads)

Implement with an HTML `<canvas>`:
1. Draw the uploaded image to canvas.
2. Convert to grayscale, then apply a **threshold** (slider, default ~128) to produce pure black/white pixels.
3. Live-preview the result; the slider lets the guest dial contrast.
4. On confirm, export the canvas as PNG (white bg) for upload.
Keep it fast and fully client-side (no server round-trip needed for simple B&W).

---

## 6. Supabase Edge Functions (all server-side; keys as function secrets)

Follow our standard structure: functions in `supabase/functions/<name>/index.ts`, shared helpers in `supabase/functions/_shared/`.

**`generate-design`** — text → engraving art.
- Input: `{ session_id, prompt, revision_of? }`
- Calls **OpenAI image generation (`gpt-image-1`)** with the guest prompt + the fixed engraving style directive (§4). Request a square, high-resolution image.
- Uploads the result to Supabase Storage bucket `designs/` and returns a signed/public URL + the storage path.
- Enforces `max_revisions` server-side too (don't trust the client): count generations per `session_id`, reject once exceeded with a clear error the UI can show.
- API key from function secret `OPENAI_API_KEY`.

**`caricature-design`** — group photo → per-person caricatures.
- Input: `{ session_id, image_path }` (photo uploaded to Storage first).
- Calls `gpt-image-1` **image edit** with a directive like: "Turn each person in this photo into a clean black-and-white caricature line drawing, bold outlines, no shading, white background, suitable for laser engraving. Keep each person recognizable; arrange them side by side." Returns B&W PNG to `designs/`.
- Same revision accounting as above.

**`send-to-print`** — finalize + hand off. Two destinations only: **Supabase** (store of record) and **ClickUp** (engraver work order). No Google Drive, no email in this version.
- Input: `{ session_id, device_token, design_path, input_mode, prompt?, item_id?, event_slug?, table?, guest: { name?, email?, phone?, marketing_opt_in? } }`
- Steps:
  1. **Enforce event limits server-side (don't trust the client).** If an event is in context:
     - **Per-type quota:** count existing `engrave_orders` for this `event_id` + `item_id`. If that count ≥ the `event_items.quota_total`, reject with a clear `SOLD_OUT` error the UI can show. (Count-based so it's reliable even under concurrent submits; add the index in §7.)
     - **Per-person limit:** count existing orders for this `event_id` where `device_token` matches (or `guest_email` matches, if captured). If ≥ `events.max_items_per_person`, reject with a `PER_PERSON_LIMIT` error. (Soft/best-effort — device-based — but enforced here, not just in the UI.)
  2. Write a row in `engrave_orders` (see §7) with design path, guest info (only what was captured), input mode, selected item, `event_id`, `device_token`, table tag if present, timestamp, and a human-friendly **order code** (e.g., `HANGAR-0731-A7`). **This is the marketing store of record** — customer + image + context persist here regardless of what happens next.
  3. **Create a ClickUp work-order task** in the Afterburners engraver queue with the image attached, due immediately (§6.1). Save the returned task id + url back onto the order row.
- Make the ClickUp step **resilient**: if it fails, the `engrave_orders` row is still written (so no submission is ever lost) and the function returns a clear result flagging that the work order needs a retry. The Supabase write is the safety net; the ClickUp task is the action.
- All credentials from function secrets only. Never log secrets, tokens, or list IDs.

#### 6.1 ClickUp work-order creation (on submit)

When a design is sent, create a task that looks like our existing engraver work orders in the **Afterburners** list. Reference order for format: `https://app.clickup.com/t/86bauuav3` (e.g. task name *"Sydney Blanford (34 Mugs)"*, engraving file attached, in list **Afterburners**).

**API:** ClickUp REST v2. Token in Edge Function secret `CLICKUP_API_TOKEN` (header `Authorization`). **Never** put the token or these IDs in client code.

- **Create task:** `POST https://api.clickup.com/api/v2/list/901414267824/task`
  (list **Afterburners**, id `901414267824`; folder "To Do" `90144083588`; space `32284509`).
- **Body:**
  - `name`: `"{Guest Name} — Custom Engraving"` (fall back to `"Etch Studio Guest — Custom Engraving"` if no name captured). If item type is known, mirror the reference style: `"{Guest Name} ({Item})"`.
  - `description`: short work-order note, e.g. `"Guest-submitted engraving from Etch Studio.\nMode: {describe|upload|caricature}\nOrder: {order_code}\nEvent: {event_name or '—'}\nTable: {table or '—'}\nPrompt: {prompt or '—'}\nSet material and engrave the attached image."`
  - `due_date`: **now** (current epoch ms), `due_date_time: true`. Set `priority: 1` (Urgent) since it's fulfilled live.
  - Leave `status` unset so it lands in the list's default/first status (staff move it through their board). Don't hardcode a status string.
- **Attach the image:** after the task is created, `POST https://api.clickup.com/api/v2/task/{task_id}/attachment` as `multipart/form-data` with the final PNG (field name `attachment`). This puts the engraving file right on the task like the reference SVG.
- **Populate custom fields** (via the create payload's `custom_fields` array `[{ id, value }]`, or `POST /task/{task_id}/field/{field_id}`). Use these real field IDs — set only the ones we have data for, skip the rest:
  - **Your Name** (short_text) `6820cd8f-452b-401f-9d2e-b6b18d6f724b` → guest name.
  - **Item Provided** (dropdown) `01653143-427e-4bc9-83ed-33750125728a` → set to the **`clickup_option_id` stored on the guest's chosen catalog item** (§7 `engrave_items`). The dropdown's real option ids are: Custom Mug `87a8ab66-9892-46b4-8270-4a31f7318545`, Custom Mug + Cocktail `8deb4daf-7a53-4bf7-a410-ced4bedf946c`, Custom Hat `3290128d-b5ac-4c92-97b7-f52fe1174b08`, Custom Shirt `e35474d8-35f1-4829-ab2a-1e32f6ed0346`, Framed Photo `f241342a-b9fd-4fe6-ba8c-9254cbd0203e`, Other Engraved Item `6c471294-40fd-47e9-a304-c548c87377d8`, Other `1a7657ad-299a-4807-b905-7d55216c7723`. If the catalog item has **no mapped option** (a new product not in ClickUp's dropdown yet), set Item Provided to *Other Engraved Item* and write the item's name into the **Other** text field `f1eb5253-a604-4494-b322-60731bfbf100` so the engraver still sees what it is.
  - **What was this for?** (dropdown) `7b3848b0-99af-4d32-a7c1-3cfd3f75ce52` → **Hangar Customer** `482f9955-b143-405d-ac14-96584164a179` (default for this app).
  - **Photo For Us To Print** (attachment field) `3d9443f2-1c0e-431e-bd6a-da3aa1121481` → the final PNG, if setting an attachment-type custom field is supported by the token; otherwise the task-level attachment above is sufficient.
  - **Date** (date) `ee7b117f-e20e-4f4c-9814-b4bd1e15f94a` → submission date.
  - Optional if we ever collect them: **Tour Group Name** `893ee1e5-9198-449d-bbfb-b4669af89fb4`, **What is your group celebrating?** (dropdown) `6197c34b-47d6-45f1-bf8a-7441ca84784d`.
- Save the returned ClickUp task id + url onto the `engrave_orders` row (`clickup_task_id`, `clickup_task_url`).
- The item shown to guests and its ClickUp mapping both come from the **Admin item catalog** (§7, §9) — so staff can add or edit sellable items later without a code change.

**`admin-settings`** (or store settings + item catalog in tables read via RLS) — get/set the settings and manage `engrave_items` (§7). Protect writes behind the staff passcode (§9).

---

## 7. Data model (Supabase)

Respect our schema rules: **do not coerce missing values to null for NOT NULL columns.** Validate inputs and rely on DB defaults where defined. Add RLS to every table.

**`app_settings`** (single row — the **global defaults** new events inherit, and the fallback config when a guest arrives with no event context):
- `id uuid pk default gen_random_uuid()`
- `max_revisions int not null default 3`
- `capture_contact boolean not null default false`
- `capture_name boolean not null default true`
- `capture_email boolean not null default true`
- `capture_phone boolean not null default false`
- `caricature_enabled boolean not null default true`
- `require_email boolean not null default true`
- `default_max_items_per_person int not null default 1`
- `updated_at timestamptz not null default now()`

**`events`** (one row per booked event — the unit of configuration; staff set these up in advance):
- `id uuid pk default gen_random_uuid()`
- `name text not null` (e.g. "Acme Corp Team Building")
- `slug text not null unique` (short url-safe token baked into the event's QR/link)
- `event_date date not null`
- `starts_at timestamptz` (nullable — start time), `ends_at timestamptz` (nullable — end time)
- `is_active boolean not null default true` (staff can disable an event without deleting it)
- `max_items_per_person int` (nullable — null = unlimited; seed from `default_max_items_per_person`, usually 1)
- `max_revisions int not null default 3` (seeded from defaults; per-event override)
- `capture_contact boolean not null default false` + `capture_name`, `capture_email`, `capture_phone`, `require_email`, `caricature_enabled` (all per-event, seeded from `app_settings` at create)
- `cobrand_client_name text` (nullable — client company name shown in the "× {Client}" lockup)
- `cobrand_logo_path text` (nullable — Storage path of the uploaded client logo)
- `created_at timestamptz not null default now()`

**`event_items`** (which items an event offers + how many of each were sold in advance):
- `id uuid pk default gen_random_uuid()`
- `event_id uuid not null` (FK `events`)
- `item_id uuid not null` (FK `engrave_items`)
- `quota_total int` (nullable — max of this item type for the event; null = unlimited)
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- **unique(`event_id`, `item_id`)**. Add an index on `engrave_orders(event_id, item_id)` so the sold-count query for quota checks is fast. "Sold count" is computed by counting `engrave_orders` rows (don't store a mutable counter — counting is race-safe).

**`engrave_items`** (the staff-managed catalog of what a guest can choose to make):
- `id uuid pk default gen_random_uuid()`
- `label text not null` (guest-facing name, e.g. "Custom Mug")
- `emoji text` (nullable — optional icon for the picker)
- `clickup_option_id text` (nullable — the ClickUp "Item Provided" dropdown option id this maps to; null = falls back to *Other Engraved Item* + writes the label into the Other text field)
- `active boolean not null default true` (only active items appear to guests)
- `sort_order int not null default 0`
- `created_at timestamptz not null default now()`

Seed it with the current products mapped to their real ClickUp option ids: Custom Mug → `87a8ab66-9892-46b4-8270-4a31f7318545`, Custom Hat → `3290128d-b5ac-4c92-97b7-f52fe1174b08`, Custom Shirt → `e35474d8-35f1-4829-ab2a-1e32f6ed0346`. Staff manage the rest from Admin.

**`engrave_orders`**:
- `id uuid pk default gen_random_uuid()`
- `order_code text not null` (generated, human-readable)
- `session_id text not null`
- `design_path text not null` (Storage path of the final PNG)
- `design_url text` (nullable — public/signed URL if used)
- `input_mode text not null` (`describe` | `upload` | `caricature`)
- `prompt text` (nullable — only for AI modes)
- `item_id uuid` (nullable — FK to `engrave_items`, the guest's chosen item)
- `item_label text` (nullable — denormalized item name at time of order, so history survives catalog edits)
- `event_id uuid` (nullable — FK to `events`; null for walk-up/no-event orders)
- `device_token text` (nullable — for best-effort per-person limit counting)
- `table_tag text` (nullable — free-text from `?table=`)
- `entry_mode text not null default 'personal'` (`personal` | `kiosk`)
- `revisions_used int not null default 0`
- `guest_name text` (nullable — only if captured)
- `guest_email text` (nullable)
- `guest_phone text` (nullable)
- `marketing_opt_in boolean not null default false`
- `clickup_task_id text` (nullable — set once the work order is created)
- `clickup_task_url text` (nullable)
- `created_at timestamptz not null default now()`

Guest-captured fields are **nullable on purpose** (they may not be captured) — this is not a NOT-NULL column being coerced; leave them out of the insert when absent rather than inserting `null` explicitly where a value was expected.

**Storage buckets:** `designs` (generated/final art), `uploads` (raw guest uploads + crew photos), `event-branding` (uploaded client co-brand logos — public-read so guest screens can display them). Lock down with RLS; the kiosk uses the anon key with tightly scoped policies (insert-only where possible).

**After any migration**, run security/performance advisors and confirm RLS exists on all tables before calling it done. `engrave_items`, `events`, and `event_items` should be **publicly readable** (guests need the active event config + item list) but **write-protected** to the admin path only. `engrave_orders` is insert-only for guests, read-only to the admin path.

---

## 8. How the engraver gets the file

No Google Drive, no separate transfer. The engraving PNG is **attached directly to the ClickUp work-order task** (§6.1), so the existing engraver workflow is unchanged: the engraver opens the new Afterburners task on the Mac, **downloads the attached image**, drags it into xTool Creative Space, sets the material, and presses Start. The task is due immediately and marked Urgent so it surfaces at the top of the queue. (No API into XCS exists, so the drag-in + press-start stays a manual step by design.)

*Deferred to a later phase (explicitly out of scope now): pushing the file to a shared Google Drive folder, and emailing the guest their design. The data needed for both — the stored image and the captured contact info — is already persisted in Supabase, so either can be switched on later without rework.*

---

## 9. Admin screen (separate from the guest experience)

Our standing rule: the guest surface stays guest-only with **no staff features mixed in**. So build Admin as a **separate route `/admin`, gated by a simple staff passcode** (env `VITE_ADMIN_PASSCODE` compared server-side, or a Supabase-checked code — do not ship a hardcoded literal). It is not part of the kiosk flow and never linked from guest screens.

Organize Admin as a few tabs: **Events (calendar)**, **Item Catalog**, **Defaults**, **Orders**. Keep it visually simple (a plainer version of the brand — navy + gold, less kiosk-y).

#### Events — calendar & per-event setup (the main new area)
- **Calendar view:** a clean, easy-to-read month/week calendar of all events, each block showing **event name + date + start–end time**. Include an "Upcoming" list beneath it for quick scanning. Use a lightweight calendar (e.g. FullCalendar or react-big-calendar, or a simple month grid + list — keep it readable, not fancy). Clicking an event opens its editor.
- **"+ New Event"** and **event editor** — set up an event in advance:
  - **Name**, **date**, **start time**, **end time**, **active** toggle.
  - **Items offered + advance quotas:** pick which catalog items this event offers, and for each set the **max total sold in advance** (`quota_total`; leave blank = unlimited). Live events show **"sold X of N"** and remaining, computed from orders.
  - **Max items per person** (`max_items_per_person`) — default 1; blank = unlimited (for organizers who don't care).
  - **Revisions**, **contact-capture** toggles (+ require email), **caricature on/off** — per-event, pre-filled from Defaults but overridable.
  - **Co-branding:** upload the **client's company logo** (to `event-branding` bucket) and set the **client name**; preview the "Hangar Indy × {Client}" lockup as guests will see it. Allow remove/replace.
  - **This event's QR + link:** shows the URL with `?event=<slug>` baked in, a scannable **QR code**, and **Copy link / Download QR** buttons so staff can print signage ahead of time.
- A guest with no event context uses the **Defaults** (below).

#### Item Catalog (global list of possible products)
- List items with **label**, optional **emoji/icon**, global **active** toggle, drag-to-reorder (`sort_order`).
- **Add / edit / deactivate** — prefer deactivate over hard-delete so past orders keep their reference.
- Optional **"ClickUp Item Provided" mapping** per item, from the ClickUp field's real options (Custom Mug, Custom Mug + Cocktail, Custom Hat, Custom Shirt, Framed Photo, Other Engraved Item, Other). Unmapped → work order uses *Other Engraved Item* and writes the label into the Other text field. Add a product here once; events then choose from it.

#### Defaults (`app_settings`) — inherited by new events, and used for walk-up guests
- **Revisions per guest**, **capture-contact** master + sub-toggles + require email, **caricature on/off**, **default max items per person**.

#### Orders
- **Recent orders** (last ~25 from `engrave_orders`): order code, event, item, mode, time, whether the **ClickUp task** was created (+link), thumbnail. Read-only — confirm work orders went through and spot any needing a retry.
- **Test button:** "Create test ClickUp task" to verify the engraver hand-off end to end.

---

## 10. Safety, privacy, content

- **Content moderation:** before generating, pass the guest prompt through OpenAI's moderation (or the model's built-in refusal) and block disallowed content with a friendly "Let's try a different idea." Same for uploaded/caricature images where feasible. We do not want the laser producing offensive or infringing art.
- **Rate limiting:** cap generations per session and per device/hour to control API cost and abuse (tie to `max_revisions` plus a hard per-hour ceiling in the Edge Function).
- **PII:** guest contact info is only stored when captured, and only for future opt-in merch marketing (no automated email in this version). Don't expose it on any guest screen. RLS must prevent the anon kiosk key from reading `engrave_orders` rows (guests write, only the admin path reads).
- **No secrets client-side or in logs** — reiterate: OpenAI + ClickUp keys and the Supabase project identifiers live only in Edge Function secrets / env vars.

---

## 11. Acceptance criteria (definition of done)

1. The app runs from one public URL on **a personal phone (iOS Safari + Android Chrome)** and on the **iPad kiosk**; a guest can go Welcome → Describe → Result → Send in under ~30 seconds, and the confirmation screen appears.
2. Scanning the Admin QR / opening the link starts the flow on a phone with no install; `?mode=kiosk` enables auto-reset on the iPad, and personal mode does not auto-reset.
3. Voice input transcribes on mobile Safari/Chrome where supported and silently falls back to the text field where not.
4. Upload mode accepts a photo from the phone camera roll (or an AirDropped image on iPad) and converts it to clean black & white with an adjustable threshold.
5. Generated designs are pure black-on-white, high-contrast, engraving-appropriate PNGs (no gradients/shading).
6. Revisions decrement correctly and are enforced **both** in the UI and server-side; hitting 0 disables further tweaks gracefully.
7. Admin can add / edit / reorder / deactivate catalog items, and those changes drive what guests can pick — a newly added item (with its ClickUp mapping) flows to the work order with no code change. A single available item auto-skips the picker.
8. **Admin has a readable calendar of upcoming events (name, date, start–end time), and an event editor to configure in advance:** items offered + per-type advance quotas, max items per person, revisions, capture toggles, caricature, and a co-brand logo — each event generating its own `?event=<slug>` QR/link.
9. **A guest opening an event's link gets that event's config**: the right item list, sold-out items greyed when the per-type quota is hit, the event's revision count, and the "Hangar Indy × {Client}" co-brand lockup when a client logo is set. No event → global defaults.
10. **Per-type quota and per-person limit are enforced server-side** in `send-to-print` (not just hidden in the UI): a sold-out type or a guest over their per-person cap is rejected with a clear message.
11. With contact capture ON, name/email (and phone if enabled) are collected and **stored in Supabase** for future marketing (no email sent in this version).
12. On Send: an `engrave_orders` row is written (customer + image + item + event + context), **and a ClickUp task is created in Afterburners (list `901414267824`) due immediately, priority Urgent, with the image attached and Item Provided set from the chosen item**. If ClickUp fails, the Supabase row still persists and the result flags a needed retry.
13. Crew Caricature mode (when enabled) turns a group photo into a black-and-white multi-character engraving PNG.
14. No secrets/tokens in the client bundle (OpenAI + ClickUp server-side); RLS is on; brand palette, fonts, and logos are applied.

---

## 12. Build order (suggested)

1. Scaffold app + Supabase, brand tokens, fonts, layout shell, logo assets. Mobile-first responsive shell + PWA manifest; kiosk vs personal mode via `?mode=` param; `device_token` bootstrap.
2. Data model: `app_settings`, `engrave_items`, `events`, `event_items`, `engrave_orders` + storage buckets, seeded; RLS.
3. Admin shell + passcode gate → Item Catalog + Defaults tabs.
4. **Events tab: calendar view + event editor (items/quotas, per-person, overrides, co-brand upload, per-event QR).**
5. Guest flow screens 1 → 1.5 → 5 with event context resolution + co-branding; mock/generated art (stub functions).
6. `generate-design` function + real OpenAI wiring + revisions logic (client + server, event-aware).
7. Upload mode + client-side B&W canvas conversion.
8. `send-to-print` → **server-side quota + per-person enforcement** → `engrave_orders` write **+ ClickUp work-order creation with image attachment and Item Provided mapping (§6.1)**, resilient to a ClickUp failure.
9. Contact capture (stored for marketing) + Orders tab.
10. Crew Caricature module.
11. Moderation, rate limiting, RLS/advisors pass, polish + kiosk reset behavior + cross-device testing (phone + iPad).

---

## Before you launch — checklist (Steve supplies these)

- [ ] Supabase project env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [ ] `OPENAI_API_KEY` set as a Supabase function secret.
- [ ] **ClickUp:** create a personal API token (Settings → Apps) and set it as function secret `CLICKUP_API_TOKEN`. Confirm the Afterburners list id is still `901414267824`. (Field IDs in §6.1 are current as of build; if ClickUp fields change, re-pull them.)
- [ ] Drop `hangar-logo-primary-white.svg` and `hangar-emblem-hstar-white.png` into `/public/brand/`.
- [ ] Set `VITE_ADMIN_PASSCODE` (or configure the staff passcode).
- [ ] Confirm the seeded item catalog (Mug / Hat / Shirt) is what you want live at open, and set the **Defaults** (revisions, contact capture, default max-per-person = 1).
- [ ] Create your first **event** in Admin (name, date, start/end, items + advance quotas, per-person limit, optional client logo) and print its QR — or just rely on Defaults for walk-up guests.

---

*Notes for Steve (not for Fable): This version does exactly two things on submit — save everything to Supabase and create the ClickUp work order with the image attached. The engraver downloads the image off the task and runs it (the drag-into-xTool + press-start step is unavoidable since xTool has no import/print API). Google Drive delivery and guest emails are deliberately left for a later phase; the image and contact info are already stored, so switching either on later is additive, not a rebuild. Near-zero-touch (SVG vectorization + pre-built XCS templates) also remains a possible phase 2.*
