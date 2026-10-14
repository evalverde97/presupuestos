// Presupuestos de jardinería — PWA sin build. Todo vive en localStorage del teléfono.

const UNITS = ['m²', 'ml', 'hora', 'viaje', 'unidad', 'global'];

const DEFAULT_PRICES = [
  { name: 'Corte de césped', unit: 'm²', price: 150 },
  { name: 'Corte de césped - pasto muy largo', unit: 'm²', price: 300 },
  { name: 'Corte de césped con tractor', unit: 'm²', price: 80 },
  { name: 'Desmalezado y limpieza de terreno', unit: 'm²', price: 250 },
  { name: 'Poda de arbustos', unit: 'hora', price: 8000 },
  { name: 'Retiro de residuos verdes', unit: 'viaje', price: 30000 },
];

const DEFAULT_SETTINGS = {
  company: '',
  phone: '',
  title: 'Mantenimiento de espacios verdes',
  validDays: 15,
  discount: 0,
  iva: 0,
  deposit: 50,
  cash: 10,
  nextNumber: 1,
  conditions: [
    'Forma de pago: seña al aceptar el presupuesto y saldo al finalizar el trabajo.',
    'Pago en efectivo: 10% de descuento sobre el total.',
    'Los materiales y mano de obra están incluidos salvo que se indique lo contrario.',
    'Trabajos sujetos a clima; las fechas pueden reprogramarse por lluvia.',
    'Cualquier trabajo adicional se presupuesta por separado.',
  ].join('\n'),
};

// ---------- almacenamiento ----------
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem('pres:' + k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem('pres:' + k, JSON.stringify(v)); } catch {} };

const uid = () => Math.random().toString(36).slice(2, 10);
const S = {
  settings: { ...DEFAULT_SETTINGS, ...load('settings', {}) },
  prices: load('prices', null) || DEFAULT_PRICES.map((p) => ({ id: uid(), ...p })),
  history: load('history', []),
  draft: load('draft', null),
  tab: 'quote',
};
if (!S.draft) S.draft = newDraft();

function newDraft() {
  const s = S.settings;
  return {
    id: null, number: s.nextNumber, date: today(), client: '', address: '', clientPhone: '',
    items: [], discount: s.discount, iva: s.iva, deposit: s.deposit, cash: s.cash,
  };
}
// Guarda el borrador; si ya está en el historial, mantiene esa copia al día.
function saveDraft() {
  const d = S.draft;
  save('draft', d);
  const i = d.id ? S.history.findIndex((h) => h.id === d.id) : -1;
  if (i >= 0) {
    S.history[i] = JSON.parse(JSON.stringify({ ...d, total: calc(d).total, savedAt: S.history[i].savedAt }));
    save('history', S.history);
  }
}
const persist = () => { save('settings', S.settings); save('prices', S.prices); save('history', S.history); saveDraft(); };

// ---------- utilidades ----------
function today() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + (Number(n) || 0)); return d.toISOString().slice(0, 10); }
function fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
function money(n) {
  const r = Math.round(n * 100) / 100;
  const dec = Number.isInteger(r) ? 0 : 2;
  return '$ ' + r.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
const qtyStr = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
const pad = (n) => String(n).padStart(4, '0');
const PLURAL = { hora: 'horas', viaje: 'viajes', unidad: 'unidades' };
const unitStr = (u, q) => (num(q) !== 1 && PLURAL[u]) || u;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, el = document) => el.querySelector(sel);

function calc(d) {
  const subtotal = d.items.reduce((a, it) => a + num(it.qty) * num(it.price), 0);
  const discountAmt = subtotal * num(d.discount) / 100;
  const base = subtotal - discountAmt;
  const ivaAmt = base * num(d.iva) / 100;
  const total = base + ivaAmt;
  const deposit = total * num(d.deposit) / 100;
  return { subtotal, discountAmt, ivaAmt, total, deposit, balance: total - deposit, cashTotal: total * (1 - num(d.cash) / 100) };
}

const ICON = {
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  wa: '<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2z"/></svg>',
  plusDoc: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  ruler: '<svg viewBox="0 0 24 24"><path d="M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11 M7 10l5 5 5-5 M5 20h14"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M4 6h16 M4 12h16 M4 18h10"/></svg>',
};

