/* The Chapel of Faith, FUTA · site script (plain JS, no framework) */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const naira = n => '₦' + Number(n).toLocaleString('en-NG');
const ref = p => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- Loader ---------- */
window.addEventListener('load', () => setTimeout(() => $('#loader').classList.add('gone'), 1300));
setTimeout(() => $('#loader') && $('#loader').classList.add('gone'), 4000);

/* ---------- Toast ---------- */
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- Theme ---------- */
const root = document.documentElement;
try { const saved = localStorage.getItem('cof-theme'); if (saved) root.dataset.theme = saved; } catch (e) {}
$('#themeToggle').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('cof-theme', root.dataset.theme); } catch (e) {}
});

/* ---------- Nav ---------- */
const nav = $('#nav'), menuBtn = $('#menuBtn'), links = $('#navLinks');
const onScroll = () => { nav.classList.toggle('solid', scrollY > 30); $('#toTop').classList.toggle('show', scrollY > 900); };
addEventListener('scroll', onScroll, { passive: true }); onScroll();
menuBtn.addEventListener('click', () => { const o = links.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });
$$('a', links).forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); }));
$('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
$('#yr').textContent = new Date().getFullYear();

/* ---------- Floating light motes ---------- */
const cv = $('#motes'), cx = cv.getContext('2d'); let motes = [];
function sizeCv() { cv.width = cv.offsetWidth * devicePixelRatio; cv.height = cv.offsetHeight * devicePixelRatio; motes = Array.from({ length: 46 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: (Math.random() * 1.8 + .6) * devicePixelRatio, v: (Math.random() * .25 + .08) * devicePixelRatio, p: Math.random() * 6.28 })); }
sizeCv(); addEventListener('resize', sizeCv);
(function draw() {
  cx.clearRect(0, 0, cv.width, cv.height);
  for (const m of motes) { m.y -= m.v; m.p += .02; if (m.y < -10) { m.y = cv.height + 10; m.x = Math.random() * cv.width; }
    const a = .35 + Math.sin(m.p) * .3; cx.beginPath(); cx.arc(m.x + Math.sin(m.p) * 6, m.y, m.r, 0, 6.28); cx.fillStyle = `rgba(255,200,90,${a})`; cx.shadowBlur = 8; cx.shadowColor = 'rgba(255,170,60,.8)'; cx.fill(); }
  requestAnimationFrame(draw);
})();


/* ============================================================
   CONTENT: everything below is read through window.API (api.js).
   Demo mode = localStorage seeded from data/seed.json; live mode = the FastAPI backend.
   ============================================================ */
const PH = (v, label) => (v && String(v).trim()) ? esc(v) : `<span class="ph">${esc(label)}</span>`;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function fmtTime(t) { if (!t) return ''; if (!/^\d{1,2}:\d{2}$/.test(t)) return t; let [H, M] = t.split(':').map(Number); const ap = H >= 12 ? 'PM' : 'AM'; H = H % 12 || 12; return `${H}:${pad(M)} ${ap}`; }
function fmtDate(iso, opts) { if (!iso) return ''; const d = new Date(iso.length <= 10 ? iso + 'T12:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtDT(iso) { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
const imgSrc = u => !u ? '' : /^(data:|blob:|https?:|\/)/.test(u) ? u : u; // relative paths resolve from the site root
const avatar = (photo, cls) => photo ? `<div class="avatar ${cls || ''} has-photo"><img src="${esc(imgSrc(photo))}" alt="" loading="lazy"></div>` : silhouette(cls);
const pad = n => String(n).padStart(2, '0');
let SETTINGS = {};

/* ---------- Countdown to the next Sunday service (Africa/Lagos, UTC+1) ---------- */
function sundayService() { const s = (SETTINGS.service_times || []).find(x => x.day === 'Sunday' && x.time) || { label: 'Sunday Service', time: '09:00' }; return s; }
function nextService() {
  const [hh, mm] = (sundayService().time || '09:00').split(':').map(Number);
  const now = new Date();
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh - 1, mm || 0, 0)); // WAT = UTC+1
  const day = new Date(now.getTime() + 3600e3).getUTCDay();
  t.setUTCDate(t.getUTCDate() + (7 - day) % 7);
  if (t.getTime() + 2.5 * 3600e3 < now.getTime()) t.setUTCDate(t.getUTCDate() + 7);
  return t;
}
function tick() {
  const diff = nextService() - new Date();
  if (diff <= 0) { $('#cdLabel').textContent = 'Service is on now: join us!'; $('#streamCd').textContent = 'Live now'; return; }
  const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
  $('#cdD').textContent = d; $('#cdH').textContent = pad(h); $('#cdM').textContent = pad(m); $('#cdS').textContent = pad(s);
  $('#streamCd').textContent = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}
setInterval(tick, 1000);

