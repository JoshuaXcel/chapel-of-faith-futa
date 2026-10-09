# The Chapel of Faith, FUTA · website + admin panel (v2)

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

Demo mode keeps changes in *your* browser only. Admin → Dashboard → "Reset demo data" starts fresh. Bumping `seed_version` in `seed.json` reseeds every visitor.

## Real photos of the church
Drop the media team's photos into `assets/gallery/` named `photo-01.jpg`, `photo-02.jpg` … `photo-08.jpg` (landscape, about 1600 px wide, under 400 KB each), or upload them in **Admin → Gallery**. They rotate in the home-page slideshow and fill the "Faces of faith" gallery. The shipped `photo-01…06` are AI-generated sample scenes with no identifiable faces, and `photo-07/08` are "Your photo here" cards. Replace all of them before launch.

## Connecting the backend
1. Implement the routes in `API.md` (section 6 lists the order).
2. Set `API_BASE_URL` in `config.js`, e.g. `https://api.chapeloffaithfuta.org/api/v1`.
3. Allow CORS for the site's domain. Log in at `/admin/` with a real admin user.

## Tests
`node --test` checks the pages, the data layer, the seed and the contract files.