// ---------- vistas ----------
const view = $('#view');

function render() {
  document.body.className = 'page-' + S.tab;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
  if (S.tab === 'quote') renderQuote();
  else if (S.tab === 'history') renderHistory();
  else renderSettings();
}

function renderQuote() {
  const d = S.draft, s = S.settings;
  view.innerHTML = `
    <div class="top">
      <div>
        <h1>Presupuesto</h1>
        <div class="sub">N° ${pad(d.number)}${d.id ? ' · guardado' : ''}</div>
      </div>
      <button class="pill" id="new">${ICON.plus}Nuevo</button>
    </div>

    <div class="label">Cliente</div>
    <div class="card fields">
      <div class="field"><label>Nombre</label><input data-k="client" value="${esc(d.client)}" placeholder="Nombre del cliente" autocomplete="off"></div>
      <div class="field"><label>Dirección</label><input data-k="address" value="${esc(d.address)}" placeholder="Calle 123, localidad" autocomplete="off"></div>
      <div class="field"><label>WhatsApp</label><input data-k="clientPhone" value="${esc(d.clientPhone)}" placeholder="Opcional" inputmode="tel" autocomplete="off"></div>
      <div class="field"><label>Fecha</label><input type="date" data-k="date" value="${d.date}"></div>
    </div>
    <div class="hint" id="valid">Válido hasta ${fmtDate(addDays(d.date, s.validDays))} (${s.validDays} días)</div>

    <div class="label">Trabajos</div>
    <div class="items" id="items"></div>
    <button class="add" id="add">${ICON.plus}Agregar trabajo</button>

    <div class="label">Condiciones de pago</div>
    <div class="opts">
      ${opt('discount', 'Descuento')}${opt('iva', 'IVA')}${opt('deposit', 'Seña requerida')}${opt('cash', 'Desc. efectivo')}
    </div>

    <div class="label">Resumen</div>
    <div class="card sum" id="sum"></div>

    <div class="bar"><div class="bar-in">
      <div class="t"><small>Total</small><strong id="bar-total"></strong></div>
      <button class="share" id="share">${ICON.wa}Compartir</button>
    </div></div>
  `;
  renderItems();
  updateTotals();

  view.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('input', () => {
    d[el.dataset.k] = el.value;
    if (el.dataset.k === 'date') $('#valid').textContent = `Válido hasta ${fmtDate(addDays(d.date, s.validDays))} (${s.validDays} días)`;
    saveDraft();
  }));
  view.querySelectorAll('[data-o]').forEach((el) => el.addEventListener('input', () => { d[el.dataset.o] = el.value; updateTotals(); saveDraft(); }));
  $('#add').onclick = openServicePicker;
  $('#new').onclick = () => {
    if (d.items.length && !d.id && !confirm('¿Descartar este presupuesto y empezar uno nuevo?')) return;
    S.draft = newDraft(); persist(); render(); window.scrollTo(0, 0);
  };
  $('#share').onclick = openShare;
}

function opt(k, label) {
  return `<label class="card opt"><span>${label}</span><div class="pct"><input data-o="${k}" value="${esc(S.draft[k])}" inputmode="decimal"><b>%</b></div></label>`;
}

function renderItems() {
  const box = $('#items');
  const d = S.draft;
  if (!d.items.length) { box.innerHTML = `<div class="card empty">Agregá los trabajos desde tu lista de precios.</div>`; return; }
  box.innerHTML = d.items.map((it, i) => `
    <div class="card item" data-i="${i}">
      <div class="item-head">
        <input class="item-name" data-f="name" value="${esc(it.name)}" placeholder="Descripción">
        <button class="x" data-del aria-label="Quitar">${ICON.x}</button>
      </div>
      <div class="item-calc">
        <div class="num"><input data-f="qty" value="${esc(it.qty)}" inputmode="decimal" placeholder="0"><span class="u">${esc(it.unit)}</span></div>
        ${it.unit === 'm²' ? `<button class="m2" data-m2>${'Medir'}</button>` : ''}
        <span class="op">×</span>
        <div class="num price"><span class="u">$</span><input data-f="price" value="${esc(it.price)}" inputmode="decimal"></div>
        <span class="item-sub" data-sub></span>
      </div>
    </div>`).join('');

  box.querySelectorAll('.item').forEach((row) => {
    const it = d.items[row.dataset.i];
    row.querySelectorAll('[data-f]').forEach((el) => el.addEventListener('input', () => { it[el.dataset.f] = el.value; updateTotals(); saveDraft(); }));
    row.querySelector('[data-del]').onclick = () => { d.items.splice(row.dataset.i, 1); saveDraft(); renderItems(); updateTotals(); };
    const m2 = row.querySelector('[data-m2]');
    if (m2) m2.onclick = () => openM2(it);
  });
}

