/* ============================================================
   The Chapel of Faith, FUTA · data layer (api.js)
   One module, two adapters:
     • mock  – localStorage, seeded from data/seed.json (demo mode)
     • rest  – fetch() against CONFIG.API_BASE_URL with a Bearer JWT
   Every page (public site + admin) reads and writes through window.API.
   The REST paths and payloads are documented in API.md / openapi.yaml.
   ============================================================ */
(function () {
  'use strict';
  const CFG = window.CONFIG || {};
  const BASE = String(CFG.API_BASE_URL || '').replace(/\/+$/, '');
  const MODE = BASE ? 'rest' : 'mock';
  // Folder this script was loaded from (site root), so / and /admin/ both find data/seed.json
  const ROOT = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  const TOKEN_KEY = 'cof-admin-token';
  const DB_KEY = 'cof-db-v1';

  /* Collections and their REST paths. Singletons are plain objects. */
  const COLLECTIONS = {
    'elders': '/elders',
    'cyf-leaders': '/cyf/leaders',
    'messages': '/messages',
    'events': '/events',
    'devotions': '/devotions',
    'subscribers': '/subscribers',
    'gallery': '/gallery',
    'hymns': '/hymns',
    'prayer-requests': '/prayer-requests',
    'counselling-bookings': '/counselling-bookings',
    'cyf-applications': '/cyf/applications',
    'donations': '/giving/transactions'
  };
  const SINGLETONS = { settings: '/settings', chaplaincy: '/chaplaincy', cyf: '/cyf' };
  const ORDERED = ['elders', 'cyf-leaders', 'gallery'];

  const todayISO = () => { const d = new Date(Date.now() + 3600e3); return d.toISOString().slice(0, 10); }; // Africa/Lagos (UTC+1)
  const nowISO = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 16);
  const clone = o => JSON.parse(JSON.stringify(o));

  class ApiError extends Error { constructor(msg, status, detail) { super(msg); this.status = status; this.detail = detail; } }

  /* ---------------- Shared: image downscale for uploads ---------------- */
  function readAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  async function downscaleImage(file, max = 1280, quality = 0.8) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }

  /* ======================= MOCK ADAPTER ======================= */
  const Mock = (() => {
    let db = null, loading = null;
    const listeners = new Set();
    async function loadSeed() {
      if (window.COF_SEED) return clone(window.COF_SEED);
      const r = await fetch(ROOT + 'data/seed.json', { cache: 'no-store' });
      return r.json();
    }
    async function ready() {
      if (db) return db;
      if (loading) return loading;
      loading = (async () => {
        const seed = await loadSeed();
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) {}
        db = saved && saved.seed_version === seed.seed_version ? saved : seed;
        if (db === seed) persist();
        return db;
      })();
      return loading;
    }
    function persist() {
      try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
      catch (e) { throw new ApiError('Browser storage is full (demo mode). Delete a few uploaded images or reset the demo data.', 507); }
      listeners.forEach(fn => { try { fn(); } catch (e) {} });
    }
    addEventListener('storage', e => { if (e.key === DB_KEY && e.newValue) { try { db = JSON.parse(e.newValue); listeners.forEach(fn => fn()); } catch (x) {} } });
    const col = name => { if (!COLLECTIONS[name]) throw new ApiError('Unknown resource ' + name, 404); db[name] = db[name] || []; return db[name]; };
    const nextId = arr => arr.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1;

    function sortList(name, arr) {
      const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir;
      if (ORDERED.includes(name)) return arr.sort(by('order'));
      if (name === 'hymns') return arr.sort(by('number'));
      if (name === 'events') return arr.sort(by('starts_at'));
      if (name === 'messages' || name === 'devotions') return arr.sort(by('date', -1));
      return arr.sort(by('created_at', -1));
    }
    function filterList(name, arr, p) {
      return arr.filter(x => {
        if (p.published === true || p.published === 'true') {
          if (name === 'devotions' && !(x.status !== 'draft' && x.date <= todayISO())) return false;
          if (name === 'messages' && !x.published) return false;
        }
        if (p.status && x.status !== p.status) return false;
        if (p.upcoming && (x.ends_at || x.starts_at) < nowISO()) return false;
        if (p.special !== undefined && !!x.is_special !== (p.special === true || p.special === 'true')) return false;
        if (p.featured !== undefined && !!x.is_featured !== (p.featured === true || p.featured === 'true')) return false;
        if (p.series && x.series !== p.series) return false;
        if (p.q) { const q = String(p.q).toLowerCase(); if (!JSON.stringify(x).toLowerCase().includes(q)) return false; }
        return true;
      });
    }
    return {
      ready, onChange: fn => listeners.add(fn),
      async list(name, p = {}) {
        await ready();
        let arr = sortList(name, filterList(name, clone(col(name)), p));
        const total = arr.length, page = +p.page || 1, size = +p.page_size || 0;
        if (size) arr = arr.slice((page - 1) * size, page * size);
        return { items: arr, total, page, page_size: size || total };
      },
      async get(name, id) { await ready(); const x = col(name).find(x => x.id == id); if (!x) throw new ApiError('Not found', 404); return clone(x); },
      async create(name, data) {
        await ready(); const arr = col(name);
        const item = Object.assign({}, clone(data), { id: nextId(arr) });
        if (ORDERED.includes(name) && item.order == null) item.order = arr.length + 1;
        if (!item.created_at) item.created_at = new Date().toISOString().slice(0, 19);
        arr.push(item); persist(); return clone(item);
      },
      async update(name, id, data) {
        await ready(); const arr = col(name); const i = arr.findIndex(x => x.id == id);
        if (i < 0) throw new ApiError('Not found', 404);
        arr[i] = Object.assign({}, arr[i], clone(data), { id: arr[i].id }); persist(); return clone(arr[i]);
      },
      async remove(name, id) { await ready(); db[name] = col(name).filter(x => x.id != id); persist(); return { ok: true }; },
      async reorder(name, ids) { await ready(); const arr = col(name); ids.forEach((id, i) => { const x = arr.find(x => x.id == id); if (x) x.order = i + 1; }); persist(); return { ok: true }; },
      async getOne(name) { await ready(); return clone(db[name] || {}); },
      async saveOne(name, data) { await ready(); db[name] = Object.assign({}, db[name], clone(data)); persist(); return clone(db[name]); },
      async upload(file, kind) {
        if (/^image\//.test(file.type)) return { url: await downscaleImage(file, kind === 'avatar' ? 600 : 1280, 0.8) };
        if (file.size < 1.5e6) return { url: await readAsDataURL(file) };
        // Big audio/video: kept for this browser session only (localStorage can't hold it)
        return { url: URL.createObjectURL(file), session_only: true };
      },
      async login(email, password) {
        await new Promise(r => setTimeout(r, 450));
        if (String(email).trim().toLowerCase() === 'admin@chapel.demo' && password === 'demo1234')
          return { access_token: 'demo.' + Date.now(), token_type: 'bearer', user: { id: 1, name: 'Chapel Admin', email: 'admin@chapel.demo', role: 'admin' } };
        throw new ApiError('Incorrect email or password', 401);
      },
      async me() { return { id: 1, name: 'Chapel Admin', email: 'admin@chapel.demo', role: 'admin' }; },
      async subscribe(data) {
        await ready(); const arr = col('subscribers');
        const email = String(data.email || '').trim().toLowerCase();
        const existing = email && arr.find(s => s.email === email);
        if (existing) { Object.assign(existing, data, { email, active: true }); persist(); return Object.assign(clone(existing), { already: true }); }
        return this.create('subscribers', Object.assign({}, data, { email, active: true }));
      },
      async stats() {
        await ready(); const c = n => (db[n] || []).length;
        return {
          elders: c('elders'), cyf_leaders: c('cyf-leaders'), messages: c('messages'), events: c('events'),
          special_events: (db.events || []).filter(e => e.is_special).length,
          upcoming_events: (db.events || []).filter(e => (e.ends_at || e.starts_at) >= nowISO()).length,
          devotions: c('devotions'), subscribers: (db.subscribers || []).filter(s => s.active !== false).length,
          gallery: c('gallery'), hymns: c('hymns'),
          prayer_requests_new: (db['prayer-requests'] || []).filter(p => p.status === 'new').length,
          counselling_new: (db['counselling-bookings'] || []).filter(p => p.status === 'new').length,
          donations_total: (db.donations || []).reduce((s, d) => s + (+d.amount || 0), 0)
        };
      },
      async reset() { localStorage.removeItem(DB_KEY); db = null; loading = null; await ready(); persist(); }
    };
  })();

  /* ======================= REST ADAPTER ======================= */
  const Rest = (() => {
    const qs = p => { const u = new URLSearchParams(); Object.entries(p || {}).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && u.set(k, v)); const s = u.toString(); return s ? '?' + s : ''; };
    async function req(method, path, body, opts = {}) {
      const headers = { Accept: 'application/json' };
      const tok = getToken(); if (tok) headers.Authorization = 'Bearer ' + tok;
      let payload = body;
      if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload });
      if (r.status === 401 && !opts.noAuthRedirect) { setToken(null); window.dispatchEvent(new CustomEvent('api:unauthorized')); }
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('json') ? await r.json() : await r.text();
      if (!r.ok) {
        const d = data && data.detail; // FastAPI puts errors in "detail"
        const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map(e => (e.loc || []).slice(-1)[0] + ': ' + e.msg).join('; ') : (r.statusText || 'Request failed');
        throw new ApiError(msg, r.status, data);
      }
      return data;
    }
    const path = name => { const p = COLLECTIONS[name]; if (!p) throw new ApiError('Unknown resource ' + name, 404); return p; };
    const asPage = d => Array.isArray(d) ? { items: d, total: d.length, page: 1, page_size: d.length } : d;
    return {
      ready: async () => true, onChange() {},
      list: async (name, p = {}) => asPage(await req('GET', path(name) + qs(Object.assign({ page_size: 100 }, p)))),
      get: (name, id) => req('GET', path(name) + '/' + id),
      create: (name, data) => req('POST', path(name), data),
      update: (name, id, data) => req('PUT', path(name) + '/' + id, data),
      remove: (name, id) => req('DELETE', path(name) + '/' + id),
      reorder: (name, ids) => req('PUT', path(name) + '/order', { ids }),
      getOne: name => req('GET', SINGLETONS[name]),
      saveOne: (name, data) => req('PUT', SINGLETONS[name], data),
      async upload(file, kind) {
        let f = file;
        if (/^image\//.test(file.type) && file.size > 1.5e6) { // shrink big phone photos before upload
          const url = await downscaleImage(file, 2000, 0.85); const b = await (await fetch(url)).blob();
          f = new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
        }
        const fd = new FormData(); fd.append('file', f); fd.append('kind', kind || 'file');
        return req('POST', '/uploads', fd);
      },
      async login(email, password) {
        if (CFG.LOGIN_FORM_ENCODED) return req('POST', '/auth/login', new URLSearchParams({ username: email, password }), { noAuthRedirect: true });
        return req('POST', '/auth/login', { email, password }, { noAuthRedirect: true });
      },
      me: () => req('GET', '/auth/me'),
      subscribe: data => req('POST', '/subscribers', data),
      stats: () => req('GET', '/stats'),
      reset: async () => { throw new ApiError('Reset is only available in demo mode', 400); }
    };
  })();

  /* ======================= PUBLIC SURFACE ======================= */
  const A = MODE === 'rest' ? Rest : Mock;
  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  window.API = {
    mode: MODE, base: BASE, root: ROOT, Error: ApiError, today: todayISO,
    ready: () => A.ready(),
    onChange: fn => A.onChange(fn),
    list: (name, params) => A.list(name, params),          // -> { items, total, page, page_size }
    all: async (name, params) => (await A.list(name, params)).items,
    get: (name, id) => A.get(name, id),
    create: (name, data) => A.create(name, data),
    update: (name, id, data) => A.update(name, id, data),
    remove: (name, id) => A.remove(name, id),
    reorder: (name, ids) => A.reorder(name, ids),
    getOne: name => A.getOne(name),                        // settings | chaplaincy | cyf
    saveOne: (name, data) => A.saveOne(name, data),
    upload: (file, kind) => A.upload(file, kind),          // -> { url }
    subscribe: data => A.subscribe(data),
    stats: () => A.stats(),
    resetDemo: () => A.reset(),
    // Public helpers used by the site
    submitPrayer: data => A.create('prayer-requests', Object.assign({ status: 'new' }, data)),
    bookCounselling: data => A.create('counselling-bookings', Object.assign({ status: 'new' }, data)),
    joinCyf: data => A.create('cyf-applications', Object.assign({ status: 'new' }, data)),
    recordGift: data => A.create('donations', data), // demo only: in live mode the Paystack webhook records gifts
    async todayDevotion() {
      if (MODE === 'rest') { try { return await Rest.getTodayDevotion(); } catch (e) {} }
      const items = (await A.list('devotions', { published: true, page_size: 1 })).items;
      return items[0] || null;
    },
    // Auth
    async login(email, password) { const r = await A.login(email, password); setToken(r.access_token); return r; },
    logout() { setToken(null); },
    isAuthed: () => !!getToken(),
    me: () => A.me()
  };
  Rest.getTodayDevotion = () => fetch(BASE + '/devotions/today', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : null);
})();