/* ---------- Scripture of the day (KJV) ---------- */
const verses = [
  ['The just shall live by his faith.', 'Habakkuk 2:4'],
  ['The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
  ['Trust in the LORD with all thine heart; and lean not unto thine own understanding.', 'Proverbs 3:5'],
  ['I can do all things through Christ which strengtheneth me.', 'Philippians 4:13'],
  ['Now faith is the substance of things hoped for, the evidence of things not seen.', 'Hebrews 11:1'],
  ['Thy word is a lamp unto my feet, and a light unto my path.', 'Psalm 119:105'],
  ['Be strong and of a good courage; be not afraid… for the LORD thy God is with thee whithersoever thou goest.', 'Joshua 1:9']
];
let vi = Math.floor(Date.now() / 864e5) % verses.length; // today's verse first
const dots = $('#verseDots');
verses.forEach((v, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', v[1]); b.addEventListener('click', () => showVerse(i, true)); dots.appendChild(b); });
let vTimer;
function showVerse(i, user) {
  const q = $('#verse'); q.classList.add('fade');
  setTimeout(() => { vi = i; $('#verseText').textContent = verses[i][0]; $('#verseRef').textContent = verses[i][1]; $$('button', dots).forEach((b, j) => b.classList.toggle('on', j === i)); q.classList.remove('fade'); }, 400);
  if (user) { clearInterval(vTimer); vTimer = setInterval(() => showVerse((vi + 1) % verses.length), 6000); }
}
showVerse(vi); vTimer = setInterval(() => showVerse((vi + 1) % verses.length), 6000);

/* ---------- Scroll reveals + counters ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach(el => io.observe(el));
const cio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '', from = to > 1000 ? to - 60 : 0, t0 = performance.now();
  (function f(t) { const k = Math.min(1, (t - t0) / 1600), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = v + (k === 1 ? suf : ''); if (k < 1) requestAnimationFrame(f); })(t0); cio.unobserve(el); }), { threshold: .6 });
$$('[data-count]').forEach(el => cio.observe(el));

/* ---------- Generic modal ---------- */
const modal = $('#modal'), mBody = $('#modalBody');
function openModal(html) { mBody.innerHTML = html; modal.hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }
modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closePay(); } });
const silhouette = cls => `<div class="avatar ${cls || ''}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="12"/><path d="M8 62c2-14 12-22 24-22s22 8 24 22z"/></svg></div>`;


/* ---------- Plan a visit ---------- */
$('#planVisitBtn').addEventListener('click', () => {
  const s = sundayService();
  openModal(`<h3 id="modalTitle">Plan your visit</h3>
  <p class="muted">We’d love to welcome you. ${esc(s.label)} starts at ${fmtTime(s.time)} at the ${esc(SETTINGS.venue || 'Chapel of Faith, FUTA')}. Come as you are: ushers will help you find a seat.</p>
  <ul class="dl"><li><span>When</span><b>Sundays · ${fmtTime(s.time)}</b></li><li><span>Where</span><b>${esc(SETTINGS.venue || 'Chapel of Faith, FUTA')}</b></li></ul>
  <form class="form" id="visitForm"><label>Your name<input id="vName" placeholder="Your name" required></label>
  <label>Coming with<select><option>Just me</option><option>A friend</option><option>My family</option></select></label>
  <button class="btn gold full" type="submit">Save me a seat</button></form>`);
  $('#visitForm').addEventListener('submit', e => { e.preventDefault(); const n = $('#vName').value.trim() || 'friend';
    mBody.innerHTML = `<div style="text-align:center;padding:20px 0"><div style="font-size:3rem">⛪</div><h3 id="modalTitle">See you Sunday, ${esc(n)}!</h3><p class="muted">We’ll be looking out for you at ${fmtTime(s.time)}.</p><button class="btn gold" data-close>Amen</button></div>`; });
});