function updateTotals() {
  const d = S.draft, c = calc(d);
  view.querySelectorAll('.item').forEach((row) => {
    const it = d.items[row.dataset.i];
    row.querySelector('[data-sub]').textContent = money(num(it.qty) * num(it.price));
  });
  const line = (l, v, cls = '') => `<div class="${cls}"><span>${l}</span><span>${v}</span></div>`;
  $('#sum').innerHTML =
    line('Subtotal', money(c.subtotal), 'muted') +
    (num(d.discount) ? line(`Descuento (${qtyStr(num(d.discount))}%)`, '− ' + money(c.discountAmt), 'muted') : '') +
    (num(d.iva) ? line(`IVA (${qtyStr(num(d.iva))}%)`, money(c.ivaAmt), 'muted') : '') +
    line('Total', money(c.total), 'big') +
    line(`Seña (${qtyStr(num(d.deposit))}%)`, money(c.deposit)) +
    line('Saldo a la entrega', money(c.balance)) +
    (num(d.cash) ? line(`Total en efectivo (−${qtyStr(num(d.cash))}%)`, money(c.cashTotal), 'cash') : '');
  $('#bar-total').textContent = money(c.total);
  $('#share').disabled = !d.items.length;
}

// ---------- hojas ----------
const sheet = $('#sheet'), sheetCard = $('#sheet-card');
function openSheet(html) { sheetCard.innerHTML = html; sheet.hidden = false; sheetCard.scrollTop = 0; }
function closeSheet() { sheet.hidden = true; sheetCard.innerHTML = ''; }
sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });

function openServicePicker() {
  openSheet(`
    <h2>Agregar trabajo</h2>
    <div class="card">
      ${S.prices.map((p, i) => `<button class="svc" data-p="${i}"><span>${esc(p.name)}</span><small>${money(p.price)} / ${esc(p.unit)}</small></button>`).join('')}
      <button class="svc" data-custom><span style="color:var(--accent);font-weight:600">Otro trabajo (escribir)</span><small>${ICON.plus.replace('<svg', '<svg style="width:18px;height:18px"')}</small></button>
    </div>
    <p class="hint">Los precios se editan en Ajustes.</p>
  `);
  sheetCard.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => {
    const p = S.prices[b.dataset.p];
    addItem({ name: p.name, unit: p.unit, price: p.price, qty: p.unit === 'viaje' ? 1 : '' });
  });
  sheetCard.querySelector('[data-custom]').onclick = () => addItem({ name: '', unit: 'global', price: '', qty: 1 });
}

function addItem(it) {
  S.draft.items.push({ id: uid(), ...it });
  saveDraft();
  closeSheet();
  renderItems(); updateTotals();
  const rows = view.querySelectorAll('.item');
  const last = rows[rows.length - 1];
  const focus = last.querySelector(it.name ? '[data-f=qty]' : '[data-f=name]');
  last.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => focus.focus(), 250);
}

