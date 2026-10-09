# The Chapel of Faith, FUTA · API contract (v1)

This is the contract between the website + admin panel (static files, `api.js`) and the backend Excel is building in **FastAPI + PostgreSQL**. The frontend already works end-to-end in **demo mode** (browser storage). To switch to the real backend, set one line in `config.js`:

```js
window.CONFIG = { API_BASE_URL: 'https://api.chapeloffaithfuta.org/api/v1' }
```

Everything below is also in `openapi.yaml` (OpenAPI 3.0). Paste it into https://editor.swagger.io to browse it, or compare it with FastAPI's own `/docs` once your routes exist.

---

## 1. Conventions

| Thing | Rule |
|---|---|
| Base URL | `CONFIG.API_BASE_URL`, e.g. `/api/v1`. No trailing slash. |
| Format | JSON in and out (`Content-Type: application/json`), UTF-8. Uploads are `multipart/form-data`. |
| IDs | Integer `id` on every collection item (PostgreSQL `SERIAL`/`IDENTITY`). |
| Dates | `date` = `YYYY-MM-DD`. `datetime` = `YYYY-MM-DDTHH:MM` (local **Africa/Lagos**). Store `timestamptz`, return local ISO. |
| Auth | Admin routes need `Authorization: Bearer <JWT>`. Public routes are listed per resource. |
| Errors | FastAPI's default: `{"detail": "message"}`, or a 422 validation list `{"detail":[{"loc":[…],"msg":"…"}]}`. `api.js` shows either as a toast. |
| 401 | `api.js` clears the token and returns the admin to the login screen. |
| CORS | Allow the site's origin (`https://chapeloffaithfuta.sites.tab.bot`, your final domain and `http://localhost:*`) with `Authorization` and `Content-Type` headers. |
| Partial updates | `PUT /things/{id}` may receive only the fields that changed: merge them (Pydantic: `model_dump(exclude_unset=True)`). |
| Route order | Declare fixed paths (`/elders/order`, `/messages/recordings`, `/devotions/today`) **before** `/{id}` routes, or FastAPI tries to parse "order" as an int and returns 422. |

### Pagination

Every list returns the same envelope:

```json
{ "items": [ … ], "total": 42, "page": 1, "page_size": 20 }
```

Query params: `page` (1-based, default 1), `page_size` (default 20, max 100), `q` (free-text search). The admin asks for `page_size=100`. `api.js` also accepts a bare JSON array, so you can start simple.

### Uploads

`POST /uploads` (admin) · multipart fields `file` (binary) and `kind` (`avatar` | `image` | `gallery` | `media` | `file`).

```json
201 → { "url": "https://cdn.example.org/uploads/2026/10/abc123.jpg", "content_type": "image/jpeg", "size": 183422 }
```

The returned `url` is what the frontend saves into `photo`, `banner`, `src`, `thumbnail` or `media_url`. Suggested storage: Cloudinary (it can resize images), Cloudflare R2 or S3. Phone photos over 1.5 MB are downscaled in the browser before upload. Suggested limits: images 8 MB, audio/video 300 MB (or use the chunked recording upload below). Reject other MIME types with 415.

---

## 2. Auth

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/auth/login` | public | `{"email","password"}` → `{"access_token","token_type":"bearer","user":{id,name,email,role}}` |
| GET | `/auth/me` | admin | → `{id,name,email,role}` |

Hash passwords with bcrypt/argon2 (`passlib`), sign JWTs with `python-jose` or `PyJWT` (HS256, 8–12 h expiry). Roles: `admin` (everything), `editor` (content), `media` (messages + gallery).
If you prefer FastAPI's `OAuth2PasswordRequestForm` (form fields `username`/`password`), set `LOGIN_FORM_ENCODED: true` in `config.js`; `api.js` then sends a form body instead of JSON.

Demo mode login: **admin@chapel.demo / demo1234** (mock only; never ship these to production).

---

## 3. Resources

"Public" means no token. Everything else needs the admin Bearer token.

### Settings (single object)
| GET `/settings` | public | → Settings |
|---|---|---|
| PUT `/settings` | admin | merge → Settings |

```json
{
  "church_name": "The Chapel of Faith, FUTA",
  "motto": "The just shall live by his faith.", "motto_ref": "Habakkuk 2:4",
  "service_times": [ {"label":"Sunday Service","day":"Sunday","time":"09:00"}, {"label":"CYF Service","day":"Tuesday","time":"18:00"} ],
  "venue": "Chapel of Faith Auditorium, FUTA campus",
  "bank": {"bank_name":"", "account_name":"Chapel of Faith, FUTA", "account_number":""},
  "whatsapp": "+234…", "contact_email": "", "contact_phone": "",
  "livestream_url": "https://www.youtube.com/channel/UC…", "live_now": false, "live_title": "Sunday Service",
  "socials": {"facebook":"…","instagram":"…","youtube":"…"},
  "paystack_public_key": ""
}
```
The Sunday entry in `service_times` drives the countdown. `live_now: true` shows the LIVE badge and embeds the YouTube stream.

### Chaplaincy (single object)
| GET `/chaplaincy` | public |
|---|---|
| PUT `/chaplaincy` | admin · send only the role(s) you changed, e.g. `{"chaplain": {…}}` |

```json
{ "chaplain":           {"name":"Very Rev. …","title":"Chaplain","photo":"https://…","bio":"…","phone":"…","email":"…","office_hours":"Mon–Fri · 9 AM – 4 PM"},
  "assistant_chaplain": { …same fields… },
  "secretary":          { …same fields… } }
