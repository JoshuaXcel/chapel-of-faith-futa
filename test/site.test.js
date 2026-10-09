const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(S, p), 'utf8');

test('public page: title, viewport, scripts in order, no hard-coded people', () => {
  const h = read('index.html');
  assert.match(h, /<title>The Chapel of Faith, FUTA/);
  assert.match(h, /name="viewport" content="width=device-width/);
  const order = ['config.js', 'data/seed.js', 'api.js', 'script.js'].map(s => h.indexOf(`src="${s}"`));
  assert.ok(order.every(i => i > 0) && order.join() === [...order].sort((a, b) => a - b).join(), 'scripts load in order');
  for (const id of ['heroSlides', 'specials', 'galleryGrid', 'devotion', 'subForm', 'eldersGrid', 'cyfLeaders', 'chaplainCard', 'msgList', 'hymnList', 'eventsList', 'giveForm', 'prayerForm', 'counselForm', 'themeToggle'])
    assert.ok(h.includes(`id="${id}"`), 'has #' + id);
  assert.ok(!h.includes('Very Rev.'), 'chaplain name comes from the API, not the HTML');
});

test('admin page: login, demo creds, every screen', () => {
  const h = read('admin/index.html'), j = read('admin/admin.js');
  assert.match(h, /name="viewport"/);
  assert.ok(h.includes('admin@chapel.demo') && h.includes('demo1234'));
  for (const p of ['dashboard', 'chaplaincy', 'elders', 'cyf', 'messages', 'events', 'devotions', 'subscribers', 'gallery', 'settings', 'hymns', 'prayer-requests', 'counselling-bookings'])
    assert.ok(j.includes(`'${p}'`), 'nav has ' + p);
  assert.ok(j.includes('MediaRecorder') && j.includes('enumerateDevices'), 'recorder (beta) present');
});

test('local asset references exist', () => {
  for (const f of ['index.html', 'admin/index.html']) {
    const h = read(f), base = path.dirname(path.join(S, f));
    for (const m of h.matchAll(/(?:src|href)="([^"#:]+?)"/g)) {
      if (/^(https?|mailto|tel|sms)/.test(m[1]) || m[1].endsWith('/')) continue;
      assert.ok(fs.existsSync(path.join(base, m[1])), `${f} → ${m[1]}`);
    }
  }
  for (let i = 1; i <= 8; i++) assert.ok(fs.existsSync(path.join(S, `assets/gallery/photo-0${i}.jpg`)));
});

test('seed.json covers every resource and seed.js matches it', () => {
  const seed = JSON.parse(read('data/seed.json'));
  for (const k of ['settings', 'chaplaincy', 'elders', 'cyf', 'cyf-leaders', 'messages', 'events', 'devotions', 'subscribers', 'gallery', 'hymns', 'prayer-requests', 'counselling-bookings'])
    assert.ok(k in seed, 'seed has ' + k);
  assert.ok(seed.events.some(e => e.is_special), 'a special event exists');
  const ctx = { window: {} }; vm.runInNewContext(read('data/seed.js'), ctx);
  assert.strictEqual(JSON.stringify(ctx.window.COF_SEED), JSON.stringify(seed));
});

test('api.js mock adapter: CRUD, filters, subscribe, auth', async () => {
  const store = {};
  const ctx = { window: {}, document: { currentScript: { src: 'http://x/api.js' } }, location: { href: 'http://x/' }, console,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    addEventListener() {}, setTimeout, URL, FileReader: class {}, Image: class {}, fetch: async () => { throw new Error('no fetch'); } };
  ctx.window = ctx; ctx.window.CONFIG = { API_BASE_URL: '' };
  vm.runInNewContext(read('data/seed.js') + '\n' + read('api.js'), ctx);
  const API = ctx.API;
  assert.strictEqual(API.mode, 'mock');
  const elders = await API.all('elders'); assert.strictEqual(elders.length, 8);
  const e = await API.create('elders', { name: 'Test Elder', role: 'Elder' }); assert.ok(e.id > 8);
  await API.update('chaplaincy' === 'x' ? 'x' : 'elders', e.id, { name: 'Renamed' }); assert.strictEqual((await API.get('elders', e.id)).name, 'Renamed');
  await API.saveOne('chaplaincy', { chaplain: { name: 'New Chaplain' } }); assert.strictEqual((await API.getOne('chaplaincy')).chaplain.name, 'New Chaplain');
  await API.create('devotions', { date: '2000-01-01', title: 'Old', body: 'x', status: 'draft' });
  const pub = await API.all('devotions', { published: true }); assert.ok(pub.every(d => d.status !== 'draft'));
  const s1 = await API.subscribe({ name: 'A', email: 'A@x.org', channel: 'email' }); const s2 = await API.subscribe({ name: 'A', email: 'a@x.org', channel: 'email' });
  assert.strictEqual(s1.id, s2.id); assert.ok(s2.already);
  const page = await API.list('messages', { page: 1, page_size: 2 }); assert.strictEqual(page.items.length, 2); assert.ok(page.total >= 6);
  await assert.rejects(API.login('admin@chapel.demo', 'wrong'));
  await API.login('admin@chapel.demo', 'demo1234'); assert.ok(API.isAuthed());
});

test('contract files document every resource', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', 'API.md'), 'utf8'), y = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
  for (const p of ['/auth/login', '/chaplaincy', '/elders', '/cyf', '/messages', '/messages/recordings', '/jobs/{id}', '/events', '/devotions', '/subscribers', '/gallery', '/hymns', '/settings', '/prayer-requests', '/counselling-bookings', '/giving/webhook', '/uploads'])
    { assert.ok(md.includes(p), 'API.md has ' + p); assert.ok(y.includes(p + ':') || y.includes(p + '/'), 'openapi has ' + p); }
  assert.match(md, /x-paystack-signature/); assert.match(md, /template/i);
});