// Calculadora de m² (equivalente a la hoja "Calculo m2"): suma de rectángulos largo × ancho.
function openM2(item) {
  const rows = [{ l: '', a: '' }];
  const draw = () => {
    const total = rows.reduce((s, r) => s + num(r.l) * num(r.a), 0);
    openSheet(`
      <h2>Medir superficie</h2>
      <div id="m2rows">${rows.map((r, i) => `
        <div class="m2-row" data-i="${i}">
          <input data-v="l" value="${esc(r.l)}" inputmode="decimal" placeholder="Largo">
          <span class="op">×</span>
          <input data-v="a" value="${esc(r.a)}" inputmode="decimal" placeholder="Ancho">
          <span class="eq">${qtyStr(num(r.l) * num(r.a))} m²</span>
          <button class="x" data-rm>${rows.length > 1 ? ICON.x : ''}</button>
        </div>`).join('')}
      </div>
      <button class="add" id="m2add" style="margin-top:0">${ICON.plus}Sumar otra parte</button>
      <div class="m2-total"><span class="op">Superficie total</span><strong id="m2tot">${qtyStr(total)} m²</strong></div>
      <button class="btn primary block" id="m2ok">Usar esta medida</button>
    `);
    sheetCard.querySelectorAll('.m2-row').forEach((row) => {
      const r = rows[row.dataset.i];
      row.querySelectorAll('[data-v]').forEach((el) => el.addEventListener('input', () => {
        r[el.dataset.v] = el.value;
        row.querySelector('.eq').textContent = qtyStr(num(r.l) * num(r.a)) + ' m²';
        $('#m2tot').textContent = qtyStr(rows.reduce((s, x) => s + num(x.l) * num(x.a), 0)) + ' m²';
      }));
      row.querySelector('[data-rm]').onclick = () => { if (rows.length > 1) { rows.splice(row.dataset.i, 1); draw(); } };
    });
    $('#m2add').onclick = () => { rows.push({ l: '', a: '' }); draw(); sheetCard.querySelector('.m2-row:last-child input').focus(); };
    $('#m2ok').onclick = () => {
      const t = Math.round(rows.reduce((s, x) => s + num(x.l) * num(x.a), 0) * 100) / 100;
      item.qty = String(t); saveDraft(); closeSheet(); renderItems(); updateTotals();
    };
  };
  draw();
  setTimeout(() => sheetCard.querySelector('[data-v=l]')?.focus(), 250);
}

// ---------- compartir ----------
function saveToHistory() {
  const d = S.draft;
  d.items = d.items.filter((it) => (it.name || '').trim() || num(it.qty) * num(it.price));
  if (!d.id) d.id = uid();
  const entry = JSON.parse(JSON.stringify({ ...d, total: calc(d).total, savedAt: Date.now() }));
  const i = S.history.findIndex((h) => h.id === d.id);
  if (i >= 0) S.history[i] = entry; else S.history.unshift(entry);
  S.settings.nextNumber = Math.max(S.settings.nextNumber, num(d.number) + 1);
  persist();
}

function shareText(d) {
  const c = calc(d), s = S.settings;
  const L = [];
  L.push(`${s.company ? `*${s.company}* — ` : ""}Presupuesto N° ${pad(d.number)}`);
  if (d.client) L.push(`Cliente: ${d.client}`);
  if (d.address) L.push(`Dirección: ${d.address}`);
  L.push(`Fecha: ${fmtDate(d.date)} · Válido hasta ${fmtDate(addDays(d.date, s.validDays))}`, '');
  d.items.forEach((it) => L.push(`• ${it.name}: ${qtyStr(num(it.qty))} ${unitStr(it.unit, it.qty)} × ${money(num(it.price))} = ${money(num(it.qty) * num(it.price))}`));
  L.push('');
  if (num(d.discount)) L.push(`Descuento (${qtyStr(num(d.discount))}%): −${money(c.discountAmt)}`);
  if (num(d.iva)) L.push(`IVA (${qtyStr(num(d.iva))}%): ${money(c.ivaAmt)}`);
  L.push(`*TOTAL: ${money(c.total)}*`);
  L.push(`Seña (${qtyStr(num(d.deposit))}%): ${money(c.deposit)}`, `Saldo a la entrega: ${money(c.balance)}`);
  if (num(d.cash)) L.push(`Pagando en efectivo: *${money(c.cashTotal)}*`);
  if (s.phone) L.push("", [s.company, s.phone].filter(Boolean).join(" · "));
  return L.join('\n');
}

