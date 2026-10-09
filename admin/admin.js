/* The Chapel of Faith, FUTA · Admin panel (plain JS). All data goes through window.API (../api.js). */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SIL = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="12"/><path d="M8 62c2-14 12-22 24-22s22 8 24 22z"/></svg>';
const img = u => !u ? '' : /^(data:|blob:|https?:|\/)/.test(u) ? u : '../' + u;   // seed paths are relative to the site root
const bg = u => u ? ` style="background-image:url('${esc(img(u)).replace(/'/g, '%27')}')"` : '';
const fmtDate = (iso, o) => { if (!iso) return ''; const d = new Date(iso.length <= 10 ? iso + 'T12:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', o || { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtDT = iso => { const d = new Date(iso); return isNaN(d) ? (iso || '') : d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
const today = () => API.today();

/* ---------------- Toasts + confirm ---------------- */
function toast(msg, kind = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2800);
}
function confirmBox(title, text, yes = 'Delete') {
  return new Promise(res => {
    $('#cfTitle').textContent = title; $('#cfText').textContent = text; $('#cfYes').textContent = yes; $('#confirm').hidden = false; $('#cfYes').focus();
    const done = v => { $('#confirm').hidden = true; $('#cfYes').onclick = $('#cfNo').onclick = null; res(v); };
    $('#cfYes').onclick = () => done(true); $('#cfNo').onclick = () => done(false);
  });
}
const fail = e => { console.error(e); toast(e && e.message ? e.message : 'Something went wrong', 'err'); };

/* ---------------- Field renderers (shared by sheets and inline panels) ---------------- */
// field: { k, label, type: text|email|tel|url|textarea|date|time|datetime|select|toggle|image|media|number|lines|repeat, options, required, full, help, shape }
function fieldHTML(f, v) {
  const id = 'f_' + f.k.replace(/\W/g, '_');
  const cls = `field${f.full || ['textarea', 'image', 'media', 'lines', 'repeat'].includes(f.type) ? ' full' : ''}${f.required ? ' req' : ''}`;
  const help = f.help ? `<small class="help">${esc(f.help)}</small>` : '';
  if (v === undefined || v === null) v = f.default !== undefined ? (typeof f.default === 'function' ? f.default() : f.default) : '';
  switch (f.type) {
    case 'textarea': return `<label class="${cls}"><span>${esc(f.label)}</span><textarea id="${id}" data-k="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>${help}</label>`;
    case 'lines': return `<label class="${cls}"><span>${esc(f.label)}</span><textarea id="${id}" data-k="${f.k}" data-type="lines" rows="${f.rows || 8}" placeholder="${esc(f.ph || '')}">${esc((v || []).join('\n\n'))}</textarea>${help}</label>`;
    case 'select': return `<label class="${cls}"><span>${esc(f.label)}</span><select id="${id}" data-k="${f.k}">${f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>${help}</label>`;
    case 'toggle': return `<div class="${cls}"><span>${esc(f.label)}</span><label class="switch"><input type="checkbox" id="${id}" data-k="${f.k}" data-type="toggle"${v ? ' checked' : ''}><span></span>${esc(f.on || 'Yes')}</label>${help}</div>`;
    case 'image': return `<div class="${cls}"><span>${esc(f.label)}</span><div class="imgfield" data-img="${f.k}"><div class="imgprev ${f.shape || ''}" id="${id}_prev"${bg(v)}>${v ? '' : (f.shape === 'round' ? '👤' : '🖼')}</div>
      <div class="btns"><input type="hidden" data-k="${f.k}" id="${id}" value="${esc(v)}"><input type="file" accept="image/*" hidden id="${id}_file">
      <button type="button" class="btn ghost small" data-pick="${id}">${v ? 'Change photo' : 'Upload photo'}</button><button type="button" class="btn ghost small" data-clear="${id}"${v ? '' : ' hidden'}>Remove</button></div></div>${help}</div>`;
    case 'media': return `<div class="${cls}"><span>${esc(f.label)}</span><div class="media-choice">
      <div class="filebox" id="${id}_box"><span>🎧</span><div style="flex:1;min-width:0"><b id="${id}_name">${v && !/^https?:/.test(v) ? '✓ File attached' : 'No file yet'}</b><br><small>MP3, M4A or MP4 · or paste a YouTube / Mixlr link below</small></div>
      <input type="file" accept="audio/*,video/*" hidden id="${id}_file"><div class="media-alt"><button type="button" class="btn gold small" data-pickmedia="${id}">⤒ Upload file</button><button type="button" class="btn ghost small rec-open" data-record="${id}">🎙 Record from church sound (beta) <span class="badge warn">Coming soon</span></button></div></div>
      <input type="url" id="${id}" data-k="${f.k}" value="${esc(/^(data|blob):/.test(v) ? '' : v)}" data-full="${esc(v)}" placeholder="https://youtube.com/watch?v=…  or  https://mixlr.com/…"></div>${help}</div>`;
    case 'repeat': return `<div class="${cls}"><span>${esc(f.label)}</span><div class="repeat" data-repeat="${f.k}">${(v || []).map(r => repRow(f, r)).join('')}</div><button type="button" class="btn ghost small add-row" data-addrow="${f.k}">+ Add</button>${help}</div>`;
    case 'datetime': return `<label class="${cls}"><span>${esc(f.label)}</span><input type="datetime-local" id="${id}" data-k="${f.k}" value="${esc(String(v).slice(0, 16))}">${help}</label>`;
    default: return `<label class="${cls}"><span>${esc(f.label)}</span><input type="${f.type || 'text'}" id="${id}" data-k="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}"${f.list ? ` list="${id}_dl"` : ''}>${f.list ? `<datalist id="${id}_dl">${f.list().map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}${help}</label>`;
  }
}
const REPEATS = {};
function repRow(f, r = {}) {
  REPEATS[f.k] = f;
  return `<div class="rep-row">${f.cols.map(c => c.type === 'select'
    ? `<select data-c="${c.k}">${c.options.map(o => `<option value="${esc(o)}"${o === (r[c.k] || '') ? ' selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`
    : `<input data-c="${c.k}" type="${c.type || 'text'}" value="${esc(r[c.k] || '')}" placeholder="${esc(c.ph || '')}" aria-label="${esc(c.ph || c.k)}">`).join('')}<button type="button" data-delrow aria-label="Remove row">✕</button></div>`;
}
function wireFields(root) {
  root.addEventListener('click', async e => {
    const pick = e.target.closest('[data-pick]'); if (pick) { $('#' + pick.dataset.pick + '_file', root).click(); return; }
    const clr = e.target.closest('[data-clear]'); if (clr) { const id = clr.dataset.clear; $('#' + id, root).value = ''; const p = $('#' + id + '_prev', root); p.style.backgroundImage = ''; p.textContent = '🖼'; clr.hidden = true; return; }
    const pm = e.target.closest('[data-pickmedia]'); if (pm) { $('#' + pm.dataset.pickmedia + '_file', root).click(); return; }
    const rc = e.target.closest('[data-record]'); if (rc) { const id = rc.dataset.record; Recorder.open(async (file, url) => { const u = $('#' + id, root); u.value = ''; u.dataset.full = url; $('#' + id + '_name', root).textContent = '✓ ' + file.name + ' (recorded)'; const mt = $('[data-k="media_type"]', root); if (mt) mt.value = 'audio'; toast('Recording attached: add a title and save'); }); return; }
    const add = e.target.closest('[data-addrow]'); if (add) { const f = REPEATS[add.dataset.addrow]; $(`[data-repeat="${f.k}"]`, root).insertAdjacentHTML('beforeend', repRow(f)); return; }
    const del = e.target.closest('[data-delrow]'); if (del) { del.parentElement.remove(); }
  });
  root.addEventListener('change', async e => {
    const inp = e.target; if (inp.type !== 'file' || !inp.files[0]) return;
    const id = inp.id.replace(/_file$/, ''), file = inp.files[0], holder = inp.closest('.field');
    holder.classList.add('uploading');
    try {
      if (inp.accept.startsWith('image')) {
        const prev = $('#' + id + '_prev', root); prev.style.backgroundImage = `url('${URL.createObjectURL(file)}')`; prev.textContent = ''; // instant client-side preview
        const kind = prev.classList.contains('round') ? 'avatar' : 'image';
        const r = await API.upload(file, kind); $('#' + id, root).value = r.url; prev.style.backgroundImage = `url('${r.url.startsWith('data:') || r.url.startsWith('blob:') || /^https?:/.test(r.url) ? r.url : img(r.url)}')`;
        const b = $(`[data-pick="${id}"]`, root); if (b) b.textContent = 'Change photo'; const c = $(`[data-clear="${id}"]`, root); if (c) c.hidden = false;
        toast('Photo ready: save to publish it');
      } else {
        const r = await API.upload(file, 'media'); const u = $('#' + id, root); u.value = ''; u.dataset.full = r.url;
        $('#' + id + '_name', root).textContent = '✓ ' + file.name + (r.session_only ? ' (demo: kept for this session)' : '');
        const mt = $('[data-k="media_type"]', root); if (mt) mt.value = /video/.test(file.type) ? 'video' : 'audio';
        toast('File attached');
      }
    } catch (err) { fail(err); } finally { holder.classList.remove('uploading'); inp.value = ''; }
  });
}
function readFields(root, fields) {
  const out = {};
  fields.forEach(f => {
    if (f.type === 'repeat') { out[f.k] = $$(`[data-repeat="${f.k}"] .rep-row`, root).map(r => Object.fromEntries($$('[data-c]', r).map(i => [i.dataset.c, i.value.trim()]))).filter(r => Object.values(r).some(Boolean)); return; }
    const el = $(`[data-k="${f.k}"]`, root); if (!el) return;
    if (f.type === 'toggle') out[f.k] = el.checked;
    else if (f.type === 'lines') out[f.k] = el.value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    else if (f.type === 'number') out[f.k] = el.value === '' ? null : +el.value;
    else if (f.type === 'media') out[f.k] = el.value.trim() || el.dataset.full || '';
    else out[f.k] = el.value.trim();
  });
  return out;
}


/* ---------------- Recorder: "Record from church sound (beta)" ----------------
   getUserMedia + MediaRecorder with a live level meter. Works with any input the browser can see:
   a USB/aux interface fed from the mixer's REC OUT, or the device mic. In live mode the file is sent
   with POST /messages/recordings (see API.md); the AI clean-up toggle is a placeholder for Excel's model. */
const Recorder = (() => {
  let stream = null, rec = null, chunks = [], ctx = null, raf = 0, t0 = 0, acc = 0, tick = 0, blob = null, onSave = null;
  const el = id => $('#' + id);
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const elapsed = () => acc + (rec && rec.state === 'recording' ? (performance.now() - t0) / 1000 : 0);
  function state(txt, dot) { el('recState').textContent = txt; el('recDot').className = 'rec-dot ' + (dot || ''); }
  async function listDevices() {
    try { const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput'); const cur = el('recDevice').value;
      el('recDevice').innerHTML = devs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || 'Audio input ' + (i + 1))}</option>`).join('') || '<option value="">Default input</option>';
      if (cur && devs.some(d => d.deviceId === cur)) el('recDevice').value = cur;
      el('recDevNote').textContent = devs.length ? devs.length + ' input' + (devs.length > 1 ? 's' : '') + ' found. Pick the audio interface connected to the mixer.' : 'No input found: plug in the interface, then tap ↻.';
    } catch (e) { el('recDevNote').textContent = 'This browser cannot list audio inputs.'; }
  }
  async function startStream() {
    stopStream();
    const id = el('recDevice').value;
    stream = await navigator.mediaDevices.getUserMedia({ audio: id ? { deviceId: { exact: id }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false } });
    await listDevices();
    ctx = new (window.AudioContext || window.webkitAudioContext)(); const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const loop = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; const db = 20 * Math.log10(Math.sqrt(s / buf.length) || 1e-6);
      el('recLevel').style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%'; el('recTime').textContent = fmt(elapsed()); raf = requestAnimationFrame(loop); };
    loop();
  }
  function stopStream() { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; if (ctx) ctx.close().catch(() => {}); ctx = null; el('recLevel').style.width = '0'; }
  function reset() { chunks = []; acc = 0; blob = null; el('recTime').textContent = '00:00'; el('recPreview').hidden = true; el('recPreview').removeAttribute('src'); el('recSave').disabled = true;
    el('recStart').disabled = false; el('recStart').textContent = '● Record'; el('recPause').disabled = true; el('recStop').disabled = true; state('Ready'); }
  async function open(cb) {
    onSave = cb; reset(); el('recorder').hidden = false;
    if (!navigator.mediaDevices || !window.MediaRecorder) { el('recDevNote').textContent = 'This browser cannot record audio. Try Chrome or Edge.'; el('recStart').disabled = true; return; }
    await listDevices();
    try { await startStream(); state('Ready: input live'); } catch (e) { el('recDevNote').textContent = 'Microphone/input permission was blocked: allow it in the browser to record.'; }
  }
  function close() { if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } rec = null; stopStream(); el('recorder').hidden = true; }
  el('recDevice').addEventListener('change', () => { if (!rec || rec.state === 'inactive') startStream().catch(fail); });
  el('recRefresh').onclick = () => listDevices();
  el('recStart').onclick = async () => {
    try { if (!stream) await startStream(); } catch (e) { return fail(e); }
    chunks = []; acc = 0; const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 128000 } : undefined);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); el('recPreview').src = URL.createObjectURL(blob); el('recPreview').hidden = false; el('recSave').disabled = false; state('Recorded · ' + fmt(acc), ''); };
    rec.start(1000); t0 = performance.now(); state('Recording', 'on');
    el('recStart').disabled = true; el('recPause').disabled = false; el('recStop').disabled = false; el('recSave').disabled = true; el('recPreview').hidden = true;
  };
  el('recPause').onclick = () => { if (!rec) return;
    if (rec.state === 'recording') { rec.pause(); acc += (performance.now() - t0) / 1000; state('Paused', 'paused'); el('recPause').textContent = '● Resume'; }
    else if (rec.state === 'paused') { rec.resume(); t0 = performance.now(); state('Recording', 'on'); el('recPause').textContent = '❚❚ Pause'; } };
  el('recStop').onclick = () => { if (!rec || rec.state === 'inactive') return; if (rec.state === 'recording') acc += (performance.now() - t0) / 1000; rec.stop();
    el('recPause').disabled = true; el('recPause').textContent = '❚❚ Pause'; el('recStop').disabled = true; el('recStart').disabled = false; el('recStart').textContent = '● Record again'; };
  el('recSave').onclick = async () => { if (!blob) return; const b = el('recSave'); b.disabled = true; b.textContent = 'Saving…';
    try { const ext = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
      const file = new File([blob], `service-recording-${today()}.${ext}`, { type: blob.type });
      const r = await API.upload(file, 'media'); const cb = onSave; close(); cb && cb(file, r.url); }
    catch (e) { fail(e); } finally { b.textContent = 'Save as message'; } };
  $('#recorder').addEventListener('click', e => { if (e.target.closest('[data-rclose]')) close(); });
  return { open, close };
})();