```

### Council of Elders
| GET `/elders` | public · sorted by `order` |
|---|---|
| POST `/elders` · PUT/DELETE `/elders/{id}` | admin |
| PUT `/elders/order` | admin · `{"ids":[3,1,2,…]}` = new display order |

Elder: `{id, name, role, portfolio, department, phone, email, photo, bio, order}`

### CYF
| GET `/cyf` · PUT `/cyf` | public / admin · `{about, venue, instagram, youtube, meetings:[{label, day, time}]}` |
|---|---|
| GET `/cyf/leaders` | public · sorted by `order` · `{id, name, role, department, level, phone, photo, order}` |
| POST · PUT/DELETE `/cyf/leaders/{id}` · PUT `/cyf/leaders/order` | admin |
| POST `/cyf/applications` | public · "Join CYF" form `{name, department, level, whatsapp, interests:[…]}` |
| GET `/cyf/applications` | admin |

### Messages (sermons)
| GET `/messages?published=true&series=&q=` | public sees published only (ignore `published=false` without a token) |
|---|---|
| POST · PUT/DELETE `/messages/{id}` | admin |

Message: `{id, title, preacher, date, series, media_type: "audio"|"video"|"youtube"|"mixlr", media_url, thumbnail, description, published}`
For files, upload first (`POST /uploads`, kind `media`) and save the returned URL as `media_url`. For YouTube/Mixlr, `media_url` is the link.

#### Recording from the church sound desk (beta)
Admin → Messages → **Record from church sound (beta)** records in the browser (`getUserMedia` + `MediaRecorder`, WebM/Opus or M4A) from whatever input the device has; the intended set-up is an aux/USB audio interface fed from the mixer/amplifier **REC OUT**.

| Method | Path | Notes |
|---|---|---|
| POST | `/messages/recordings` | admin · multipart: `file` (required), `title`, `preacher`, `date`, `series`, `duration_seconds`, `device_label`. Creates a **draft** message (`published:false`, `media_type:"audio"`) and returns it (201). |
| | *chunked (optional)* | For long services, send the file in parts: same `Upload-Id` header on every part plus `Content-Range: bytes 0-5242879/73400320`. Return 202 per part and 201 with the Message on the last. Store parts in a temp folder, concatenate, then move to storage. |
| POST | `/messages/{id}/clean` | admin · body `{"remove_fillers":true,"remove_coughs":true,"denoise":true,"replace_original":false}` → **202** `{"id":"job_…","type":"clean_audio","status":"queued","message_id":12}` |
| GET | `/jobs/{id}` | admin · `{id, type, status: queued|running|succeeded|failed, progress: 0–1, message_id, result_url, error, created_at, finished_at}` |

The AI clean-up (filler words "umm/ehm", coughs, background noise) is **Excel's own model**, called by the backend, never by the browser. Run it outside the request (FastAPI `BackgroundTasks` for a start, then Celery/RQ/arq with Redis). On success, save the cleaned file, set `result_url`, and update the message's `media_url` when `replace_original` is true (keep the original URL too). In the admin, the "Clean audio with AI" toggle is shown disabled ("coming soon") until these endpoints exist. Until then, demo mode treats a recording like any uploaded file.

### Events and special events
| GET `/events?upcoming=true&special=&featured=` | public · sorted by `starts_at` |
|---|---|
| POST · PUT/DELETE `/events/{id}` | admin |

Event: `{id, title, starts_at, ends_at, venue, description, banner, is_special, is_featured}`. `upcoming=true` means `coalesce(ends_at, starts_at) >= now()`. Events with `is_special: true` fill the banner carousel under the home hero.

### Daily devotions
| GET `/devotions?published=true` | public · `status != 'draft' AND date <= today`, newest first |
|---|---|
| GET `/devotions/today` | public · today's devotion, or the latest published one (204 if none) |
| POST · PUT/DELETE `/devotions/{id}` · GET `?status=` | admin |

Devotion: `{id, date, title, scripture_ref, scripture_text, body, author, status: "draft"|"scheduled"|"published"}`. "Scheduled" = written ahead and released on its `date`. Paragraphs in `body` are separated by a blank line.

### Devotion subscribers
| POST `/subscribers` | **public** · `{name, email, whatsapp, channel: "email"|"whatsapp"|"both"}` → 201 Subscriber. The same email again reactivates it: return 200 with `"already": true`. |
|---|---|
| GET `/subscribers` · DELETE `/subscribers/{id}` | admin |
| GET `/subscribers/export.csv` | admin · CSV (the admin also builds the CSV client-side) |
| POST `/subscribers/unsubscribe` | public · `{"token":"…"}` from the link in every email/WhatsApp message |

Validate: `email` is required unless `channel` is `whatsapp`; `whatsapp` is required unless `channel` is `email`. Normalise Nigerian numbers to E.164 (`0803…` → `+234803…`). Rate-limit this route (e.g. `slowapi`) and add a honeypot or Turnstile if spam appears.

### Gallery (home-page photos)
| GET `/gallery` | public · sorted by `order` · `{id, src, caption, order}` |
|---|---|
| POST · PUT/DELETE `/gallery/{id}` · PUT `/gallery/order` | admin |

The seed points at `assets/gallery/photo-01.jpg … photo-08.jpg` (files shipped with the site). Uploaded photos use the URL from `/uploads`.

### Hymns
| GET `/hymns?q=` | public · sorted by `number` |
|---|---|
| POST · PUT/DELETE `/hymns/{id}` | admin |

Hymn: `{id, number, title, author, verses: ["verse 1 text", "verse 2 text", …], chorus}`

### Prayer requests
| POST `/prayer-requests` | public · `{name, request, share_with_team}` → 201 |
|---|---|
| GET · PUT/DELETE `/prayer-requests/{id}` | admin · `status: new|praying|answered|archived` |

On create, email the Chaplain (Resend/Brevo) with the request. Private requests (`share_with_team:false`) go to the Chaplain only; never expose them through a public route.

### Counselling bookings
| POST `/counselling-bookings` | public · `{reference, name, anonymous, topic, preferred_date, preferred_time, mode, note}` → 201 |
|---|---|
| GET · PUT/DELETE `/counselling-bookings/{id}` | admin · `status: new|confirmed|done|cancelled` |

Notify the Chaplaincy office on create. Treat as confidential (admin role only).

### Giving (Paystack)
| POST `/giving/initialize` | public · `{purpose, amount, name, email}` → `{authorization_url, access_code, reference}` |
|---|---|
| GET `/giving/verify/{reference}` | public · → Donation (calls Paystack `GET /transaction/verify/{reference}`) |
| POST `/giving/webhook` | Paystack only |
| GET `/giving/transactions` | admin · paginated Donations |

Flow: the site posts to `/giving/initialize`; the backend calls Paystack `POST https://api.paystack.co/transaction/initialize` with the **secret key** (`amount` in kobo = naira × 100, `metadata.purpose`), saves a `pending` Donation and returns the `authorization_url` (redirect) or `access_code` (Paystack Popup). **Webhook verification:** compute `HMAC-SHA512(raw_request_body, PAYSTACK_SECRET_KEY)` and compare it with the `x-paystack-signature` header using `hmac.compare_digest`; read the *raw* body (`await request.body()`) before parsing JSON. On `charge.success`, mark the Donation `success` **idempotently by reference** and check that the amount and currency match. Optionally allow only Paystack's webhook IPs. The secret key lives only in the backend's environment, never in `config.js`.