/* ---------- Settings: hero times, motto, footer, bank, WhatsApp, live ---------- */
function renderSettings(st) {
  SETTINGS = st || {};
  $('#heroMotto').innerHTML = `“${esc(st.motto || 'The just shall live by his faith.')}” <span>${esc(st.motto_ref || 'Habakkuk 2:4')}</span>`;
  const times = st.service_times || [];
  const when = t => t.day === 'Sunday' ? fmtTime(t.time) : (t.day && t.time ? `${t.day}s · ${fmtTime(t.time)}` : '');
  $('#heroTimes').innerHTML = times.map(t => `<div><b>${esc(t.label)}</b>${when(t) ? `<span>${esc(when(t))}</span>` : '<span class="ph">Day · time</span>'}</div>`).join('');
  $('#footTimes').innerHTML = times.map(t => when(t) ? `<li>${esc(t.label)} · ${esc(when(t))}</li>` : `<li class="ph">${esc(t.label)} · day &amp; time</li>`).join('');
  const s = sundayService(); $('#streamNext').textContent = `${s.label} · ${fmtTime(s.time)}`; $('#cdLabel').textContent = `Next ${s.label.toLowerCase().replace('service', 'service')} begins in`;
  const b = st.bank || {};
  $('#bankList').innerHTML = `<li><span>Bank</span><b>${PH(b.bank_name, 'Bank name')}</b></li><li><span>Account name</span><b>${PH(b.account_name, 'Chapel of Faith, FUTA')}</b></li><li><span>Account no.</span><b>${PH(b.account_number, '0000000000')}</b></li>`;
  $('#bankNote').textContent = b.account_number ? 'Use your name and “Tithe”, “Offering” or “Gift” as the narration.' : 'Placeholder details: the Chapel’s real account is added in Admin → Settings.';
  const wa = String(st.whatsapp || '').replace(/[^\d]/g, '');
  const waA = $('#waLink'); waA.href = wa ? `https://wa.me/${wa}` : '#'; waA.target = wa ? '_blank' : ''; waA.dataset.has = wa ? '1' : '';
  const yt = st.livestream_url || (st.socials || {}).youtube; if (yt) $('#ytLink').href = yt;
  renderLive(st);
  tick();
}
$('#waLink').addEventListener('click', e => { if (!e.currentTarget.dataset.has) { e.preventDefault(); toast('WhatsApp number to be added in Admin → Settings'); } });
function ytEmbed(url) {
  if (!url) return '';
  let m = url.match(/(?:youtu\.be\/|v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/); if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  m = url.match(/channel\/(UC[\w-]+)/); if (m) return `https://www.youtube.com/embed/live_stream?channel=${m[1]}&autoplay=1`;
  return '';
}
function renderLive(st) {
  const live = !!st.live_now; $('#player').dataset.live = live;
  $('#onAirTitle').innerHTML = `<b>${esc(st.live_title || 'Sunday Service')}</b>`;
  $('#liveState').innerHTML = live ? '<b style="color:#ff5a5a">● Live now</b> · ' + esc(st.live_title || '') : 'Off air · the Chapel goes live every Sunday';
  const scr = $('.player-screen'); let fr = $('iframe', scr);
  const src = live ? ytEmbed(st.livestream_url) : '';
  if (src && API.mode === 'rest') { if (!fr) { fr = document.createElement('iframe'); fr.allow = 'autoplay; encrypted-media; picture-in-picture'; fr.allowFullscreen = true; fr.className = 'live-frame'; scr.appendChild(fr); } if (fr.src !== src) fr.src = src; }
  else if (fr) fr.remove();
  // In demo mode the animated "on air" art stands in for the stream so the page never autoplays a random video.
}

/* ---------- Hero slideshow + home gallery (assets/gallery/photo-01.jpg … + Admin uploads) ---------- */
let slideI = 0, slideTimer, GALLERY = [];
function renderGallery(items) {
  GALLERY = items.filter(g => g.src);
  const hs = $('#heroSlides');
  hs.innerHTML = GALLERY.map((g, i) => `<div class="hs${i === 0 ? ' on' : ''}" style="background-image:url('${esc(imgSrc(g.src)).replace(/'/g, '%27')}')"></div>`).join('');
  $('#slideDots').innerHTML = GALLERY.map((g, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  slideI = 0; $('#slideCapText').textContent = GALLERY[0] ? GALLERY[0].caption || '' : '';
  clearInterval(slideTimer);
  if (GALLERY.length > 1) slideTimer = setInterval(() => showSlide((slideI + 1) % GALLERY.length), 5000);
  $('#galleryGrid').innerHTML = GALLERY.map((g, i) => `<button class="g-item${i === 0 ? ' wide' : ''}" data-g="${i}" aria-label="Open photo: ${esc(g.caption || 'Chapel photo')}"><img src="${esc(imgSrc(g.src))}" alt="${esc(g.caption || 'Chapel of Faith photo')}" loading="lazy"><span>${esc(g.caption || '')}</span></button>`).join('')
    || '<p class="empty">Photos from the media team will appear here.</p>';
}
function showSlide(i) {
  const s = $$('.hs', $('#heroSlides')); if (!s.length) return;
  s.forEach((el, j) => el.classList.toggle('on', j === i)); $$('#slideDots i').forEach((el, j) => el.classList.toggle('on', j === i));
  slideI = i; const cap = $('#slideCapText'); cap.classList.add('fade'); setTimeout(() => { cap.textContent = GALLERY[i].caption || ''; cap.classList.remove('fade'); }, 300);
}
let lbI = 0;
function openLightbox(i) {
  lbI = i; const g = GALLERY[i];
  openModal(`<div class="lightbox"><img src="${esc(imgSrc(g.src))}" alt="${esc(g.caption || '')}"><div class="lb-bar"><button type="button" class="icon-btn" id="lbPrev" aria-label="Previous photo">‹</button><p id="modalTitle">${esc(g.caption || '')}</p><button type="button" class="icon-btn" id="lbNext" aria-label="Next photo">›</button></div></div>`);
  $('.modal-card').classList.add('wide-card');
  $('#lbPrev').onclick = () => openLightbox((lbI - 1 + GALLERY.length) % GALLERY.length);
  $('#lbNext').onclick = () => openLightbox((lbI + 1) % GALLERY.length);
}
$('#galleryGrid').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) openLightbox(+b.dataset.g); });

