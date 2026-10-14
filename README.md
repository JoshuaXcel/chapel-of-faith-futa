# The Chapel of Faith, FUTA · website + admin panel (v3)

Live (GitHub Pages): https://joshuaxcel.github.io/chapel-of-faith-futa/ · Admin: https://joshuaxcel.github.io/chapel-of-faith-futa/admin/
Also at https://chapeloffaithfuta.sites.tab.bot/

Frontend for the church platform. Backend: FastAPI + PostgreSQL (in progress, see `API.md`). Project documentation: `docs/Chapel-of-Faith-Project-Documentation.pdf` (editable `.docx` beside it).

Plain HTML/CSS/JS, no framework and no build step.

- `index.html`: the public website. All content (Chaplain, elders, CYF, messages, events, devotions, gallery, hymns, service times, bank details, WhatsApp) loads through `api.js`.
- `admin/`: the admin panel. Open `/admin/`. Demo login: **admin@chapel.demo / demo1234**.
- `api.js`: the data layer. `config.js` → `API_BASE_URL` empty = demo mode (browser storage, seeded from `data/seed.json`); set = your FastAPI backend.
- `API.md` + `openapi.yaml`: the backend contract, the suggested PostgreSQL schema and the daily-devotion delivery plan.

## Run it
Serve the repo root (`python -m http.server 8000`, then open http://localhost:8000 and http://localhost:8000/admin/). Opening `index.html` straight from disk also works, because `data/seed.js` carries the same data as `seed.json`. After editing `seed.json`, run `node tools/sync-seed.mjs` to regenerate `seed.js`.

Demo mode keeps changes in *your* browser only. The public pages never mention demo mode; the admin login screen still shows the demo login. Admin → Dashboard → "Reset demo data" starts fresh. Bumping `seed_version` in `seed.json` reseeds every visitor.

## Photos ("Photo coming soon" slots)
Every photo slot that has no real photo yet shows an on-brand "Photo coming soon" card in the same size, so the layout stays the same when real photos arrive.

- **Gallery ("Faces of faith")**: `assets/gallery/photo-01.jpg` … `photo-08.jpg` are "Photo coming soon" cards. Replace each file with a real photo under the same name (landscape, about 1600 px wide, under 400 KB), or upload photos in **Admin → Gallery**. Slot captions: 01 Sunday worship, 02 The Chapel choir, 03 In the Word, 04 Praise and worship, 05 Freshers find their way home, 06 Evening of prayer, 07 Fellowship on campus, 08 Serving together (edit captions in Admin → Gallery or `data/seed.json`).
- **Hero slideshow**: off while the gallery holds placeholder cards. Once real photos are in, set `HERO_PHOTOS = true` near the top of the gallery section in `script.js` and they rotate behind the hero.
- **People** (Chaplain, Assistant Chaplain, Chaplaincy Secretary, 8 Council of Elders roles, 6 CYF leaders): add each photo, name and contact in the Admin panel; until then the avatar shows a camera icon ("Photo coming soon") and the card shows the role only.
- **Sermon recordings**: each message shows "Recording coming soon" until a file or YouTube/Mixlr link is added in Admin → Messages.
- **Events**: no dated events ship; add real ones in Admin → Events (weekly services always show).

## Connecting the backend
1. Implement the routes in `API.md` (section 6 lists the order).
2. Set `API_BASE_URL` in `config.js`, e.g. `https://api.chapeloffaithfuta.org/api/v1`.
3. Allow CORS for the site's domain. Log in at `/admin/` with a real admin user.

## Tests
`node --test` checks the pages, the data layer, the seed and the contract files.

## Giving
Without a Paystack public key, the Give button explains that online giving opens soon and how to give in the meantime (no simulated checkout). Add the PUBLIC key (`pk_live_…`) in Admin → Settings or `config.js` and the button opens Paystack's own checkout. Bank details show only when both bank name and account number are set in Admin → Settings.
