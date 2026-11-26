/* Fechas, formatos y cálculos compartidos por las vistas (solo cliente). */
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const weekStart = (s) => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
export const weekDays = (s) => { const w = weekStart(s); return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(w, i)); };
export const monthStart = (s) => s.slice(0, 8) + '01';
export const monthEnd = (s) => { const d = parse(monthStart(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return ymd(d); };
export const daysBetween = (a, b) => { const out = []; for (let d = a; d <= b && out.length < 800; d = addDays(d, 1)) out.push(d); return out; };
export const daysUntil = (from, to) => Math.round((parse(to) - parse(from)) / 864e5);
export const todayStr = () => ymd(new Date());
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const money = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
export const kmf = (n) => Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
export const longDay = (s) => parse(s).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
export const shortDay = (s) => parse(s).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
export const dateMed = (s) => parse(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
export const dow = (s) => parse(s).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
export const byTime = (a, b) => (a.hora || '').localeCompare(b.hora || '') || (a.creado || 0) - (b.creado || 0);
export function relTime(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'justo ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ms).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export const USUARIOS = { ximena: 'Ximena', ana: 'Ana', chofer: 'Chofer' };

/* Datos */
/* Puede haber varias lecturas del medidor por camioneta y día (una por viaje). El kilometraje solo sube,
   así que la lectura "del día" es la más alta de ese día. */
const later = (a, b) => !b || a.km > b.km || (a.km === b.km && (a.creado || 0) > (b.creado || 0));
export const lecturasDia = (D, cam, f) =>
  D.med.filter((m) => m.camioneta === cam && m.fecha === f).sort((a, b) => a.km - b.km || (a.creado || 0) - (b.creado || 0));
export function reading(D, cam, f) {
  let p = null;
  for (const m of D.med) if (m.camioneta === cam && m.fecha === f && later(m, p)) p = m;
  return p;
}
export function prevReading(D, cam, f) {
  let p = null;
  for (const m of D.med) if (m.camioneta === cam && m.fecha < f && later(m, p)) p = m;
  return p;
}
export function lastReading(D, cam) {
  let p = null;
  for (const m of D.med) if (m.camioneta === cam && later(m, p)) p = m;
  return p;
}
export function kmDia(D, cam, f) {
  const r = reading(D, cam, f);
  if (!r) return null;
  const p = prevReading(D, cam, f);
  return p ? Math.max(0, r.km - p.km) : null;
}
export function camLabel(D, id) {
  const c = D.camsAll.find((c) => c.id === id);
  if (!c) return 'Camioneta';
  return c.activa ? c.nombre : `${c.nombre} (quitada)`;
}
export function empLabel(D, id) {
  if (id == null) return 'Sin asignar';
  const e = D.empsAll.find((e) => e.id === id);
  if (!e) return 'Empleado';
  return e.activo ? e.nombre : `${e.nombre} (baja)`;
}

/* Estadísticas de un conjunto de días; filtra por camioneta o por empleado. */
export function statsRange(D, days, { cam, emp } = {}) {
  const set = new Set(days);
  const ok = (x) => set.has(x.fecha) && (cam == null || x.camioneta === cam) && (emp === undefined || x.empleado === emp);
  const v = D.vueltas.filter(ok);
  const g = D.gas.filter(ok);
  let km = 0, kk = false;
  if (emp === undefined) {
    const ids = cam != null ? [cam] : [...new Set([...D.cams.map((c) => c.id), ...D.med.map((m) => m.camioneta)])];
    for (const f of days) for (const c of ids) { const k = kmDia(D, c, f); if (k != null) { km += k; kk = true; } }
  }
  return {
    vueltas: v.length,
    gas: g.reduce((a, b) => a + (+b.monto || 0), 0),
    litros: g.reduce((a, b) => a + (+b.litros || 0), 0),
    km, kk,
    dias: new Set(v.map((x) => x.fecha)).size,
    camionetas: [...new Set(v.map((x) => x.camioneta))],
  };
}

/* Alertas de mantenimiento: toma el registro más reciente por camioneta y tipo que tenga próximo servicio. */
export function mantAlerts(D, hoy) {
  const latest = new Map();
  for (const m of D.mants) {
    if (m.proximoKm == null && !m.proximoFecha) continue;
    const c = D.camsAll.find((c) => c.id === m.camioneta);
    if (!c || !c.activa) continue;
    const k = m.camioneta + '|' + m.tipo;
    const prev = latest.get(k);
    if (!prev || m.fecha > prev.fecha || (m.fecha === prev.fecha && m.id > prev.id)) latest.set(k, m);
  }
  const out = [];
  for (const m of latest.values()) {
    if (m.proximoKm != null) {
      const cur = lastReading(D, m.camioneta);
      if (cur) {
        const diff = m.proximoKm - cur.km;
        if (diff <= 0) out.push({ m, nivel: 'bad', msg: `Se pasó por ${kmf(-diff)} km` });
        else if (diff <= 500) out.push({ m, nivel: 'warn', msg: `Faltan ${kmf(diff)} km` });
      }
    }
    if (m.proximoFecha) {
      const d = daysUntil(hoy, m.proximoFecha);
      if (d < 0) out.push({ m, nivel: 'bad', msg: `Venció hace ${-d} ${-d === 1 ? 'día' : 'días'}` });
      else if (d <= 7) out.push({ m, nivel: 'warn', msg: d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}` });
    }
  }
  return out.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'bad' ? -1 : 1));
}

export const TIPOS_MANT = ['Servicio general', 'Cambio de aceite', 'Llantas', 'Frenos', 'Batería', 'Afinación', 'Suspensión', 'Eléctrico', 'Carrocería', 'Verificación', 'Otro'];