### Dashboard
`GET /stats` (admin) → `{elders, cyf_leaders, messages, events, special_events, upcoming_events, devotions, subscribers, gallery, hymns, prayer_requests_new, counselling_new, donations_total}`

---

## 4. Daily devotion delivery (how subscribers get it)

1. **Schedule:** a job runs every morning at **06:00 Africa/Lagos**: APScheduler inside the FastAPI app, a system cron hitting a protected endpoint, or Render/Railway cron.
2. **Pick the devotion:** `SELECT * FROM devotions WHERE date = current_date AND status IN ('published','scheduled')`. If there isn't one, skip and alert the admin.
3. **Fan out:** for each active subscriber, send by their `channel`. Record each send in `devotion_deliveries (devotion_id, subscriber_id, channel, status, provider_id, sent_at)` with a unique key on `(devotion_id, subscriber_id, channel)`, so a re-run never double-sends.
4. **Email:** Resend or Brevo (both have free tiers and a Python SDK/HTTP API). Send HTML with the title, verse, body and a one-click unsubscribe link (`/unsubscribe?token=…` signed with `itsdangerous`). Add `List-Unsubscribe` headers. Batch sends (Resend batch API: 100 per call).
5. **WhatsApp:** Meta **WhatsApp Cloud API**. A business-initiated message outside the 24-hour customer window must be an **approved message template** (category *Utility* or *Marketing*). Create one such as `daily_devotion` with parameters `{{1}}` title, `{{2}}` scripture ref and `{{3}}` a short excerpt + link, and get it approved in WhatsApp Manager first. Free-form text only works within 24 hours of the subscriber messaging you. Meta charges per template conversation; collect explicit opt-in (the subscribe form) and honour "STOP" replies by setting `active=false`. Alternatives: Termii or Twilio (both still use Meta templates for WhatsApp).
6. **Retry and report:** retry failures with backoff (3 tries), then mark them `failed`; show counts on the dashboard.