async function openShare() {
  const d = S.draft;
  if (!d.items.length) return;
  if (!S.settings.company.trim()) { toast("Primero cargá el nombre de tu empresa"); go("settings"); setTimeout(() => document.querySelector("[data-s=company]").focus(), 300); return; }
  saveToHistory();
  render();
  const s = S.settings;
  const canvas = drawInvoice({ ...d, validUntil: addDays(d.date, s.validDays) }, calc(d), s, { money, qtyStr, fmtDate, pad, num, unitStr });
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const fileName = `Presupuesto-${pad(d.number)}${d.client ? '-' + d.client.replace(/[^\p{L}\p{N}]+/gu, '-') : ''}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  const url = URL.createObjectURL(blob);

  openSheet(`
    <h2>Presupuesto N° ${pad(d.number)}</h2>
    <div class="preview"><img src="${url}" alt="Vista previa del presupuesto"></div>
    <div class="actions">
      <button class="share" id="sh-img">${ICON.wa}Enviar por WhatsApp</button>
      <div class="two">
        <button class="btn" id="sh-txt">${ICON.text}Como texto</button>
        <button class="btn" id="sh-dl">${ICON.dl}Descargar</button>
      </div>
    </div>
  `);

  $('#sh-img').onclick = async () => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `Presupuesto ${pad(d.number)}` }); } catch (e) { /* cancelado */ }
    } else {
      download(url, fileName);
      toast('Imagen descargada. Adjuntala en el chat de WhatsApp.');
      setTimeout(() => openWhatsApp(d, `Hola${d.client ? ' ' + d.client.split(' ')[0] : ''}! Te paso el presupuesto N° ${pad(d.number)}.`), 600);
    }
  };
  $('#sh-txt').onclick = () => openWhatsApp(d, shareText(d));
  $('#sh-dl').onclick = () => download(url, fileName);
}

function openWhatsApp(d, text) {
  // Número argentino local (ej. "11 2345-6789" o "011 15 2345-6789") → formato internacional 549…
  let phone = (d.clientPhone || '').replace(/\D/g, '');
  if (phone && !phone.startsWith('54')) {
    phone = phone.replace(/^0/, '');
    if (phone.length === 12) for (const k of [2, 3, 4]) if (phone.substr(k, 2) === '15') { phone = phone.slice(0, k) + phone.slice(k + 2); break; }
    phone = '549' + phone;
  }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

function download(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600);
}

// ---------- historial ----------
function renderHistory() {
  const h = S.history;
  view.innerHTML = `
    <div class="top"><div><h1>Historial</h1><div class="sub">${h.length} presupuesto${h.length === 1 ? '' : 's'}</div></div></div>
    ${h.length ? `<div class="card">${h.map((e, i) => `
      <button class="h-item" data-h="${i}">
        <span class="h-n">${pad(e.number)}</span>
        <span class="h-main"><b>${esc(e.client || 'Sin nombre')}</b><small>${fmtDate(e.date)}${e.address ? ' · ' + esc(e.address) : ''}</small></span>
        <span class="h-total">${money(e.total)}</span>
      </button>`).join('')}</div>`
    : `<div class="card empty">Los presupuestos que compartas quedan guardados acá.</div>`}
  `;
  view.querySelectorAll('[data-h]').forEach((b) => b.onclick = () => {
    const e = S.history[b.dataset.h];
    openSheet(`
      <h2>N° ${pad(e.number)} · ${esc(e.client || 'Sin nombre')}</h2>
      <div class="actions">
        <button class="btn primary" data-a="open">Abrir y editar</button>
        <button class="btn" data-a="dup">Duplicar como nuevo</button>
        <button class="btn danger" data-a="del">Eliminar</button>
      </div>
    `);
    sheetCard.querySelector('[data-a=open]').onclick = () => { S.draft = strip(e); persist(); closeSheet(); go('quote'); };
    sheetCard.querySelector('[data-a=dup]').onclick = () => {
      S.draft = { ...strip(e), id: null, number: S.settings.nextNumber, date: today() };
      persist(); closeSheet(); go('quote');
    };
    sheetCard.querySelector('[data-a=del]').onclick = () => {
      if (!confirm('¿Eliminar este presupuesto del historial?')) return;
      S.history.splice(b.dataset.h, 1);
      if (S.draft.id === e.id) S.draft.id = null;
      persist(); closeSheet(); render();
    };
  });
}
function strip(e) { const { total, savedAt, ...d } = JSON.parse(JSON.stringify(e)); return d; }

// ---------- ajustes ----------
function renderSettings() {
  const s = S.settings;
  view.innerHTML = `
    <div class="top"><div><h1>Ajustes</h1><div class="sub">Se guardan solos</div></div></div>

    <div class="label">Tu negocio</div>
    <div class="card fields">
      <div class="field"><label>Nombre</label><input data-s="company" value="${esc(s.company)}" placeholder="Nombre de tu empresa"></div>
      <div class="field"><label>Teléfono</label><input data-s="phone" value="${esc(s.phone)}" inputmode="tel" placeholder="Tu teléfono"></div>
      <div class="field"><label>Rubro</label><input data-s="title" value="${esc(s.title)}"></div>
    </div>

    <div class="label">Lista de precios</div>
    <div class="card" id="prices"></div>
    <button class="add" id="padd">${ICON.plus}Agregar servicio</button>

    <div class="label">Valores por defecto</div>
    <div class="card fields">
      <div class="row2">
        <div class="field"><label>Validez (días)</label><input data-s="validDays" value="${esc(s.validDays)}" inputmode="numeric"></div>
        <div class="field"><label>Próximo N°</label><input data-s="nextNumber" value="${esc(s.nextNumber)}" inputmode="numeric"></div>
        <div class="field"><label>Seña %</label><input data-s="deposit" value="${esc(s.deposit)}" inputmode="decimal"></div>
        <div class="field"><label>Efectivo −%</label><input data-s="cash" value="${esc(s.cash)}" inputmode="decimal"></div>
        <div class="field"><label>IVA %</label><input data-s="iva" value="${esc(s.iva)}" inputmode="decimal"></div>
        <div class="field"><label>Descuento %</label><input data-s="discount" value="${esc(s.discount)}" inputmode="decimal"></div>
      </div>
    </div>
    <p class="hint">Se aplican a los presupuestos nuevos.</p>

    <div class="label">Condiciones / observaciones</div>
    <textarea data-s="conditions" rows="6">${esc(s.conditions)}</textarea>
    <p class="hint">Una por línea. Aparecen al pie del presupuesto.</p>
  `;
  view.querySelectorAll('[data-s]').forEach((el) => el.addEventListener('input', () => {
    const k = el.dataset.s;
    s[k] = ['validDays', 'nextNumber'].includes(k) ? Math.max(0, parseInt(el.value, 10) || 0) : el.value;
    save('settings', s);
  }));
  renderPrices();
  $('#padd').onclick = () => {
    S.prices.push({ id: uid(), name: '', unit: 'm²', price: 0 });
    save('prices', S.prices); renderPrices();
    $('#prices .p-row:last-child input').focus();
  };
}

function renderPrices() {
  const box = $('#prices');
  box.innerHTML = S.prices.map((p, i) => `
    <div class="p-row" data-i="${i}">
      <input data-p="name" value="${esc(p.name)}" placeholder="Servicio">
      <select data-p="unit">${UNITS.map((u) => `<option${u === p.unit ? ' selected' : ''}>${u}</option>`).join('')}</select>
      <input data-p="price" class="money" value="${esc(p.price)}" inputmode="decimal" aria-label="Precio">
      <button class="x" data-del aria-label="Quitar">${ICON.x}</button>
    </div>`).join('') || `<div class="empty">Sin servicios.</div>`;
  box.querySelectorAll('.p-row').forEach((row) => {
    const p = S.prices[row.dataset.i];
    row.querySelectorAll('[data-p]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      p[el.dataset.p] = el.dataset.p === 'price' ? num(el.value) : el.value; save('prices', S.prices);
    }));
    row.querySelector('[data-del]').onclick = () => {
      if (p.name && !confirm(`¿Quitar "${p.name}" de la lista?`)) return;
      S.prices.splice(row.dataset.i, 1); save('prices', S.prices); renderPrices();
    };
  });
}

// ---------- arranque ----------
function go(tab) { S.tab = tab; render(); window.scrollTo(0, 0); }
document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => go(b.dataset.tab));
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