/* ---------- Special events carousel ---------- */
let spTimer;
function icsFor(ev) {
  const f = s => s.replace(/[-:]/g, '').slice(0, 13) + '00';
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chapel of Faith FUTA//EN', 'BEGIN:VEVENT', 'UID:cof-' + ev.id + '@chapeloffaithfuta', 'DTSTART;TZID=Africa/Lagos:' + f(ev.starts_at), 'DTEND;TZID=Africa/Lagos:' + f(ev.ends_at || ev.starts_at), 'SUMMARY:' + ev.title, 'LOCATION:' + (ev.venue || ''), 'DESCRIPTION:' + (ev.description || '').replace(/\n/g, ' '), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
}
function daysTo(iso) { const d = Math.ceil((new Date(iso) - new Date()) / 864e5); return d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`; }
function renderSpecials(evs) {
  const sp = evs.filter(e => e.is_special);
  $('#specials').hidden = !sp.length;
  $('#spTrack').innerHTML = sp.map(ev => `<article class="sp-card" data-ev="${ev.id}">
    <div class="sp-img"${ev.banner ? ` style="background-image:url('${esc(imgSrc(ev.banner)).replace(/'/g, '%27')}')"` : ''}><span class="sp-chip">✦ Special event</span><span class="sp-when">${daysTo(ev.starts_at)}</span></div>
    <div class="sp-body"><h3>${esc(ev.title)}</h3><p>${esc(fmtDT(ev.starts_at))} · ${esc(ev.venue || '')}</p>
    <div class="row-btns"><button class="btn small gold" data-evd="${ev.id}">Details</button><a class="btn small ghost" href="${icsFor(ev)}" download="${esc(ev.title)}.ics">Add to calendar</a></div></div></article>`).join('');
  clearInterval(spTimer);
  if (sp.length > 1) spTimer = setInterval(() => spMove(1), 6000);
}
function spMove(d) { const t = $('#spTrack'), w = (t.firstElementChild || {}).offsetWidth || 300; const max = t.scrollWidth - t.clientWidth - 4; t.scrollTo({ left: t.scrollLeft + d * (w + 16) > max + 8 ? 0 : Math.max(0, t.scrollLeft + d * (w + 16)), behavior: 'smooth' }); }
$('#spPrev').addEventListener('click', () => { clearInterval(spTimer); spMove(-1); });
$('#spNext').addEventListener('click', () => { clearInterval(spTimer); spMove(1); });
let EVENTS = [];
function openEvent(id) {
  const ev = EVENTS.find(e => e.id == id); if (!ev) return;
  openModal(`${ev.banner ? `<div class="ev-banner" style="background-image:url('${esc(imgSrc(ev.banner)).replace(/'/g, '%27')}')"></div>` : ''}${ev.is_special ? '<p class="tag">✦ Special event</p>' : ''}<h3 id="modalTitle">${esc(ev.title)}</h3>
  <ul class="dl"><li><span>When</span><b>${esc(fmtDT(ev.starts_at))}${ev.ends_at ? ' – ' + esc(new Date(ev.ends_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })) : ''}</b></li><li><span>Where</span><b>${esc(ev.venue || 'Chapel of Faith')}</b></li></ul>
  <p>${esc(ev.description || '').replace(/\n/g, '<br>')}</p><div class="row-btns"><a class="btn small gold" href="${icsFor(ev)}" download="${esc(ev.title)}.ics">Add to calendar</a></div>`);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-evd]'); if (b) openEvent(b.dataset.evd); });

/* ---------- Events list ---------- */
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function renderEvents(evs) {
  EVENTS = evs;
  const weekly = (SETTINGS.service_times || []).filter(t => t.day && t.time).map(t => `<article class="event"><div class="date"><b>${t.day.slice(0, 3).toUpperCase()}</b><span>Weekly</span></div><div><h4>${esc(t.label)}</h4><p>${fmtTime(t.time)} · ${esc(SETTINGS.venue || 'Chapel of Faith')}</p></div></article>`);
  const dated = evs.map(ev => { const d = new Date(ev.starts_at); return `<button class="event${ev.is_special ? ' special' : ''}" data-evd="${ev.id}"><div class="date"><b>${pad(d.getDate())}</b><span>${MON[d.getMonth()]}</span></div><div><h4>${esc(ev.title)}${ev.is_special ? ' <em class="sp-mini">Special</em>' : ''}</h4><p>${esc(d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }))} · ${esc(ev.venue || '')}</p></div></button>`; });
  $('#eventsList').innerHTML = weekly.concat(dated).join('') || '<p class="empty">No upcoming events yet.</p>';
}

/* ---------- Daily devotion + subscribe ---------- */
let DEVOTIONS = [];
function devHTML(d) { return (d.body || '').split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''); }
function renderDevotion(d) {
  if (!d) { $('#devTitle').textContent = 'Devotions coming soon'; $('#devBody').innerHTML = '<p class="muted">The Chaplaincy will post the first devotion here.</p>'; return; }
  const isToday = d.date === API.today();
  $('#devDate').textContent = (isToday ? 'Today · ' : 'Latest · ') + fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' });
  $('#devTitle').textContent = d.title;
  $('#devVerse').textContent = d.scripture_text ? '“' + d.scripture_text + '”' : ''; $('#devRef').textContent = d.scripture_ref || '';
  $('#devBody').innerHTML = devHTML(d);
  $('#devAuthor').textContent = d.author ? '— ' + d.author : '';
  $('#devCard').classList.remove('flash'); void $('#devCard').offsetWidth; $('#devCard').classList.add('flash');
}
$('#devArchiveBtn').addEventListener('click', () => {
  openModal(`<p class="role">Daily devotion</p><h3 id="modalTitle">Past devotions</h3><ul class="dev-archive">${DEVOTIONS.map(d => `<li><button type="button" data-dv="${d.id}"><span>${esc(fmtDate(d.date, { day: 'numeric', month: 'short' }))}</span><b>${esc(d.title)}</b><small>${esc(d.scripture_ref || '')}</small></button></li>`).join('') || '<li class="empty">No devotions yet.</li>'}</ul>`);
});
$('#modal').addEventListener('click', e => { const b = e.target.closest('[data-dv]'); if (!b) return; const d = DEVOTIONS.find(x => x.id == b.dataset.dv);
  mBody.innerHTML = `<p class="role">${esc(fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p><h3 id="modalTitle">${esc(d.title)}</h3><blockquote class="dev-verse"><p>“${esc(d.scripture_text || '')}”</p><cite>${esc(d.scripture_ref || '')}</cite></blockquote><div class="dev-body">${devHTML(d)}</div><p class="dev-author">${d.author ? '— ' + esc(d.author) : ''}</p>`; });
$('#devShareBtn').addEventListener('click', async () => { const t = $('#devTitle').textContent + ' · ' + $('#devRef').textContent + ' · The Chapel of Faith, FUTA daily devotion';
  if (navigator.share) { try { await navigator.share({ title: 'Daily devotion', text: t, url: location.href.split('#')[0] + '#devotion' }); } catch (e) {} } else { try { await navigator.clipboard.writeText(t + ' ' + location.href.split('#')[0] + '#devotion'); toast('Link copied'); } catch (e) { toast(t); } } });
let subCh = 'email';
$('#subChannel').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; subCh = b.dataset.v; $$('button', $('#subChannel')).forEach(x => x.classList.toggle('on', x === b)); });
$('#subForm').addEventListener('submit', async e => { e.preventDefault();
  const name = $('#subName').value.trim(), email = $('#subEmail').value.trim(), whatsapp = $('#subPhone').value.trim();
  if ((subCh !== 'whatsapp') && !/^\S+@\S+\.\S+$/.test(email)) { $('#subEmail').focus(); toast('Add your email address'); return; }
  if ((subCh !== 'email') && whatsapp.replace(/\D/g, '').length < 10) { $('#subPhone').focus(); toast('Add your WhatsApp number'); return; }
  const btn = $('button[type=submit]', e.target); btn.disabled = true; btn.textContent = 'Subscribing…';
  try {
    const r = await API.subscribe({ name, email, whatsapp, channel: subCh });
    $('#subDoneText').textContent = (r && r.already ? 'Welcome back, ' : 'Thank you, ') + (name || 'friend') + '! The daily devotion will reach you every morning by ' + (subCh === 'both' ? 'email and WhatsApp' : subCh === 'whatsapp' ? 'WhatsApp' : 'email') + '.';
    showDone(e.target);
  } catch (err) { toast(err.message || 'Could not subscribe, please try again'); }
  finally { btn.disabled = false; btn.textContent = 'Subscribe'; }
});

/* ---------- Messages library ---------- */
// Audio/video files are uploaded in Admin → Messages (stored by the backend), or a YouTube/Mixlr link is used.
const AUDIO = 'assets/media/sample-message.mp3';
let messages = [], series = 'all', playing = -1;
const audio = $('#audio');
function renderSeries() {
  const ss = [...new Set(messages.map(m => m.series).filter(Boolean))];
  if (series !== 'all' && !ss.includes(series)) series = 'all';
  $('#seriesChips').innerHTML = ['all', ...ss].map(s => `<button class="chip${s === series ? ' on' : ''}" data-series="${esc(s)}">${s === 'all' ? 'All' : esc(s)}</button>`).join('');
}
function renderMsgs() {
  const q = $('#msgSearch').value.trim().toLowerCase();
  const list = messages.map((m, i) => ({ ...m, i })).filter(m => (series === 'all' || m.series === series) && (!q || (m.title + ' ' + m.preacher + ' ' + m.series).toLowerCase().includes(q)));
  $('#msgList').innerHTML = list.map(m => { const link = m.media_type === 'youtube' || m.media_type === 'mixlr';
    return `<article class="msg${m.isNew ? ' new' : ''}" data-i="${m.i}">
    <div class="msg-art"${m.thumbnail ? ` style="background-image:url('${esc(imgSrc(m.thumbnail))}');background-size:cover"` : ''}>${m.thumbnail ? '' : m.media_type === 'video' || m.media_type === 'youtube' ? '🎬' : m.media_type === 'mixlr' ? '📻' : '🎧'}</div>
    <div class="msg-info"><b>${esc(m.title)}</b><span>${PH(m.preacher, 'Preacher’s name')} · ${m.date ? esc(fmtDate(m.date)) : '<span class="ph">Date</span>'}</span><br><span class="series">${esc(m.series || '')}</span></div>
    <div class="msg-acts"><button class="round play" data-play="${m.i}" aria-label="Play ${esc(m.title)}">${link ? '↗' : playing === m.i && !audio.paused ? '❚❚' : '▶'}</button>
    ${link ? '' : `<a class="round" href="${esc(m.media_url || AUDIO)}" download="${esc(m.title)}" aria-label="Download ${esc(m.title)}">⤓</a>`}</div></article>`; }).join('');
  $('#msgEmpty').hidden = list.length > 0;
}
$('#msgSearch').addEventListener('input', renderMsgs);
$('#seriesChips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; series = b.dataset.series; $$('.chip', $('#seriesChips')).forEach(c => c.classList.toggle('on', c === b)); renderMsgs(); });
$('#msgList').addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b) play(+b.dataset.play); });
function play(i) {
  const m = messages[i];
  if (m.media_type === 'youtube') { const src = ytEmbed(m.media_url); if (src) { openModal(`<h3 id="modalTitle">${esc(m.title)}</h3><div class="video-wrap"><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`); $('.modal-card').classList.add('wide-card'); } else if (m.media_url) open(m.media_url, '_blank'); return; }
  if (m.media_type === 'mixlr') { if (m.media_url) open(m.media_url, '_blank'); return; }
  if (playing === i && !audio.paused) { audio.pause(); } else { if (playing !== i) { audio.src = m.media_url || AUDIO; playing = i; } audio.play().catch(() => {}); }
  $('#miniPlayer').hidden = false; document.body.classList.add('has-player');
  $('#mpTitle').textContent = m.title; $('#mpMeta').textContent = (m.preacher || 'Chapel of Faith') + ' · ' + (m.series || '');
  setTimeout(syncPlay, 50);
}
function syncPlay() { $('#mpPlay').textContent = audio.paused ? '▶' : '❚❚'; renderMsgs(); }
audio.addEventListener('play', syncPlay); audio.addEventListener('pause', syncPlay);
audio.addEventListener('timeupdate', () => { const p = audio.duration ? audio.currentTime / audio.duration : 0; $('#mpFill').style.width = (p * 100) + '%'; const s = Math.floor(audio.currentTime); $('#mpTime').textContent = Math.floor(s / 60) + ':' + pad(s % 60); });
$('#mpPlay').addEventListener('click', () => playing >= 0 && play(playing));
$('#mpBar').addEventListener('click', e => { if (!audio.duration) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * audio.duration; });
$('#mpClose').addEventListener('click', () => { audio.pause(); $('#miniPlayer').hidden = true; document.body.classList.remove('has-player'); playing = -1; renderMsgs(); });

/* ---------- Hymn book ---------- */
let hymns = [];
function renderHymns() {
  const q = $('#hymnSearch').value.trim().toLowerCase();
  const list = hymns.filter(h => !q || String(h.number) === q || h.title.toLowerCase().includes(q) || String(h.number).startsWith(q));
  $('#hymnList').innerHTML = list.length ? list.map(h => `<li><button data-h="${h.id}"><span class="hymn-no">${h.number}</span><span><b>${esc(h.title)}</b><small>${esc(h.author || '')} · ${(h.verses || []).length} verses</small></span></button></li>`).join('') : '<li class="empty">No hymn matches that number or title.</li>';
}
$('#hymnSearch').addEventListener('input', renderHymns);
$('#hymnList').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (b) openHymn(b.dataset.h); });
let lfs = 1.05;
function openHymn(id) {
  const h = hymns.find(x => x.id == id);
  const body = (h.verses || []).map((v, i) => `<div class="v"><i>Verse ${i + 1}</i>${esc(v).replace(/\n/g, '<br>')}</div>${h.chorus && i === 0 ? `<div class="v ch"><i>Chorus</i>${esc(h.chorus).replace(/\n/g, '<br>')}</div>` : ''}`).join('');
  openModal(`<p class="role">Hymn ${h.number}</p><h3 id="modalTitle">${esc(h.title)}</h3><p class="muted small-t">${esc(h.author || '')}</p>
  <div class="fs"><button type="button" id="fsDown" aria-label="Smaller text">A−</button><button type="button" id="fsUp" aria-label="Larger text">A+</button><span>Text size</span></div>
  <div class="lyrics" id="lyrics" style="--lfs:${lfs}rem">${body}</div>`);
  const L = $('#lyrics');
  $('#fsUp').addEventListener('click', () => { lfs = Math.min(1.9, lfs + .15); L.style.setProperty('--lfs', lfs + 'rem'); });
  $('#fsDown').addEventListener('click', () => { lfs = Math.max(.85, lfs - .15); L.style.setProperty('--lfs', lfs + 'rem'); });
}

/* ---------- Chaplaincy ---------- */
let CHAP = {};
function chapModal(key) {
  const p = CHAP[key] || {}, label = { chaplain: 'The Chaplain', assistant_chaplain: 'Assistant Chaplain', secretary: 'Chaplaincy Secretary' }[key];
  openModal(`<div class="profile-head">${avatar(p.photo, 'big')}<div><p class="role">${label}</p><h3 id="modalTitle">${PH(p.name, label + '’s name')}</h3><p class="muted" style="margin:0">${esc(p.title || label)}, The Chapel of Faith, FUTA</p></div></div>
  <p>${PH(p.bio, 'A short biography goes here: calling, years in ministry, and a word of welcome.')}</p>
  <ul class="dl"><li><span>Office phone</span><b>${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : '<span class="ph">+234 ___ ___ ____</span>'}</b></li><li><span>Email</span><b>${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '<span class="ph">chaplain@____.org</span>'}</b></li><li><span>Office hours</span><b>${PH(p.office_hours, 'Mon–Fri · __:__ – __:__')}</b></li></ul>
  <div class="row-btns"><a class="btn small gold" href="#counselling" data-close>Book counselling</a><a class="btn small ghost" href="#prayer" data-close>Send a prayer request</a></div>`);
}
function renderChaplaincy(c) {
  CHAP = c || {}; const p = CHAP.chaplain || {};
  $('#chaplainCard').innerHTML = `${avatar(p.photo, 'big')}<div><p class="role">The Chaplain</p><h3>${PH(p.name, 'Chaplain’s name')}</h3><p class="muted">${esc(p.title || 'Chaplain')}, Chapel of Faith, FUTA</p><p class="bio">${PH(p.bio && p.bio.length > 160 ? p.bio.slice(0, 157) + '…' : p.bio, 'Short bio: ordination, years of ministry, family and a word of welcome from the Chaplain.')}</p><span class="more">View profile →</span></div>`;
  $('#chapContact').innerHTML = `<h4>Chaplaincy office</h4><ul>
    <li><span>Phone</span><b>${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : '<span class="ph">+234 ___ ___ ____</span>'}</b></li>
    <li><span>Email</span><b>${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '<span class="ph">chaplain@____.org</span>'}</b></li>
    <li><span>Office hours</span><b>${PH(p.office_hours, 'Mon–Fri · __:__ – __:__')}</b></li><li><span>Office</span><b>Chapel of Faith, FUTA campus</b></li></ul>
    <div class="row-btns"><a class="btn small gold" href="#counselling">Book counselling</a><a class="btn small ghost" href="#prayer">Prayer request</a></div>`;
  $('#chapAssist').innerHTML = ['assistant_chaplain', 'secretary'].map(k => { const q = CHAP[k] || {}, lab = k === 'secretary' ? 'Chaplaincy Secretary' : 'Assistant Chaplain';
    return `<button class="mini-person" data-chap="${k}">${avatar(q.photo)}<div><b>${PH(q.name, lab + '’s name')}</b><span>${esc(q.title || lab)}</span></div></button>`; }).join('');
}
$('#chaplainCard').addEventListener('click', () => chapModal('chaplain'));
$('#chapAssist').addEventListener('click', e => { const b = e.target.closest('[data-chap]'); if (b) chapModal(b.dataset.chap); });

/* ---------- Council of Elders ---------- */
let elders = [];
function renderElders(list) {
  elders = list;
  $('#eldersGrid').innerHTML = list.map((e, i) => `<button class="elder" data-e="${i}">${avatar(e.photo)}<b>${PH(e.name, 'Elder’s name')}</b><span>${esc(e.role || 'Elder')}</span><small>${esc(e.portfolio || '')}${e.department ? ' · ' + esc(e.department) : ''}</small></button>`).join('');
}
$('#eldersGrid').addEventListener('click', ev => { const b = ev.target.closest('[data-e]'); if (!b) return; const e = elders[+b.dataset.e];
  openModal(`<div class="profile-head">${avatar(e.photo, 'big')}<div><p class="role">${esc(e.role || 'Elder')}${e.portfolio ? ' · ' + esc(e.portfolio) : ''}</p><h3 id="modalTitle">${PH(e.name, 'Elder’s full name')}</h3><p class="muted" style="margin:0">Council of Elders</p></div></div>
  <ul class="dl"><li><span>Department / Unit</span><b>${PH(e.department, 'Dept. of ____, FUTA')}</b></li><li><span>Portfolio</span><b>${PH(e.portfolio, 'Portfolio')}</b></li><li><span>Phone</span><b>${PH(e.phone, '+234 ___ ___ ____')}</b></li><li><span>Email</span><b>${PH(e.email, 'name@futa.edu.ng')}</b></li></ul>
  <p class="small-t">${PH(e.bio, 'A short note about this elder’s service in the Chapel.')}</p>`); });

/* ---------- CYF ---------- */
function renderCyf(c, leaders) {
  $('#cyfAbout').textContent = c.about || '';
  $('#cyfMeetings').innerHTML = (c.meetings || []).map(m => `<div class="when"><b>${PH(m.day, 'Day')}</b><span>${m.time ? esc(m.time) + ' · ' : '<span class="ph">time</span> · '}${esc(m.label || '')}</span></div>`).join('');
  $('#cyfVenue').textContent = c.venue ? 'Venue: ' + c.venue : '';
  if (c.instagram) $('#cyfIg').href = c.instagram; if (c.youtube) $('#cyfYt').href = c.youtube;
  $('#cyfLeaders').innerHTML = leaders.map(l => `<div class="leader">${avatar(l.photo)}<b>${PH(l.name, 'Name')}</b><span>${esc(l.role)}</span>${l.department || l.level ? `<small>${esc([l.department, l.level].filter(Boolean).join(' · '))}</small>` : ''}</div>`).join('');
}

/* ---------- Forms: helpers ---------- */
function showDone(form) { const d = $('.done', form); d.hidden = false; d.addEventListener('click', () => { d.hidden = true; form.reset(); }, { once: true }); }

/* CYF */
$('#cyfForm').addEventListener('submit', e => { e.preventDefault(); if (!$('#cyfName').value.trim()) { $('#cyfName').focus(); toast('Please add your name'); return; }
  API.joinCyf({ name: $('#cyfName').value.trim(), department: $('#cyfDept').value.trim(), level: $('#cyfLevel').value, whatsapp: $('#cyfPhone').value.trim(), interests: $$('.checks input:checked', e.target).map(x => x.value) }).catch(() => {});
  showDone(e.target); });

/* Counselling */
$('#anonToggle').addEventListener('change', e => { $('#cNameWrap').classList.toggle('hide-name', e.target.checked); if (e.target.checked) $('#cName').value = ''; });
$('#timeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', $('#timeSeg')).forEach(x => x.classList.toggle('on', x === b)); });
(() => { const d = new Date(Date.now() + 2 * 864e5); $('#cDate').value = d.toISOString().slice(0, 10); $('#cDate').min = new Date().toISOString().slice(0, 10); })();
$('#counselForm').addEventListener('submit', e => { e.preventDefault();
  const anon = $('#anonToggle').checked, who = anon ? 'Anonymous request' : ($('#cName').value.trim() || 'Your request');
  const slot = $('#timeSeg .on').dataset.v, d = $('#cDate').value ? new Date($('#cDate').value + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const r = ref('CNS');
  API.bookCounselling({ reference: r, name: anon ? 'Anonymous' : $('#cName').value.trim(), anonymous: anon, topic: $('#cTopic').value, preferred_date: $('#cDate').value, preferred_time: slot, mode: $('#cMode').value, note: $('#cNote').value.trim() }).catch(() => {});
  $('#counselDoneText').textContent = `${who} · ${$('#cTopic').value} · ${d}, ${slot} (${$('#cMode').value}). Ref ${r}. The Chaplaincy will confirm privately.`;
  showDone(e.target); });

/* ---------- Giving + Paystack-style DEMO checkout ---------- */
// DEMO ONLY. Going live: load https://js.paystack.co/v1/inline.js and call
//   PaystackPop.setup({ key: 'pk_live_xxx', email, amount: amount * 100, currency: 'NGN',
//                       metadata: { purpose }, callback: r => verifyOnServer(r.reference) }).openIframe();
// Verify every reference on the church's own server with the SECRET key. Never put a secret key in this file.
// With the FastAPI backend: POST /giving/initialize -> redirect to authorization_url; the Paystack webhook
// (POST /giving/webhook) confirms the payment. See API.md → Giving.
const notes = { 'Tithe': 'Your tithe, the first fruit of your increase.', 'Offering': 'A freewill offering for the work of the Chapel.', 'Gift': 'A special gift, thanksgiving or seed.', 'Building fund': 'Towards building and maintaining God’s house.' };
let gType = 'Tithe', gAmt = 5000;
const giveLabel = () => $('#giveBtn').textContent = gAmt > 0 ? `Give ${naira(gAmt)} now` : 'Enter an amount';
$('#giveTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; gType = b.dataset.type; $$('button', $('#giveTabs')).forEach(x => x.classList.toggle('on', x === b)); $('#giveNote').textContent = notes[gType]; });
$('#amounts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', $('#amounts')).forEach(x => x.classList.toggle('on', x === b));
  if (b.dataset.a === 'custom') { $('#customWrap').hidden = false; $('#customAmt').focus(); gAmt = +$('#customAmt').value.replace(/\D/g, '') || 0; } else { $('#customWrap').hidden = true; gAmt = +b.dataset.a; } giveLabel(); });
$('#customAmt').addEventListener('input', e => { gAmt = +e.target.value.replace(/\D/g, '') || 0; giveLabel(); });
const pay = $('#pay');
function step(id) { $$('.pay-step', pay).forEach(s => s.hidden = s.id !== id); $('#payMethods').style.visibility = (id === 'stepProc' || id === 'stepDone') ? 'hidden' : 'visible'; }
function closePay() { pay.hidden = true; document.body.style.overflow = ''; }
$('#giveForm').addEventListener('submit', e => { e.preventDefault();
  if (!(gAmt >= 100)) { toast('Please enter an amount of at least ₦100'); return; }
  const em = $('#gEmail').value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { $('#gEmail').focus(); toast('Add an email for your receipt'); return; }
  $('#payEmail').textContent = em; $('#payAmt').textContent = 'NGN ' + gAmt.toLocaleString('en-NG'); $('#payBtn').textContent = 'Pay NGN ' + gAmt.toLocaleString('en-NG');
  $$('#payMethods button').forEach((b, i) => b.classList.toggle('on', i === 0)); step('stepCard'); pay.hidden = false; document.body.style.overflow = 'hidden'; });
$('#payMethods').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#payMethods button').forEach(x => x.classList.toggle('on', x === b)); step({ card: 'stepCard', transfer: 'stepTransfer', ussd: 'stepUssd' }[b.dataset.m]); });
function process(channel) {
  step('stepProc');
  setTimeout(() => {
    const now = new Date(), reference = ref('COF');
    API.recordGift({ reference, purpose: gType, amount: gAmt, name: $('#gName').value.trim() || 'Anonymous', email: $('#gEmail').value.trim(), channel, status: 'test', created_at: now.toISOString().slice(0, 19) }).catch(() => {});
    $('#receipt').innerHTML = [['Reference', reference], ['For', gType], ['Amount', naira(gAmt)], ['Name', $('#gName').value.trim() || 'Anonymous'], ['Channel', channel], ['Date', now.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })], ['Status', 'Test · no charge']]
      .map(r => `<div><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('');
    step('stepDone');
  }, 1900);
}
$('#payBtn').addEventListener('click', () => process('Card ···· 4081'));
$$('[data-paid]', pay).forEach(b => b.addEventListener('click', () => process(b.closest('#stepTransfer') ? 'Bank transfer' : 'USSD')));
$('#payClose').addEventListener('click', closePay);
$('#payFinish').addEventListener('click', () => { closePay(); toast('🙏 Thank you! Receipt sent to your email (demo)'); });


