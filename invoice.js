// Dibuja el presupuesto como imagen tipo factura (PNG) para compartir por WhatsApp.
// Se dibuja en un canvas alto y después se recorta a la altura real del contenido.

function drawInvoice(d, c, s, f) {
  const W = 1080, P = 72, SCALE = 2;
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const C = {
    green: '#1f4f33', greenSoft: '#e8f0ea', ink: '#18211b', muted: '#6c766f', line: '#e3e7e2', zebra: '#f7f9f6', white: '#ffffff',
  };

  const tall = document.createElement('canvas');
  tall.width = W * SCALE; tall.height = 6000 * SCALE;
  const x = tall.getContext('2d');
  x.scale(SCALE, SCALE);
  x.fillStyle = C.white; x.fillRect(0, 0, W, 6000);
  x.textBaseline = 'alphabetic';

  const font = (size, weight = 400) => (x.font = `${weight} ${size}px ${FONT}`);
  const text = (t, px, py, { size = 24, weight = 400, color = C.ink, align = 'left', spacing = 0 } = {}) => {
    font(size, weight); x.fillStyle = color; x.textAlign = align;
    if ('letterSpacing' in x) x.letterSpacing = spacing + 'px';
    x.fillText(t, px, py);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
  };
  const wrap = (t, maxW, size, weight = 400) => {
    font(size, weight);
    const out = [];
    String(t || '').split('\n').forEach((para) => {
      let line = '';
      para.split(/\s+/).forEach((w) => {
        const test = line ? line + ' ' + w : w;
        if (x.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
      });
      out.push(line);
    });
    return out;
  };
  const rule = (py, color = C.line, x1 = P, x2 = W - P) => { x.fillStyle = color; x.fillRect(x1, py, x2 - x1, 1.5); };
  const round = (rx, ry, rw, rh, r, fill) => {
    x.beginPath(); x.moveTo(rx + r, ry); x.arcTo(rx + rw, ry, rx + rw, ry + rh, r); x.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    x.arcTo(rx, ry + rh, rx, ry, r); x.arcTo(rx, ry, rx + rw, ry, r); x.closePath(); x.fillStyle = fill; x.fill();
  };

  // --- Encabezado
  x.fillStyle = C.green; x.fillRect(0, 0, W, 236);
  leaf(x, P + 30, 118, 30, '#ffffff');
  text(s.company || 'Mi empresa', P + 84, 112, { size: 44, weight: 700, color: C.white });
  text(s.title || '', P + 84, 152, { size: 23, color: 'rgba(255,255,255,.75)' });
  text('PRESUPUESTO', W - P, 104, { size: 22, weight: 700, color: 'rgba(255,255,255,.7)', align: 'right', spacing: 4 });
  text('N° ' + f.pad(d.number), W - P, 152, { size: 40, weight: 700, color: C.white, align: 'right' });

  // --- Cliente + fechas
  let y = 312;
  text('CLIENTE', P, y, { size: 18, weight: 700, color: C.muted, spacing: 2 });
  text('FECHA', W - P - 250, y, { size: 18, weight: 700, color: C.muted, spacing: 2 });
  y += 42;
  const clientLines = wrap(d.client || '—', 560, 30, 700);
  clientLines.forEach((l, i) => text(l, P, y + i * 38, { size: 30, weight: 700 }));
  text(f.fmtDate(d.date), W - P - 250, y, { size: 26, weight: 600 });
  let ly = y + (clientLines.length - 1) * 38;
  if (d.address) { ly += 38; wrap(d.address, 560, 23).forEach((l) => { text(l, P, ly, { size: 23, color: C.muted }); ly += 32; }); ly -= 32; }
  if (d.clientPhone) { ly += 34; text('Tel. ' + d.clientPhone, P, ly, { size: 23, color: C.muted }); }
  text('VÁLIDO HASTA', W - P - 250, y + 52, { size: 18, weight: 700, color: C.muted, spacing: 2 });
  text(f.fmtDate(d.validUntil), W - P - 250, y + 92, { size: 26, weight: 600 });
  y = Math.max(ly, y + 92) + 60;

  // --- Tabla
  const col = { desc: P + 22, qty: 640, unit: 820, sub: W - P - 22 };
  round(P, y, W - 2 * P, 58, 12, C.greenSoft);
  const th = { size: 18, weight: 700, color: C.green, spacing: 1.5 };
  text('DESCRIPCIÓN', col.desc, y + 37, th);
  text('CANTIDAD', col.qty, y + 37, { ...th, align: 'right' });
  text('PRECIO UNIT.', col.unit, y + 37, { ...th, align: 'right' });
  text('SUBTOTAL', col.sub, y + 37, { ...th, align: 'right' });
  y += 58;

  d.items.forEach((it, i) => {
    const lines = wrap(it.name || '—', 400, 25, 600);
    const h = Math.max(78, 30 + lines.length * 32 + 20);
    if (i % 2 === 1) { x.fillStyle = C.zebra; x.fillRect(P, y, W - 2 * P, h); }
    lines.forEach((l, j) => text(l, col.desc, y + 47 + j * 32, { size: 25, weight: 600 }));
    const mid = y + 47;
    text(`${f.qtyStr(f.num(it.qty))} ${f.unitStr(it.unit, it.qty)}`, col.qty, mid, { size: 24, align: 'right' });
    text(f.money(f.num(it.price)), col.unit, mid, { size: 24, color: C.muted, align: 'right' });
    text(f.money(f.num(it.qty) * f.num(it.price)), col.sub, mid, { size: 25, weight: 700, align: 'right' });
    y += h;
    rule(y);
  });

  // --- Totales
  y += 44;
  const lx = 560, rx = W - P - 22;
  const tline = (label, val, opt = {}) => {
    text(label, lx, y, { size: 24, color: C.muted, ...opt });
    text(val, rx, y, { size: 24, weight: 600, align: 'right', ...opt });
    y += 44;
  };
  tline('Subtotal', f.money(c.subtotal));
  if (f.num(d.discount)) tline(`Descuento (${f.qtyStr(f.num(d.discount))}%)`, '− ' + f.money(c.discountAmt));
  if (f.num(d.iva)) tline(`IVA (${f.qtyStr(f.num(d.iva))}%)`, f.money(c.ivaAmt));
  y += 2;
  round(lx - 26, y - 6, W - P - lx + 26, 84, 14, C.green);
  text('TOTAL', lx, y + 47, { size: 22, weight: 700, color: 'rgba(255,255,255,.8)', spacing: 3 });
  text(f.money(c.total), rx, y + 50, { size: 38, weight: 800, color: C.white, align: 'right' });
  y += 140;

  // --- Forma de pago
  const boxH = f.num(d.cash) ? 244 : 166;
  round(P, y, W - 2 * P, boxH, 16, C.zebra);
  x.strokeStyle = C.line; x.lineWidth = 1.5; x.stroke();
  let py = y + 52;
  text('FORMA DE PAGO', P + 32, py, { size: 18, weight: 700, color: C.muted, spacing: 2 });
  py += 50;
  const pcol = (W - 2 * P) / 2;
  text(`Seña (${f.qtyStr(f.num(d.deposit))}%)`, P + 32, py, { size: 22, color: C.muted });
  text('Saldo a la entrega', P + 32 + pcol, py, { size: 22, color: C.muted });
  py += 38;
  text(f.money(c.deposit), P + 32, py, { size: 30, weight: 700 });
  text(f.money(c.balance), P + 32 + pcol, py, { size: 30, weight: 700 });
  if (f.num(d.cash)) {
    py += 26; rule(py, C.line, P + 32, W - P - 32); py += 44;
    text(`Pagando en efectivo (−${f.qtyStr(f.num(d.cash))}%)`, P + 32, py, { size: 24, weight: 600, color: C.green });
    text(f.money(c.cashTotal), W - P - 32, py, { size: 28, weight: 800, color: C.green, align: 'right' });
  }
  y += boxH + 64;

  // --- Condiciones
  const conds = String(s.conditions || '').split('\n').map((l) => l.replace(/^[•\-\s]+/, '').trim()).filter(Boolean);
  if (conds.length) {
    text('CONDICIONES', P, y, { size: 18, weight: 700, color: C.muted, spacing: 2 });
    y += 40;
    conds.forEach((cnd) => {
      const lines = wrap(cnd, W - 2 * P - 30, 22);
      x.fillStyle = C.green; x.beginPath(); x.arc(P + 6, y - 7, 4, 0, Math.PI * 2); x.fill();
      lines.forEach((l) => { text(l, P + 26, y, { size: 22, color: '#4b544e' }); y += 32; });
      y += 6;
    });
    y += 30;
  }

  // --- Pie
  rule(y);
  y += 54;
  text([s.company, s.phone].filter(Boolean).join('  ·  '), W / 2, y, { size: 22, weight: 600, color: C.green, align: 'center' });
  y += 34;
  text('Gracias por su confianza', W / 2, y, { size: 20, color: C.muted, align: 'center' });
  y += 56;

  const out = document.createElement('canvas');
  out.width = W * SCALE; out.height = Math.ceil(y * SCALE);
  out.getContext('2d').drawImage(tall, 0, 0);
  return out;
}

// Hoja simple (forma de vesica rotada) como marca.
function leaf(x, cx, cy, r, color) {
  x.save(); x.translate(cx, cy); x.rotate(-Math.PI / 4);
  x.beginPath();
  x.moveTo(0, -r); x.quadraticCurveTo(r * 0.95, 0, 0, r); x.quadraticCurveTo(-r * 0.95, 0, 0, -r);
  x.fillStyle = color; x.fill();
  x.strokeStyle = 'rgba(31,79,51,.9)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -r * 0.7); x.lineTo(0, r * 0.85); x.stroke();
  x.restore();
}