/* ---------------- Slide-over editor ---------------- */
let sheetSubmit = null;
function openSheet(title, fields, data, onSave, saveLabel = 'Save') {
  $('#sheetTitle').textContent = title; $('#sheetSave').textContent = saveLabel;
  $('#sheetBody').innerHTML = `<div class="fgrid">${fields.map(f => fieldHTML(f, data[f.k])).join('')}</div>`;
  $('#sheet').hidden = false; document.body.style.overflow = 'hidden';
  sheetSubmit = async () => {
    const vals = readFields($('#sheetBody'), fields);
    const miss = fields.find(f => f.required && !vals[f.k]); if (miss) { toast(miss.label + ' is required', 'err'); $(`[data-k="${miss.k}"]`, $('#sheetBody')).focus(); return; }
    const btn = $('#sheetSave'); btn.disabled = true; btn.textContent = 'Saving…';
    try { await onSave(vals); closeSheet(); } catch (e) { fail(e); } finally { btn.disabled = false; btn.textContent = saveLabel; }
  };
  setTimeout(() => { const f = $('input:not([type=hidden]):not([type=file]),textarea', $('#sheetBody')); if (f && matchMedia('(min-width:700px)').matches) f.focus(); }, 60);
}
function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }
$('#sheetForm').addEventListener('submit', e => { e.preventDefault(); sheetSubmit && sheetSubmit(); });
$('#sheet').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
wireFields($('#sheetBody'));
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#confirm').hidden) $('#cfNo').click(); else if (!$('#recorder').hidden) Recorder.close(); else closeSheet(); } });