/* ---------- Prayer requests ---------- */
// Saved through API.submitPrayer → POST /prayer-requests. The backend stores it and emails the Chaplain
// (see API.md → Prayer requests). The mailto: link stays as a fallback.
$('#pShare').addEventListener('change', e => $('#pShareLabel').textContent = e.target.checked ? 'Share with the prayer team' : 'Keep private (Chaplain only)');
$('#prayerForm').addEventListener('submit', async e => { e.preventDefault();
  const name = $('#pName').value.trim() || 'Anonymous', text = $('#pText').value.trim(), share = $('#pShare').checked, vis = share ? 'Share with the prayer team' : 'Private: Chaplain only';
  if (!text) { $('#pText').focus(); toast('Please write your prayer request'); return; }
  API.submitPrayer({ name, request: text, share_with_team: share }).catch(() => {});
  const mail = (CHAP.chaplain && CHAP.chaplain.email) || SETTINGS.contact_email || '';
  $('#mailtoLink').hidden = !mail;
  $('#mailtoLink').href = `mailto:${mail}?subject=${encodeURIComponent('Prayer request · ' + name)}&body=${encodeURIComponent(`From: ${name}\nVisibility: ${vis}\n\n${text}`)}`;
  $('#prayerDoneText').textContent = (share ? 'Shared with the prayer team too.' : 'Kept private between you and the Chaplain.') + ' We are standing with you in prayer.';
  showDone(e.target); });

/* ============================================================
   LOAD everything through the API
   ============================================================ */
async function loadAll() {
  try {
    await API.ready();
    const [st, chap, cyf, leaders, eld, msgs, evs, gal, hy, dev, devs] = await Promise.all([
      API.getOne('settings'), API.getOne('chaplaincy'), API.getOne('cyf'), API.all('cyf-leaders'), API.all('elders'),
      API.all('messages', { published: true }), API.all('events', { upcoming: true }), API.all('gallery'), API.all('hymns'),
      API.todayDevotion(), API.all('devotions', { published: true })
    ]);
    renderSettings(st); renderChaplaincy(chap); renderCyf(cyf, leaders); renderElders(eld);
    messages = msgs; renderSeries(); renderMsgs();
    renderSpecials(evs); renderEvents(evs); renderGallery(gal);
    hymns = hy; renderHymns();
    DEVOTIONS = devs; renderDevotion(dev);
    document.body.dataset.apiMode = API.mode;
  } catch (err) {
    console.error(err); toast('Could not load the latest content. Please refresh.');
  }
}
loadAll();
API.onChange(() => loadAll()); // demo mode: changes made in the Admin tab show up here live
})();