---

## 5. Suggested FastAPI + PostgreSQL schema

SQLAlchemy 2.0 (or SQLModel) + Alembic migrations + Pydantic v2 schemas mirroring the JSON above. All tables have `id SERIAL PK`, `created_at timestamptz default now()` and `updated_at timestamptz`.

| Table | Columns |
|---|---|
| `admin_users` | email UNIQUE, password_hash, name, role (`admin`/`editor`/`media`), is_active, last_login_at |
| `settings` | key TEXT PK, value JSONB (one row per top-level key, e.g. `service_times`, `bank`) **or** a single-row table with JSONB columns |
| `chaplaincy_members` | role UNIQUE (`chaplain`/`assistant_chaplain`/`secretary`), name, title, photo_url, bio, phone, email, office_hours |
| `elders` | name, role, portfolio, department, phone, email, photo_url, bio, sort_order |
| `cyf_info` | single row: about, venue, instagram, youtube, meetings JSONB |
| `cyf_leaders` | name, role, department, level, phone, photo_url, sort_order |
| `cyf_applications` | name, department, level, whatsapp, interests TEXT[], status |
| `messages` | title, preacher, date, series, media_type, media_url, thumbnail_url, description, duration_seconds, published BOOL, cleaned_media_url |
| `jobs` | id UUID PK, type, status, progress NUMERIC, message_id FK, result_url, error, finished_at |
| `events` | title, starts_at timestamptz, ends_at, venue, description, banner_url, is_special BOOL, is_featured BOOL |
| `devotions` | date DATE, title, scripture_ref, scripture_text, body TEXT, author, status · index on (date, status) |
| `subscribers` | name, email (UNIQUE, nullable), whatsapp (nullable), channel, active BOOL, unsubscribe_token, confirmed_at |
| `devotion_deliveries` | devotion_id FK, subscriber_id FK, channel, status, provider_message_id, error, sent_at · UNIQUE(devotion_id, subscriber_id, channel) |
| `gallery_photos` | src_url, caption, sort_order |
| `hymns` | number UNIQUE, title, author, verses TEXT[] (or JSONB), chorus |
| `prayer_requests` | name, request TEXT, share_with_team BOOL, status |
| `counselling_bookings` | reference, name, anonymous BOOL, topic, preferred_date, preferred_time, mode, note, status |
| `donations` | reference UNIQUE, purpose, amount_kobo BIGINT, name, email, channel, status, paystack_payload JSONB, paid_at |
| `uploads` | url, storage_key, content_type, size, uploaded_by FK |

Suggested layout: `app/main.py`, `app/routers/{auth,content,people,devotions,subscribers,giving,uploads}.py`, `app/models.py`, `app/schemas.py`, `app/deps.py` (`get_db`, `get_current_admin`), `app/jobs/devotion_sender.py`.

---

## 6. What to build first (so the site goes live fastest)

1. `POST /auth/login`, `GET /auth/me` + CORS.
2. `GET/PUT /settings`, `GET/PUT /chaplaincy`, `/elders` CRUD + `/order`.
3. `POST /uploads` (photos for Chaplain, elders, gallery).
4. `/messages`, `/events`, `/devotions` + `/devotions/today` CRUD.
5. `POST /subscribers` (public) and `GET /subscribers`.
6. `POST /prayer-requests` with an email to the Chaplain, and `/counselling-bookings`.
7. `/gallery`, `/hymns`, `/cyf`, `/cyf/leaders`, `/stats`.
8. Then: the daily devotion sender job, Paystack (`/giving/*` + webhook), and recordings + AI clean-up jobs.

Load `data/seed.json` into the tables with a one-off script so the site looks identical on day one.