/* ---------------- Resource definitions ---------------- */
const seriesList = () => [...new Set((CACHE.messages || []).map(m => m.series).filter(Boolean))];
const CACHE = {};
const R = {
  elders: {
    title: 'Council of Elders', singular: 'elder', icon: '🕊️', ordered: true, intro: 'Add, edit, reorder or remove elders. Changes appear on the website’s Council of Elders section.',
    fields: [{ k: 'photo', label: 'Photo', type: 'image', shape: 'round' }, { k: 'name', label: 'Full name', required: true, ph: 'e.g. Prof. A. B. Adeyemi' }, { k: 'role', label: 'Role', ph: 'Chairman, Secretary, Elder…', default: 'Elder' }, { k: 'portfolio', label: 'Portfolio', ph: 'e.g. Welfare' }, { k: 'department', label: 'Department / unit', ph: 'e.g. Dept. of Physics, FUTA' }, { k: 'phone', label: 'Phone', type: 'tel' }, { k: 'email', label: 'Email', type: 'email' }, { k: 'bio', label: 'Short note', type: 'textarea', rows: 3 }],
    row: x => ({ thumb: x.photo, round: true, title: x.name || '<span class="ph">Name not set</span>', raw: !x.name, sub: [x.role, x.portfolio, x.department].filter(Boolean).join(' · ') })
  },
  'cyf-leaders': {
    title: 'CYF leadership', singular: 'leader', icon: '🔥', ordered: true,
    fields: [{ k: 'photo', label: 'Photo', type: 'image', shape: 'round' }, { k: 'name', label: 'Full name', required: true }, { k: 'role', label: 'Office', required: true, ph: 'President, Vice President…' }, { k: 'department', label: 'Department' }, { k: 'level', label: 'Level', type: 'select', options: ['', '100L', '200L', '300L', '400L', '500L', 'PG', 'Staff'] }, { k: 'phone', label: 'Phone', type: 'tel' }],
    row: x => ({ thumb: x.photo, round: true, title: x.name || '<span class="ph">Name not set</span>', raw: !x.name, sub: [x.role, x.department, x.level].filter(Boolean).join(' · ') })
  },
  messages: {
    title: 'Messages', singular: 'message', icon: '🎧', extraTools: '<button class="btn ghost small" data-recnew>🎙 Record (beta)</button>', intro: 'Upload sermon audio/video, or link a YouTube or Mixlr recording. Only published messages show on the website.',
    fields: [{ k: 'title', label: 'Title', required: true, full: true }, { k: 'preacher', label: 'Preacher' }, { k: 'date', label: 'Date', type: 'date', default: () => today() }, { k: 'series', label: 'Series', list: seriesList, ph: 'e.g. Living by Faith' },
      { k: 'media_type', label: 'Type', type: 'select', options: [['audio', 'Audio file'], ['video', 'Video file'], ['youtube', 'YouTube link'], ['mixlr', 'Mixlr link']] },
      { k: 'media_url', label: 'Recording', type: 'media' }, { k: 'thumbnail', label: 'Cover image (optional)', type: 'image', shape: 'wide' }, { k: 'description', label: 'Description', type: 'textarea', rows: 3 }, { k: 'published', label: 'Visibility', type: 'toggle', on: 'Published on the website', default: true }],
    row: x => ({ thumb: x.thumbnail, icon: { video: '🎬', youtube: '▶️', mixlr: '📻' }[x.media_type] || '🎧', wide: true, title: esc(x.title), sub: [x.preacher || 'Preacher not set', fmtDate(x.date), x.series].filter(Boolean).join(' · '), badges: [x.published ? ['Published', 'ok'] : ['Draft', 'off'], [x.media_type || 'audio', '']] })
  },
  events: {
    title: 'Events', singular: 'event', icon: '📅', intro: 'Flag an event as Special to show it in the banner carousel at the top of the home page.',
    fields: [{ k: 'title', label: 'Title', required: true, full: true }, { k: 'starts_at', label: 'Starts', type: 'datetime', required: true }, { k: 'ends_at', label: 'Ends', type: 'datetime' }, { k: 'venue', label: 'Venue', full: true, default: 'Chapel of Faith Auditorium' },
      { k: 'banner', label: 'Banner image', type: 'image', shape: 'wide' }, { k: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { k: 'is_special', label: 'Special event', type: 'toggle', on: 'Show in the home-page banner' }, { k: 'is_featured', label: 'Featured', type: 'toggle', on: 'Feature on the home page' }],
    row: x => ({ thumb: x.banner, wide: true, icon: '📅', title: esc(x.title), sub: fmtDT(x.starts_at) + (x.venue ? ' · ' + x.venue : ''), badges: [x.is_special && ['Special', 'gold'], x.is_featured && ['Featured', 'warn'], (x.ends_at || x.starts_at) < new Date(Date.now() + 3600e3).toISOString().slice(0, 16) && ['Past', 'off']].filter(Boolean) })
  },
  devotions: {
    title: 'Daily devotions', singular: 'devotion', icon: '📖', intro: 'Write ahead and schedule: a devotion shows on the website (and goes to subscribers) on its date once it is Published or Scheduled.',
    fields: [{ k: 'date', label: 'Date', type: 'date', required: true, default: () => today() }, { k: 'status', label: 'Status', type: 'select', options: [['published', 'Published'], ['scheduled', 'Scheduled (goes out on its date)'], ['draft', 'Draft']], default: 'published' },
      { k: 'title', label: 'Title', required: true, full: true }, { k: 'scripture_ref', label: 'Scripture reference', ph: 'e.g. Psalm 46:1' }, { k: 'author', label: 'Author', default: 'The Chaplaincy' },
      { k: 'scripture_text', label: 'Scripture text', type: 'textarea', rows: 2 }, { k: 'body', label: 'Devotion', type: 'textarea', rows: 9, required: true, help: 'Leave a blank line between paragraphs.' }],
    row: x => ({ icon: '📖', title: esc(x.title), sub: fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + (x.scripture_ref ? ' · ' + x.scripture_ref : ''), badges: [x.date === today() && ['Today', 'gold'], [x.status, x.status === 'published' ? 'ok' : x.status === 'scheduled' ? 'warn' : 'off']].filter(Boolean) })
  },
  hymns: {
    title: 'Hymn book', singular: 'hymn', icon: '🎵',
    fields: [{ k: 'number', label: 'Number', type: 'number', required: true }, { k: 'title', label: 'Title', required: true }, { k: 'author', label: 'Author / source', full: true }, { k: 'verses', label: 'Verses', type: 'lines', rows: 12, help: 'One verse per paragraph: leave a blank line between verses.' }, { k: 'chorus', label: 'Chorus (optional)', type: 'textarea', rows: 4 }],
    row: x => ({ icon: '<b style="font-family:var(--serif);font-size:1.4rem">' + esc(x.number) + '</b>', title: esc(x.title), sub: (x.author || '') + ' · ' + (x.verses || []).length + ' verses' })
  },
  'prayer-requests': {
    title: 'Prayer requests', singular: 'prayer request', icon: '🙏', noAdd: true, intro: 'Requests sent from the website. Private ones are for the Chaplain only.',
    fields: [{ k: 'status', label: 'Status', type: 'select', options: [['new', 'New'], ['praying', 'Praying'], ['answered', 'Answered'], ['archived', 'Archived']] }, { k: 'name', label: 'From' }, { k: 'request', label: 'Request', type: 'textarea', rows: 6 }, { k: 'share_with_team', label: 'Sharing', type: 'toggle', on: 'Shared with the prayer team' }],
    row: x => ({ icon: '🙏', title: esc(x.name || 'Anonymous') + ' · ' + esc(String(x.request || '').slice(0, 70)), sub: fmtDT(x.created_at), badges: [[x.status, x.status === 'new' ? 'gold' : 'off'], [x.share_with_team ? 'Prayer team' : 'Private', '']] })
  },
  'counselling-bookings': {
    title: 'Counselling', singular: 'booking', icon: '🤝', noAdd: true, intro: 'Session requests from the website. Confirm them privately with the person.',
    fields: [{ k: 'status', label: 'Status', type: 'select', options: [['new', 'New'], ['confirmed', 'Confirmed'], ['done', 'Done'], ['cancelled', 'Cancelled']] }, { k: 'name', label: 'Name' }, { k: 'topic', label: 'Area' }, { k: 'preferred_date', label: 'Preferred date', type: 'date' }, { k: 'preferred_time', label: 'Preferred time' }, { k: 'mode', label: 'Session type' }, { k: 'note', label: 'Note', type: 'textarea', rows: 3 }],
    row: x => ({ icon: '🤝', title: esc(x.anonymous ? 'Anonymous' : (x.name || 'Anonymous')) + ' · ' + esc(x.topic || ''), sub: [fmtDate(x.preferred_date), x.preferred_time, x.mode].filter(Boolean).join(' · '), badges: [[x.status, x.status === 'new' ? 'gold' : 'off']] })
  }
};

/* ---------------- Generic list page ---------------- */
async function listPage(name, opts = {}) {
  const def = R[name]; const host = opts.host || $('#content');
  const items = await API.all(name); CACHE[name] = items;
  const q = (host.dataset.q || '').toLowerCase();
  const shown = q ? items.filter(x => JSON.stringify(x).toLowerCase().includes(q)) : items;
  const rows = shown.map((x, i) => { const r = def.row(x);
    const th = r.thumb ? `<div class="thumb${r.round ? ' round' : ''}${r.wide ? ' wide' : ''}"${bg(r.thumb)}></div>` : `<div class="thumb${r.round ? ' round' : ''}${r.wide ? ' wide' : ''}">${r.round ? SIL : (r.icon || '•')}</div>`;
    return `<div class="row" data-id="${x.id}">${th}<div class="row-main"><b>${r.title}</b><small>${esc(r.sub || '')}</small>${(r.badges || []).length ? `<div class="badges">${r.badges.map(b => `<span class="badge ${b[1]}">${esc(b[0])}</span>`).join('')}</div>` : ''}</div>
      <div class="row-acts">${def.ordered && !q ? `<button data-up="${x.id}" aria-label="Move up"${i === 0 ? ' disabled' : ''}>↑</button><button data-down="${x.id}" aria-label="Move down"${i === shown.length - 1 ? ' disabled' : ''}>↓</button>` : ''}<button data-edit="${x.id}" aria-label="Edit">✎</button><button class="del" data-del="${x.id}" aria-label="Delete">🗑</button></div></div>`; }).join('');
  host.innerHTML = `${opts.noHead ? '' : `<div class="page-head"><p>${esc(def.intro || '')}</p><div class="tools"><input type="search" placeholder="Search ${esc(def.title.toLowerCase())}…" value="${esc(host.dataset.q || '')}" data-search>${def.extraTools || ''}${def.noAdd ? '' : `<button class="btn gold small" data-add>+ Add ${esc(def.singular)}</button>`}</div></div>`}
    <div class="list">${rows || `<div class="empty">No ${esc(def.title.toLowerCase())} yet.${def.noAdd ? '' : ' Tap “Add” to create the first one.'}</div>`}</div>`;
  if (opts.flash) { const el = $(`.row[data-id="${opts.flash}"]`, host); if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
  host.onclick = async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-add]')) return editItem(name, null, host, opts);
    if (t.matches('[data-recnew]')) return Recorder.open((file, url) => editItem(name, { title: 'Recording · ' + fmtDate(today()), date: today(), media_type: 'audio', media_url: url, published: false, _recName: file.name }, host, opts, true));
    if (t.dataset.edit) return editItem(name, items.find(x => x.id == t.dataset.edit), host, opts);
    if (t.dataset.del) { const x = items.find(x => x.id == t.dataset.del); const r = def.row(x);
      if (await confirmBox(`Delete this ${def.singular}?`, `“${(x.title || x.name || r.sub || 'Item').toString().slice(0, 60)}” will be removed from the website.`)) { try { await API.remove(name, x.id); toast(cap(def.singular) + ' deleted'); listPage(name, opts); refreshCounts(); } catch (err) { fail(err); } } return; }
    if (t.dataset.up || t.dataset.down) { const id = t.dataset.up || t.dataset.down, ids = items.map(x => x.id), i = ids.findIndex(v => v == id), j = t.dataset.up ? i - 1 : i + 1;
      [ids[i], ids[j]] = [ids[j], ids[i]]; try { await API.reorder(name, ids); toast('Order updated'); listPage(name, Object.assign({}, opts, { flash: id })); } catch (err) { fail(err); } }
  };
  const s = $('[data-search]', host); if (s) s.oninput = () => { host.dataset.q = s.value; listPage(name, opts).then(() => { const n = $('[data-search]', host); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); };
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function editItem(name, item, host, opts, isNew) {
  const def = R[name]; const prefill = item || {}; if (isNew) item = null;
  openSheet(item ? `Edit ${def.singular}` : `New ${def.singular}`, def.fields, prefill, async vals => {
    const saved = item ? await API.update(name, item.id, vals) : await API.create(name, vals);
    toast(item ? `${cap(def.singular)} updated` : `${cap(def.singular)} added`);
    await listPage(name, Object.assign({}, opts, { flash: saved.id })); refreshCounts();
  }, item ? 'Save changes' : `Add ${def.singular}`);
}

/* ---------------- Pages ---------------- */
const PERSON_FIELDS = [{ k: 'photo', label: 'Photo', type: 'image', shape: 'round' }, { k: 'name', label: 'Full name', ph: 'e.g. Very Rev. …' }, { k: 'title', label: 'Title' }, { k: 'phone', label: 'Office phone', type: 'tel' }, { k: 'email', label: 'Email', type: 'email' }, { k: 'office_hours', label: 'Office hours', ph: 'Mon–Fri · 9:00 AM – 4:00 PM' }, { k: 'bio', label: 'Short bio', type: 'textarea', rows: 4 }];
const PAGES = {
  async dashboard() {
    const [s, devs, subs, evs] = await Promise.all([API.stats(), API.all('devotions'), API.all('subscribers'), API.all('events', { upcoming: true })]);
    const td = devs.find(d => d.date === today() && d.status !== 'draft');
    const card = (ic, n, label, href, hot) => `<a class="stat${hot ? ' hot' : ''}" href="#${href}"><i>${ic}</i><b>${n}</b><span>${label}</span></a>`;
    $('#content').innerHTML = `
      <div class="welcome"><img src="../assets/emblem-sm.png" alt="" width="52" height="58"><div><h2>${greet()}, Admin</h2><p>${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · here is the Chapel at a glance.</p></div></div>
      <div class="stats">
        ${card('📬', s.subscribers, 'Devotion subscribers', 'subscribers', 1)}${card('🎧', s.messages, 'Messages', 'messages')}${card('📅', s.upcoming_events, 'Upcoming events', 'events')}${card('✦', s.special_events, 'Special events', 'events')}
        ${card('📖', s.devotions, 'Devotions', 'devotions')}${card('🕊️', s.elders, 'Elders', 'elders')}${card('🙏', s.prayer_requests_new, 'New prayer requests', 'prayer-requests', s.prayer_requests_new)}${card('🤝', s.counselling_new, 'Counselling requests', 'counselling-bookings', s.counselling_new)}
      </div>
      <div class="two-col">
        <div class="panel"><h3>📖 Today’s devotion</h3>${td ? `<div class="dev-today"><span class="badge ok">${esc(td.status)}</span><b>${esc(td.title)}</b><small class="muted">${esc(td.scripture_ref || '')} · ${esc(td.author || '')}</small></div>` : `<div class="dev-today"><b>Nothing scheduled for today</b><small class="muted">Subscribers get today’s devotion each morning. Write one now.</small></div><div class="panel-foot"><button class="btn gold small" data-go="devotions" data-new="1">Write today’s devotion</button></div>`}</div>
        <div class="panel"><h3>⚡ Quick actions</h3><div class="quick">
          <button data-go="messages" data-new="1"><b>🎧 Upload a message</b><span>Audio, video or link</span></button>
          <button data-go="events" data-new="1"><b>📅 Add an event</b><span>Mark it special</span></button>
          <button data-go="gallery"><b>🖼 Gallery photos</b><span>Home-page pictures</span></button>
          <button data-go="chaplaincy"><b>✝ Chaplaincy</b><span>Update the Chaplain</span></button></div></div>
        <div class="panel"><h3>📬 Newest subscribers</h3><div class="kv">${subs.slice(0, 5).map(x => `<div><b>${esc(x.name || x.email)}</b><span>${esc(x.channel)} · ${fmtDate(x.created_at)}</span></div>`).join('') || '<p class="muted">No subscribers yet.</p>'}</div></div>
        <div class="panel"><h3>📅 Coming up</h3><div class="kv">${evs.slice(0, 5).map(x => `<div><b>${esc(x.title)}${x.is_special ? ' <span class="badge gold">Special</span>' : ''}</b><span>${fmtDT(x.starts_at)}</span></div>`).join('') || '<p class="muted">No upcoming events.</p>'}</div></div>
      </div>
      <div class="panel"><h3>🔌 Data source</h3><p class="muted" style="margin:0">${API.mode === 'mock' ? 'Demo mode: changes are saved in this browser only, so you can try everything safely. Set <code>API_BASE_URL</code> in <code>config.js</code> to connect the FastAPI backend (see API.md).' : 'Connected to <code>' + esc(API.base) + '</code>.'}</p>${API.mode === 'mock' ? '<div class="panel-foot"><button class="btn ghost small" id="resetDemo">Reset demo data</button></div>' : ''}</div>`;
    $('#content').onclick = async e => {
      const b = e.target.closest('[data-go]'); if (b) { if (b.dataset.new) PENDING_NEW = b.dataset.go; location.hash = b.dataset.go; return; }
      if (e.target.id === 'resetDemo' && await confirmBox('Reset demo data?', 'Everything you changed in this browser goes back to the starting sample data.', 'Reset')) { await API.resetDemo(); toast('Demo data reset'); route(); }
    };
  },
  async chaplaincy() {
    const c = await API.getOne('chaplaincy');
    const roles = [['chaplain', 'The Chaplain'], ['assistant_chaplain', 'Assistant Chaplain'], ['secretary', 'Chaplaincy Secretary']];
    $('#content').innerHTML = `<div class="page-head"><p>Update the Chaplaincy team. When a new Chaplain is appointed, change the name, photo and contacts here: the website updates everywhere.</p></div>
      <div class="person-grid">${roles.map(([k, lab]) => `<form class="panel" data-role="${k}" novalidate><h3>${k === 'chaplain' ? '✝' : '👤'} ${lab}</h3><div class="fgrid">${PERSON_FIELDS.map(f => fieldHTML(Object.assign({}, f, { k: f.k }), (c[k] || {})[f.k])).join('')}</div><div class="panel-foot"><button class="btn gold" type="submit">Save ${lab.replace('The ', '')}</button></div></form>`).join('')}</div>`;
    $$('form[data-role]').forEach(fm => { wireFields(fm); fm.onsubmit = async e => { e.preventDefault(); const btn = $('button[type=submit]', fm); btn.disabled = true;
      try { const vals = readFields(fm, PERSON_FIELDS); await API.saveOne('chaplaincy', { [fm.dataset.role]: vals }); toast($('h3', fm).textContent.replace(/^\S+\s/, '') + ' saved'); } catch (err) { fail(err); } finally { btn.disabled = false; } }; });
  },
  async elders() { await listPage('elders'); },
  async cyf() {
    const c = await API.getOne('cyf');
    const F = [{ k: 'about', label: 'About CYF', type: 'textarea', rows: 3 }, { k: 'venue', label: 'Venue' }, { k: 'instagram', label: 'Instagram link', type: 'url' },
      { k: 'meetings', label: 'Meeting times', type: 'repeat', cols: [{ k: 'label', ph: 'What (e.g. CYF Service)' }, { k: 'day', ph: 'Day (e.g. Tuesdays)' }, { k: 'time', ph: 'Time (e.g. 6:00 PM)' }] }];
    $('#content').innerHTML = `<div class="page-head"><p>When CYF changes its leadership, update the executives here. Meeting times show on the website’s CYF section.</p><div class="tools"><button class="btn gold small" id="addLeader">+ Add leader</button></div></div>
      <div class="panel"><h3>🔥 Executives</h3><div id="leadersHost" data-q=""></div></div>
      <form class="panel" id="cyfForm" novalidate><h3>🗓 Fellowship details</h3><div class="fgrid">${F.map(f => fieldHTML(f, c[f.k])).join('')}</div><div class="panel-foot"><button class="btn gold" type="submit">Save details</button></div></form>`;
    const host = $('#leadersHost'); await listPage('cyf-leaders', { host, noHead: true });
    $('#addLeader').onclick = () => editItem('cyf-leaders', null, host, { host, noHead: true });
    const fm = $('#cyfForm'); wireFields(fm); fm.onsubmit = async e => { e.preventDefault(); try { await API.saveOne('cyf', readFields(fm, F)); toast('CYF details saved'); } catch (err) { fail(err); } };
  },
  async messages() { await listPage('messages'); },
  async events() { await listPage('events'); },
  async devotions() { await listPage('devotions'); },
  async hymns() { await listPage('hymns'); },
  async 'prayer-requests'() { await listPage('prayer-requests'); },
  async 'counselling-bookings'() { await listPage('counselling-bookings'); },
  async gallery() {
    const items = await API.all('gallery'); CACHE.gallery = items;
    $('#content').innerHTML = `<div class="page-head"><p>These photos rotate in the home-page slideshow and fill the “Faces of faith” gallery. Use real photos from the media team; the first photo leads the slideshow.</p></div>
      <label class="dropzone" id="gDrop"><span style="font-size:1.8rem">📷</span><b>Upload photos</b><small>Drag &amp; drop, or tap to choose (you can pick several)</small><input type="file" id="gFile" accept="image/*" multiple hidden></label>
      <div class="ggrid">${items.map((g, i) => `<div class="gcell" data-id="${g.id}"><div class="gimg"${bg(g.src)}><span>${i + 1}</span></div><div class="gbody"><small>${esc(g.caption || 'No caption')}</small><div class="row-acts"><button data-up="${g.id}" aria-label="Move earlier"${i === 0 ? ' disabled' : ''}>←</button><button data-down="${g.id}" aria-label="Move later"${i === items.length - 1 ? ' disabled' : ''}>→</button><button data-edit="${g.id}" aria-label="Edit caption">✎</button><button class="del" data-del="${g.id}" aria-label="Delete photo">🗑</button></div></div></div>`).join('') || '<div class="empty">No photos yet.</div>'}</div>`;
    const drop = $('#gDrop'), inp = $('#gFile');
    const add = async files => { files = [...files].filter(f => /^image\//.test(f.type)); if (!files.length) return; drop.classList.add('uploading'); $('b', drop).textContent = `Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`;
      try { for (const f of files) { const r = await API.upload(f, 'gallery'); await API.create('gallery', { src: r.url, caption: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }); } toast(`${files.length} photo${files.length > 1 ? 's' : ''} added to the gallery`); } catch (err) { fail(err); }
      PAGES.gallery(); refreshCounts(); };
    inp.onchange = () => add(inp.files);
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => add(e.dataTransfer.files));
    $('#content').onclick = async e => { const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.edit) { const g = items.find(x => x.id == t.dataset.edit); openSheet('Edit photo', [{ k: 'src', label: 'Photo', type: 'image', shape: 'wide' }, { k: 'caption', label: 'Caption', full: true }], g, async v => { await API.update('gallery', g.id, v); toast('Photo updated'); PAGES.gallery(); }); }
      if (t.dataset.del && await confirmBox('Delete this photo?', 'It will be removed from the home page.')) { await API.remove('gallery', t.dataset.del); toast('Photo deleted'); PAGES.gallery(); refreshCounts(); }
      if (t.dataset.up || t.dataset.down) { const id = t.dataset.up || t.dataset.down, ids = items.map(x => x.id), i = ids.findIndex(v => v == id), j = t.dataset.up ? i - 1 : i + 1; [ids[i], ids[j]] = [ids[j], ids[i]]; await API.reorder('gallery', ids); toast('Order updated'); PAGES.gallery(); }
    };
  },
  async subscribers() {
    const items = await API.all('subscribers'); const host = $('#content'); const q = (host.dataset.q || '').toLowerCase();
    const shown = items.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q));
    const n = ch => items.filter(x => x.channel === ch || x.channel === 'both').length;
    host.innerHTML = `<div class="page-head"><div class="chips"><span class="chip"><b>${items.length}</b> subscribers</span><span class="chip">📧 <b>${n('email')}</b> by email</span><span class="chip">💬 <b>${n('whatsapp')}</b> by WhatsApp</span></div>
      <div class="tools"><input type="search" placeholder="Search subscribers…" value="${esc(host.dataset.q || '')}" data-search><button class="btn gold small" id="csvBtn">⤓ Export CSV</button></div></div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>WhatsApp</th><th>Delivery</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>
      ${shown.map(x => `<tr data-id="${x.id}"><td><b>${esc(x.name || '—')}</b></td><td>${esc(x.email || '—')}</td><td>${esc(x.whatsapp || '—')}</td><td><span class="badge">${esc(x.channel)}</span></td><td>${fmtDate(x.created_at)}</td><td>${x.active === false ? '<span class="badge off">Unsubscribed</span>' : '<span class="badge ok">Active</span>'}</td><td><div class="row-acts"><button class="del" data-del="${x.id}" aria-label="Remove subscriber">🗑</button></div></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No subscribers match.</td></tr>'}
      </tbody></table></div><p class="muted small" style="margin-top:12px">Delivery runs on the backend: a daily job sends each morning’s devotion to active subscribers by email or WhatsApp (see API.md → Daily devotion delivery).</p>`;
    $('#csvBtn').onclick = () => { const cols = ['id', 'name', 'email', 'whatsapp', 'channel', 'active', 'created_at'];
      const csv = [cols.join(',')].concat(items.map(x => cols.map(c => `"${String(x[c] == null ? '' : x[c]).replace(/"/g, '""')}"`).join(','))).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `devotion-subscribers-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove(); toast(`Exported ${items.length} subscribers`); };
    const s = $('[data-search]', host); s.oninput = () => { host.dataset.q = s.value; PAGES.subscribers().then(() => { const n2 = $('[data-search]', host); n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); }); };
    host.onclick = async e => { const t = e.target.closest('[data-del]'); if (t && await confirmBox('Remove subscriber?', 'They will stop receiving the daily devotion.', 'Remove')) { await API.remove('subscribers', t.dataset.del); toast('Subscriber removed'); PAGES.subscribers(); refreshCounts(); } };
  },
  async settings() {
    const st = await API.getOne('settings');
    const DAYS = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groups = [
      ['⛪ Services', [{ k: 'service_times', label: 'Service times', type: 'repeat', cols: [{ k: 'label', ph: 'Service name' }, { k: 'day', type: 'select', options: DAYS }, { k: 'time', type: 'time', ph: 'Time' }], help: 'The Sunday service drives the countdown on the home page.' }, { k: 'venue', label: 'Venue', full: true }, { k: 'motto', label: 'Motto' }, { k: 'motto_ref', label: 'Motto reference' }]],
      ['🔴 Live stream', [{ k: 'live_now', label: 'Live now', type: 'toggle', on: 'The service is live (shows the LIVE badge)' }, { k: 'live_title', label: 'What’s live', ph: 'Sunday Service · Praise & Worship' }, { k: 'livestream_url', label: 'Livestream URL', type: 'url', full: true, help: 'YouTube channel or live video link.' }]],
      ['🏦 Giving & contacts', [{ k: 'bank.bank_name', label: 'Bank name' }, { k: 'bank.account_name', label: 'Account name' }, { k: 'bank.account_number', label: 'Account number' }, { k: 'whatsapp', label: 'WhatsApp number', type: 'tel', ph: '+234…' }, { k: 'contact_email', label: 'Contact email', type: 'email' }, { k: 'contact_phone', label: 'Contact phone', type: 'tel' }]]
    ];
    const get = (o, k) => k.split('.').reduce((a, p) => (a || {})[p], o);
    $('#content').innerHTML = `<form id="setForm" novalidate>${groups.map(([t, fs]) => `<div class="panel"><h3>${t}</h3><div class="fgrid">${fs.map(f => fieldHTML(f, get(st, f.k))).join('')}</div></div>`).join('')}
      <div class="panel-foot"><button class="btn gold" type="submit">Save settings</button></div></form>`;
    const fm = $('#setForm'); wireFields(fm);
    fm.onsubmit = async e => { e.preventDefault(); const all = groups.flatMap(g => g[1]); const flat = readFields(fm, all); const out = { bank: {} };
      Object.entries(flat).forEach(([k, v]) => { if (k.startsWith('bank.')) out.bank[k.slice(5)] = v; else out[k] = v; });
      try { await API.saveOne('settings', out); toast(out.live_now ? 'Saved · the website now shows LIVE' : 'Settings saved'); } catch (err) { fail(err); } };
  }
};
const NAV = [
  ['', [['dashboard', '🏠', 'Dashboard']]],
  ['People', [['chaplaincy', '✝', 'Chaplaincy'], ['elders', '🕊️', 'Council of Elders'], ['cyf', '🔥', 'CYF leadership']]],
  ['Content', [['messages', '🎧', 'Messages'], ['events', '📅', 'Events'], ['devotions', '📖', 'Daily devotions'], ['gallery', '🖼', 'Gallery'], ['hymns', '🎵', 'Hymn book']]],
  ['Community', [['subscribers', '📬', 'Subscribers'], ['prayer-requests', '🙏', 'Prayer requests'], ['counselling-bookings', '🤝', 'Counselling']]],
  ['Site', [['settings', '⚙️', 'Settings']]]
];
const TITLES = Object.fromEntries(NAV.flatMap(g => g[1]).map(([k, , t]) => [k, t]));
$('#sideNav').innerHTML = NAV.map(([g, items]) => (g ? `<div class="grp">${g}</div>` : '') + items.map(([k, ic, t]) => `<a class="side-link" href="#${k}" data-nav="${k}"><i>${ic}</i>${t}<span class="count" data-count="${k}" hidden></span></a>`).join('')).join('');
async function refreshCounts() {
  try { const s = await API.stats(); const set = (k, n) => { const el = $(`[data-count="${k}"]`); if (el) { el.hidden = !n; el.textContent = n; } };
    set('prayer-requests', s.prayer_requests_new); set('counselling-bookings', s.counselling_new); } catch (e) {}
}
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

/* ---------------- Router + shell ---------------- */
let PENDING_NEW = null;
async function route() {
  if (!API.isAuthed()) return showLogin();
  const page = (location.hash.slice(1) || 'dashboard').split('?')[0];
  const fn = PAGES[page] || PAGES.dashboard; const key = PAGES[page] ? page : 'dashboard';
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === key));
  $('#pageTitle').textContent = TITLES[key]; document.title = TITLES[key] + ' · Chapel of Faith Admin';
  closeMenu(); $('#content').dataset.q = '';
  $('#content').innerHTML = '<div class="empty">Loading…</div>';
  try { await fn(); } catch (e) { fail(e); $('#content').innerHTML = `<div class="empty">Could not load this page: ${esc(e.message)}</div>`; }
  scrollTo(0, 0);
  if (PENDING_NEW === key && R[key]) { PENDING_NEW = null; editItem(key, null, $('#content'), {}); }
}
addEventListener('hashchange', route);
const side = $('#side'), scrim = $('#scrim');
function closeMenu() { side.classList.remove('open'); scrim.classList.remove('on'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }
$('#menuBtn').onclick = () => { const o = side.classList.toggle('open'); scrim.classList.toggle('on', o); $('#menuBtn').setAttribute('aria-expanded', o); };
scrim.onclick = closeMenu;
addEventListener('api:unauthorized', () => { toast('Your session expired. Please sign in again.', 'err'); showLogin(); });

/* ---------------- Login ---------------- */
function showLogin() { $('#appView').hidden = true; $('#loginView').hidden = false; }
async function showApp() {
  $('#loginView').hidden = true; $('#appView').hidden = false;
  const mb = $('#modeBadge'); mb.className = 'mode-badge ' + API.mode; mb.innerHTML = API.mode === 'mock' ? '● Demo mode<br><small>Saved in this browser</small>' : '● Live API<br><small>' + esc(API.base.replace(/^https?:\/\//, '')) + '</small>';
  try { const me = await API.me(); $('#meChip').textContent = (me.name || me.email || 'A').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); } catch (e) {}
  refreshCounts(); route();
}
$('#modeLine').textContent = API.mode === 'mock' ? 'Demo mode: nothing leaves this browser.' : 'Connected to ' + API.base;
$$('[data-mode-only]').forEach(el => el.hidden = el.dataset.modeOnly !== API.mode);
$('#demoCreds').onclick = () => { $('#lgEmail').value = 'admin@chapel.demo'; $('#lgPass').value = 'demo1234'; $('#lgBtn').focus(); };
$('#pwEye').onclick = () => { const p = $('#lgPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
$('#loginForm').onsubmit = async e => { e.preventDefault(); $('#lgErr').textContent = '';
  const b = $('#lgBtn'); b.disabled = true; b.textContent = 'Signing in…';
  try { await API.login($('#lgEmail').value.trim(), $('#lgPass').value); toast('Welcome back'); if (!location.hash) location.hash = 'dashboard'; showApp(); }
  catch (err) { $('#lgErr').textContent = err.message || 'Could not sign in'; $('.login-card').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
  finally { b.disabled = false; b.textContent = 'Sign in'; } };
$('#logoutBtn').onclick = async () => { if (await confirmBox('Sign out?', 'You will need to sign in again to make changes.', 'Sign out')) { API.logout(); showLogin(); } };

API.ready().then(() => API.isAuthed() ? showApp() : showLogin()).catch(fail);
})();
