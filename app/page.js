'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ---------- perfiles ---------- */
const PERFILES = [
  { u: 'ximena', nombre: 'Ximena', rol: 'admin' },
  { u: 'ana', nombre: 'Ana', rol: 'admin' },
  { u: 'enoc', nombre: 'Enoc', rol: 'chofer' },
];
const NOMBRES = Object.fromEntries(PERFILES.map((p) => [p.u, p.nombre]));
const ROLE_LABEL = { admin: 'Administración', chofer: 'Chofer' };

/* ---------- fechas y formatos ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const weekStart = (s) => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const weekDays = (s) => { const w = weekStart(s); return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(w, i)); };
const todayStr = () => ymd(new Date());
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const money = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const kmf = (n) => Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
const longDay = (s) => parse(s).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = (s) => parse(s).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
const dow = (s) => parse(s).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
const byTime = (a, b) => (a.hora || '').localeCompare(b.hora || '') || (a.creado || 0) - (b.creado || 0);

/* ---------- cálculos ---------- */
const reading = (D, cam, f) => D.med.find((m) => m.camioneta === cam && m.fecha === f) || null;
function prevReading(D, cam, f) {
  let p = null;
  for (const m of D.med) if (m.camioneta === cam && m.fecha < f && (!p || m.fecha > p.fecha)) p = m;
  return p;
}
function kmDia(D, cam, f) {
  const r = reading(D, cam, f);
  if (!r) return null;
  const p = prevReading(D, cam, f);
  return p ? Math.max(0, r.km - p.km) : null;
}
function camLabel(D, id) {
  const c = D.camsAll.find((c) => c.id === id);
  if (!c) return 'Camioneta';
  return c.activa ? c.nombre : `${c.nombre} (quitada)`;
}
function dayStats(D, f, cam) {
  const v = D.vueltas.filter((x) => x.fecha === f && (!cam || x.camioneta === cam));
  const g = D.gas.filter((x) => x.fecha === f && (!cam || x.camioneta === cam));
  const ids = cam ? [cam] : [...new Set([...D.cams.map((c) => c.id), ...D.med.map((m) => m.camioneta)])];
  let km = 0, kk = false;
  for (const c of ids) { const k = kmDia(D, c, f); if (k != null) { km += k; kk = true; } }
  return { vueltas: v.length, gas: g.reduce((a, b) => a + (+b.monto || 0), 0), litros: g.reduce((a, b) => a + (+b.litros || 0), 0), km, kk };
}
const sumStats = (list) => list.reduce((a, s) => ({
  vueltas: a.vueltas + s.vueltas, gas: a.gas + s.gas, litros: a.litros + s.litros, km: a.km + s.km, kk: a.kk || s.kk,
}), { vueltas: 0, gas: 0, litros: 0, km: 0, kk: false });

/* ---------- servidor ---------- */
async function api(path, { method = 'GET', body } = {}) {
  let r;
  try {
    r = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new Error('Sin conexión a internet. Intenta otra vez.');
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'No se pudo completar.'); e.status = r.status; throw e; }
  return d;
}

/* ---------- avisos ---------- */
let pushToast = () => {};
function ToastHost() {
  const [t, setT] = useState(null);
  const tm = useRef();
  useEffect(() => {
    pushToast = (msg, action) => {
      clearTimeout(tm.current);
      setT({ msg, action });
      tm.current = setTimeout(() => setT(null), action ? 7000 : 2800);
    };
  }, []);
  if (!t) return null;
  return (
    <div className="toast" role="status">
      <span>{t.msg}</span>
      {t.action && <button type="button" onClick={() => { setT(null); t.action.fn(); }}>{t.action.label}</button>}
    </div>
  );
}

/* ---------- íconos ---------- */
const I = {
  route: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>,
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>,
  left: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>,
};
const Mark = ({ big }) => <div className={'mark' + (big ? ' big' : '')} aria-hidden="true">{I.route}</div>;

/* ---------- piezas ---------- */
function ConfirmBtn({ onConfirm, label = 'Borrar' }) {
  const [arm, setArm] = useState(false);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 4000); return () => clearTimeout(t); }, [arm]);
  return (
    <button type="button" className={'ghost' + (arm ? ' armed' : '')} onClick={() => { if (arm) { setArm(false); onConfirm(); } else setArm(true); }}>
      {arm ? '¿Seguro? Toca otra vez' : label}
    </button>
  );
}
function Odo({ km }) {
  const s = String(Math.round(km)).padStart(6, '0');
  return <div className="odo-digits" aria-label={kmf(km) + ' kilómetros'}>{[...s].map((c, i) => <span key={i}>{c}</span>)}<em>km</em></div>;
}
function Avatar({ u, size }) {
  return <span className={'avatar' + (size ? ' ' + size : '')} data-u={u} aria-hidden="true">{(NOMBRES[u] || '?')[0]}</span>;
}
function Splash({ children }) {
  return (
    <div className="splash layer">
      <div className="glass splash-card"><Mark big /><h1>Bitácora del Chofer</h1>{children}</div>
    </div>
  );
}
function Kpi({ label, value, hint, tone }) {
  return <div className={'glass kpi ' + (tone || '')}><span className="eyebrow">{label}</span><span className="v">{value}</span><span className="h">{hint}</span></div>;
}
function CamSelect({ D, value, onChange, id }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} required>
      {D.cams.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.placas ? ' · ' + c.placas : ''}</option>)}
    </select>
  );
}
function TopBar({ me, onLogout }) {
  return (
    <header className="glass topbar">
      <div className="brand"><Mark /><div><div className="brand-name">Bitácora</div><div className="brand-sub">del Chofer</div></div></div>
      <div className="who">
        <div className="who-txt"><b>{me.nombre}</b><span className={'role ' + me.rol}>{ROLE_LABEL[me.rol]}</span></div>
        <Avatar u={me.usuario} />
        <button type="button" className="ghost" onClick={onLogout}>Salir</button>
      </div>
    </header>
  );
}
function DateNav({ sel, setSel }) {
  const t = todayStr();
  return (
    <div className="glass datenav">
      <button type="button" className="iconbtn" aria-label="Día anterior" onClick={() => setSel(addDays(sel, -1))}>{I.left}</button>
      <label className="mid">
        <b className="cap">{longDay(sel)}{sel === t ? ' · hoy' : ''}</b>
        <input type="date" id="fecha" aria-label="Elegir fecha" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
      </label>
      <button type="button" className="iconbtn" aria-label="Día siguiente" onClick={() => setSel(addDays(sel, 1))}>{I.right}</button>
      {sel !== t && <button type="button" className="ghost" onClick={() => setSel(t)}>Hoy</button>}
    </div>
  );
}

/* ---------- arranque ---------- */
export default function Page() {
  const [me, setMe] = useState(undefined);
  useEffect(() => { api('/api/me').then((d) => setMe(d.user)).catch(() => setMe(null)); }, []);
  const logout = async () => { await api('/api/logout', { method: 'POST' }).catch(() => {}); setMe(null); };
  let body;
  if (me === undefined) body = <Splash><div className="loader" /><p className="muted">Cargando…</p></Splash>;
  else if (!me) body = <Login onLogin={setMe} />;
  else body = <Main me={me} onLogout={logout} onExpired={() => setMe(null)} />;
  return <><div className="aurora" aria-hidden="true" />{body}<ToastHost /></>;
}

function Login({ onLogin }) {
  const [u, setU] = useState(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pwRef = useRef(null);
  useEffect(() => { if (u) pwRef.current?.focus(); }, [u]);
  const submit = async (e) => {
    e.preventDefault();
    if (!u || busy) return;
    setBusy(true); setErr('');
    try { const d = await api('/api/login', { method: 'POST', body: { usuario: u, password: pw } }); onLogin(d.user); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Splash>
      <p className="muted">¿Quién eres?</p>
      <div className="profiles">
        {PERFILES.map((p) => (
          <button key={p.u} type="button" className={'profile' + (u === p.u ? ' on' : '')} aria-pressed={u === p.u}
            onClick={() => { setU(p.u); setErr(''); setPw(''); }}>
            <Avatar u={p.u} size="lg" /><b>{p.nombre}</b><span className={'role ' + p.rol}>{ROLE_LABEL[p.rol]}</span>
          </button>
        ))}
      </div>
      {u && (
        <form className="login-form" onSubmit={submit}>
          <label className="field">Contraseña de {NOMBRES[u]}
            <input ref={pwRef} id="password" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
          {err && <p className="err">{err}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
      )}
    </Splash>
  );
}

function useData(onExpired) {
  const [D, setD] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const d = await api('/api/data');
      const camsAll = d.camionetas;
      setD({ camsAll, cams: camsAll.filter((c) => c.activa), vueltas: d.vueltas, gas: d.gasolina, med: d.medidor });
      setError('');
    } catch (e) {
      if (e.status === 401) onExpired();
      else setError(e.message);
    }
  }, [onExpired]);
  useEffect(() => {
    reload();
    const t = setInterval(() => { if (!document.hidden) reload(); }, 20000);
    const f = () => reload();
    window.addEventListener('focus', f);
    return () => { clearInterval(t); window.removeEventListener('focus', f); };
  }, [reload]);
  return { D, reload, error };
}

function Main({ me, onLogout, onExpired }) {
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;
  const stableExpired = useCallback(() => expiredRef.current(), []);
  const { D, reload, error } = useData(stableExpired);
  const act = useCallback(async (fn, ok, action) => {
    try { await fn(); if (ok) pushToast(ok, action); await reload(); return true; }
    catch (e) { if (e.status === 401) stableExpired(); pushToast(e.message); return false; }
  }, [reload, stableExpired]);

  if (!D) {
    return (
      <Splash>
        {error ? <><p className="err">{error}</p><button className="btn" type="button" onClick={reload}>Reintentar</button></>
          : <><div className="loader" /><p className="muted">Cargando registros…</p></>}
      </Splash>
    );
  }
  const P = { D, me, act };
  return (
    <div className="app layer">
      <TopBar me={me} onLogout={onLogout} />
      {error && <div className="notice">{error} Lo que ves puede no estar al día.</div>}
      {me.rol === 'chofer' ? <ChoferView {...P} /> : <AdminView {...P} />}
    </div>
  );
}

/* ---------- vista chofer ---------- */
function ChoferView({ D, me, act }) {
  const today = todayStr();
  const cams = D.cams;
  const [cam, setCamS] = useState(() => { try { return Number(localStorage.getItem('bc-cam')) || 0; } catch { return 0; } });
  const setCam = (id) => { setCamS(id); try { localStorage.setItem('bc-cam', String(id)); } catch {} };
  const camOk = cams.some((c) => c.id === cam);
  useEffect(() => { if (!camOk && cams.length) setCamS(cams[0].id); }, [camOk, cams]);

  const mine = D.vueltas.filter((v) => v.fecha === today && v.creadoPor === me.usuario).sort(byTime);
  const myGas = D.gas.filter((g) => g.fecha === today && g.creadoPor === me.usuario);

  const [dest, setDest] = useState('');
  const [busy, setBusy] = useState(false);
  const addVuelta = async () => {
    if (!camOk || busy) return;
    setBusy(true);
    let newId = null;
    const ok = await act(async () => {
      const r = await api('/api/vueltas', { method: 'POST', body: { fecha: today, hora: nowHM(), camioneta: cam, destino: dest } });
      newId = r.id;
    }, `Vuelta ${mine.length + 1} registrada`, { label: 'Deshacer', fn: () => act(() => api('/api/vueltas/' + newId, { method: 'DELETE' }), 'Vuelta quitada') });
    if (ok) setDest('');
    setBusy(false);
  };

  const r = camOk ? reading(D, cam, today) : null;
  const p = camOk ? prevReading(D, cam, today) : null;
  const [km, setKm] = useState('');
  const [editKm, setEditKm] = useState(false);
  const [kmErr, setKmErr] = useState('');
  useEffect(() => { setKm(''); setEditKm(false); setKmErr(''); }, [cam]);
  const saveKm = async (e) => {
    e.preventDefault();
    const n = parseInt(km, 10);
    if (!(n >= 0)) { setKmErr('Escribe los kilómetros que marca el tablero.'); return; }
    if (p && n < p.km) { setKmErr(`No puede ser menor que la lectura anterior (${kmf(p.km)} km).`); return; }
    setKmErr('');
    if (await act(() => api('/api/medidor', { method: 'PUT', body: { fecha: today, camioneta: cam, km: n } }), 'Medidor guardado')) {
      setKm(''); setEditKm(false);
    }
  };

  const [gOpen, setGOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [litros, setLitros] = useState('');
  const saveGas = async (e) => {
    e.preventDefault();
    const m = parseFloat(monto);
    if (!(m > 0)) { pushToast('Escribe cuánto pagaste'); return; }
    let newId = null;
    const ok = await act(async () => {
      const res = await api('/api/gasolina', { method: 'POST', body: { fecha: today, hora: nowHM(), camioneta: cam, monto: m, litros } });
      newId = res.id;
    }, 'Carga de gasolina guardada', { label: 'Deshacer', fn: () => act(() => api('/api/gasolina/' + newId, { method: 'DELETE' }), 'Carga quitada') });
    if (ok) { setMonto(''); setLitros(''); setGOpen(false); }
  };

  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <div className="hello"><h1>{saludo}, <em>{me.nombre}</em></h1><p className="cap">{longDay(today)}</p></div>

      <section className="glass card">
        <span className="eyebrow">1 · ¿Qué camioneta traes?</span>
        {cams.length ? (
          <div className="chips">
            {cams.map((c) => (
              <button type="button" key={c.id} className={'chip' + (c.id === cam ? ' on' : '')} aria-pressed={c.id === cam} onClick={() => setCam(c.id)}>
                <b>{c.nombre}</b>{c.placas && <small>{c.placas}</small>}
              </button>
            ))}
          </div>
        ) : <div className="empty">Todavía no hay camionetas. Pide a Ana o a Ximena que las den de alta.</div>}
      </section>

      <section className="glass card hero">
        <span className="eyebrow">2 · Cada vez que salgas</span>
        <div className="count"><span className="big">{mine.length}</span><span className="muted">{mine.length === 1 ? 'vuelta hoy' : 'vueltas hoy'}</span></div>
        <input className="input" id="destino" type="text" maxLength={120} placeholder="¿A dónde vas? (opcional)" value={dest} onChange={(e) => setDest(e.target.value)} />
        <button type="button" className="mega" disabled={!camOk || busy} onClick={addVuelta}>+ Registrar vuelta</button>
      </section>

      <section className="glass card">
        <div className="card-head">
          <span className="eyebrow">3 · Medidor de hoy</span>
          {camOk && (r ? <span className="pill ok">Registrado</span> : <span className="pill warn">Falta registrar</span>)}
        </div>
        {r && !editKm ? (
          <>
            <Odo km={r.km} />
            <div className="kv"><span>Recorrido desde la lectura anterior</span><b>{p ? kmf(r.km - p.km) + ' km' : '—'}</b></div>
            <div><button type="button" className="ghost" onClick={() => { setEditKm(true); setKm(String(r.km)); }}>Corregir lectura</button></div>
          </>
        ) : (
          <form className="grid2" onSubmit={saveKm}>
            <label className="field full">¿Cuántos kilómetros marca el tablero?
              <input id="km" type="number" inputMode="numeric" min="0" step="1" placeholder={p ? String(p.km) : '125430'} value={km} onChange={(e) => setKm(e.target.value)} required />
            </label>
            <p className="hint full">{p ? `Lectura anterior: ${kmf(p.km)} km (${shortDay(p.fecha)}).` : 'Primera lectura de esta camioneta.'}</p>
            {kmErr && <p className="err full">{kmErr}</p>}
            {editKm && <button className="btn soft" type="button" onClick={() => { setEditKm(false); setKmErr(''); }}>Cancelar</button>}
            <button className={'btn' + (editKm ? '' : ' full')} type="submit" disabled={!camOk}>Guardar medidor</button>
          </form>
        )}
      </section>

      <section className="glass card">
        <div className="card-head">
          <span className="eyebrow">Gasolina</span>
          <span>{myGas.length ? money(myGas.reduce((a, g) => a + (+g.monto || 0), 0)) + ' hoy' : 'Sin cargas hoy'}</span>
        </div>
        {gOpen ? (
          <form className="grid2" onSubmit={saveGas}>
            <label className="field">Monto pagado (MXN)
              <input id="monto" type="number" inputMode="decimal" min="1" step="0.01" placeholder="800" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </label>
            <label className="field">Litros (opcional)
              <input id="litros" type="number" inputMode="decimal" min="0" step="0.01" placeholder="34.5" value={litros} onChange={(e) => setLitros(e.target.value)} />
            </label>
            <button className="btn soft" type="button" onClick={() => setGOpen(false)}>Cancelar</button>
            <button className="btn" type="submit" disabled={!camOk}>Guardar carga</button>
          </form>
        ) : <button type="button" className="btn soft" disabled={!camOk} onClick={() => setGOpen(true)}>+ Registrar carga de gasolina</button>}
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Mis vueltas de hoy</h2><span>{mine.length} en total</span></div>
        {mine.length ? (
          <>
            <ul className="rows">
              {mine.map((v, i) => (
                <li className="row" key={v.id}>
                  <span className="t">{v.hora}</span>
                  <span className="w"><span className="tag v">Vuelta {i + 1}</span><span>{camLabel(D, v.camioneta)}</span>{v.destino && <small>{v.destino}</small>}</span>
                  <span />
                </li>
              ))}
            </ul>
            <p className="hint">¿Te equivocaste? Avísale a Ana o a Ximena para que lo corrijan.</p>
          </>
        ) : <div className="empty">Aquí aparecerán tus vueltas. Toca <b>Registrar vuelta</b> cada vez que salgas.</div>}
      </section>
    </>
  );
}

/* ---------- vista administración ---------- */
const TABS = [
  { id: 'resumen', label: 'Resumen', icon: I.chart },
  { id: 'registros', label: 'Registros', icon: I.list },
  { id: 'camionetas', label: 'Camionetas', icon: I.truck },
];
function AdminView(props) {
  const [tab, setTabS] = useState('resumen');
  useEffect(() => { try { const t = localStorage.getItem('bc-tab'); if (TABS.some((x) => x.id === t)) setTabS(t); } catch {} }, []);
  const setTab = (t) => { setTabS(t); try { localStorage.setItem('bc-tab', t); } catch {} window.scrollTo({ top: 0 }); };
  const [sel, setSel] = useState(todayStr);
  const P = { ...props, sel, setSel };
  return (
    <>
      {tab === 'resumen' && <Resumen {...P} />}
      {tab === 'registros' && <Registros {...P} />}
      {tab === 'camionetas' && <Camionetas {...P} />}
      <nav className="glass tabbar" aria-label="Secciones">
        {TABS.map((t) => (
          <button type="button" key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>{t.icon}<span>{t.label}</span></button>
        ))}
      </nav>
    </>
  );
}

function Resumen({ D, act, sel, setSel }) {
  const s = dayStats(D, sel);
  const cams = D.cams;
  const done = cams.filter((c) => reading(D, c.id, sel)).length;
  const days = weekDays(sel);
  const ws = days.map((d) => dayStats(D, d));
  const wt = sumStats(ws);
  const maxV = Math.max(1, ...ws.map((x) => x.vueltas));
  const maxG = Math.max(1, ...ws.map((x) => x.gas));
  const camIds = [...new Set([
    ...cams.map((c) => c.id),
    ...D.vueltas.filter((v) => days.includes(v.fecha)).map((v) => v.camioneta),
    ...D.gas.filter((g) => days.includes(g.fecha)).map((g) => g.camioneta),
  ])];
  return (
    <>
      <DateNav sel={sel} setSel={setSel} />
      <div className="kpis">
        <Kpi label="Vueltas" value={s.vueltas} hint="en el día" tone="green" />
        <Kpi label="Gasolina" value={money(s.gas)} hint={s.litros ? s.litros.toFixed(1) + ' litros' : 'gastado en el día'} tone="blue" />
        <Kpi label="Km recorridos" value={s.kk ? kmf(s.km) : '—'} hint="según el medidor" />
        <Kpi label="Medidor" value={`${done} / ${cams.length}`}
          hint={cams.length && done === cams.length ? <span className="pill ok">Completo</span>
            : <span className="pill warn">{cams.length ? `Faltan ${cams.length - done}` : 'Sin camionetas'}</span>} />
      </div>

      <section className="glass card">
        <div className="card-head"><h2>Semana</h2><span>{shortDay(days[0])} – {shortDay(days[6])}</span></div>
        <div className="week">
          {days.map((d, i) => (
            <button type="button" key={d} className={'wk' + (d === sel ? ' on' : '')} onClick={() => setSel(d)} title={`${ws[i].vueltas} vueltas · ${money(ws[i].gas)}`}>
              <div className="bars">
                <span className="b v" style={{ height: (ws[i].vueltas / maxV) * 100 + '%' }} />
                <span className="b g" style={{ height: (ws[i].gas / maxG) * 100 + '%' }} />
              </div>
              <span className="n">{ws[i].vueltas}</span>
              <span className="d">{dow(d)} {parse(d).getDate()}</span>
            </button>
          ))}
        </div>
        <div className="legend"><span><i className="dot v" />Vueltas (número abajo)</span><span><i className="dot g" />Gasolina en pesos</span></div>
        <div className="totals">
          <div><b>{wt.vueltas}</b><span>vueltas</span></div>
          <div><b>{money(wt.gas)}</b><span>gasolina</span></div>
          <div><b>{wt.kk ? kmf(wt.km) : '—'}</b><span>km recorridos</span></div>
          <div><b>{wt.kk && wt.litros ? (wt.km / wt.litros).toFixed(1) : '—'}</b><span>km por litro</span></div>
        </div>
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Medidor del día</h2><span>{shortDay(sel)}</span></div>
        {cams.length
          ? <div className="odo-grid">{cams.map((c) => <OdoCard key={c.id + sel} D={D} act={act} cam={c} fecha={sel} />)}</div>
          : <div className="empty">Agrega camionetas en la pestaña <b>Camionetas</b> para ver su medidor.</div>}
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Por camioneta</h2><span>esta semana</span></div>
        {camIds.length ? (
          <div className="tbl">
            <table>
              <thead><tr><th>Camioneta</th><th>Vueltas</th><th>Gasolina</th><th>Litros</th><th>Km</th><th>Km/L</th></tr></thead>
              <tbody>
                {camIds.map((id) => {
                  const t = sumStats(days.map((d) => dayStats(D, d, id)));
                  return (
                    <tr key={id}>
                      <td>{camLabel(D, id)}</td><td>{t.vueltas}</td><td>{money(t.gas)}</td>
                      <td>{t.litros ? t.litros.toFixed(1) : '—'}</td><td>{t.kk ? kmf(t.km) : '—'}</td>
                      <td>{t.kk && t.litros ? (t.km / t.litros).toFixed(1) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">Cuando haya vueltas y cargas verás el resumen de cada camioneta.</div>}
      </section>
    </>
  );
}

function OdoCard({ D, act, cam, fecha }) {
  const r = reading(D, cam.id, fecha);
  const p = prevReading(D, cam.id, fecha);
  const k = kmDia(D, cam.id, fecha);
  const [edit, setEdit] = useState(false);
  const [km, setKm] = useState('');
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    const n = parseInt(km, 10);
    if (!(n >= 0)) { setErr('Escribe un número válido.'); return; }
    if (p && n < p.km) { setErr(`Menor que la lectura anterior (${kmf(p.km)} km).`); return; }
    if (await act(() => api('/api/medidor', { method: 'PUT', body: { fecha, camioneta: cam.id, km: n } }), 'Medidor guardado')) { setEdit(false); setErr(''); }
  };
  return (
    <div className="odo-card">
      <div className="odo-top"><b>{cam.nombre}</b>{r ? <span className="pill ok">Registrado</span> : <span className="pill warn">Falta lectura</span>}</div>
      {edit ? (
        <form className="grid2" onSubmit={save}>
          <label className="field full">Kilómetros
            <input type="number" inputMode="numeric" min="0" step="1" value={km} onChange={(e) => setKm(e.target.value)} required />
          </label>
          {err && <p className="err full">{err}</p>}
          <button type="button" className="btn soft" onClick={() => { setEdit(false); setErr(''); }}>Cancelar</button>
          <button className="btn" type="submit">Guardar</button>
        </form>
      ) : r && <Odo km={r.km} />}
      <div className="kv"><span>Lectura anterior</span><b>{p ? `${kmf(p.km)} km · ${shortDay(p.fecha)}` : '—'}</b></div>
      <div className="kv"><span>Recorrido del día</span><b>{k != null ? kmf(k) + ' km' : '—'}</b></div>
      {!edit && (
        <div className="btnrow">
          <button type="button" className="ghost" onClick={() => { setEdit(true); setKm(r ? String(r.km) : ''); }}>{r ? 'Editar' : 'Registrar lectura'}</button>
          {r && <ConfirmBtn onConfirm={() => act(() => api(`/api/medidor?fecha=${fecha}&camioneta=${cam.id}`, { method: 'DELETE' }), 'Lectura borrada')} />}
        </div>
      )}
    </div>
  );
}

function Registros({ D, act, sel, setSel }) {
  const items = [
    ...D.vueltas.filter((x) => x.fecha === sel).map((x) => ({ ...x, kind: 'v', col: 'vueltas' })),
    ...D.gas.filter((x) => x.fecha === sel).map((x) => ({ ...x, kind: 'g', col: 'gasolina' })),
  ].sort(byTime);
  const [editing, setEditing] = useState(null);
  const [kind, setKind] = useState('v');
  const [f, setF] = useState({ cam: 0, hora: '', dest: '', monto: '', litros: '' });
  useEffect(() => { setF((x) => (x.hora ? x : { ...x, hora: nowHM() })); }, []);
  const camVal = D.cams.some((c) => c.id === f.cam) ? f.cam : D.cams[0]?.id || 0;
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!camVal) return;
    const base = { fecha: sel, hora: f.hora || nowHM(), camioneta: camVal };
    let ok;
    if (kind === 'v') ok = await act(() => api('/api/vueltas', { method: 'POST', body: { ...base, destino: f.dest } }), 'Vuelta agregada');
    else {
      if (!(parseFloat(f.monto) > 0)) { pushToast('Escribe el monto pagado'); return; }
      ok = await act(() => api('/api/gasolina', { method: 'POST', body: { ...base, monto: f.monto, litros: f.litros } }), 'Carga agregada');
    }
    if (ok) setF({ ...f, dest: '', monto: '', litros: '', hora: nowHM() });
  };
  const nv = items.filter((i) => i.kind === 'v').length;
  let n = 0;
  return (
    <>
      <DateNav sel={sel} setSel={setSel} />
      <section className="glass card">
        <div className="card-head"><h2>Movimientos</h2><span>{nv} vueltas · {items.length - nv} cargas</span></div>
        {items.length ? (
          <ul className="rows">
            {items.map((i) => (
              <li className="row" key={i.col + i.id}>
                <span className="t">{i.hora}</span>
                <span className="w">
                  {i.kind === 'v' ? <span className="tag v">Vuelta {++n}</span> : <span className="tag g">Gasolina · {money(i.monto)}</span>}
                  <span>{camLabel(D, i.camioneta)}{i.kind === 'g' && i.litros ? ` · ${(+i.litros).toFixed(2)} L` : ''}</span>
                  {i.kind === 'v' && i.destino && <small>{i.destino}</small>}
                  <span className="by"><Avatar u={i.creadoPor} size="sm" />{NOMBRES[i.creadoPor] || i.creadoPor}</span>
                </span>
                <span className="acts">
                  <button type="button" className="ghost" onClick={() => setEditing(i)}>Editar</button>
                  <ConfirmBtn onConfirm={() => act(() => api(`/api/${i.col}/${i.id}`, { method: 'DELETE' }), 'Registro borrado')} />
                </span>
              </li>
            ))}
          </ul>
        ) : <div className="empty">Sin movimientos este día.</div>}
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Agregar registro</h2><span>para {shortDay(sel)}</span></div>
        <div className="seg" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={kind === 'v'} onClick={() => setKind('v')}>Vuelta</button>
          <button type="button" aria-pressed={kind === 'g'} onClick={() => setKind('g')}>Gasolina</button>
        </div>
        {D.cams.length ? (
          <form className="grid2" onSubmit={submit}>
            <label className="field">Camioneta<CamSelect id="a-cam" D={D} value={camVal} onChange={(v) => setF({ ...f, cam: v })} /></label>
            <label className="field">Hora<input id="a-hora" type="time" value={f.hora} onChange={upd('hora')} required /></label>
            {kind === 'v' ? (
              <label className="field full">Destino o nota (opcional)
                <input id="a-dest" type="text" maxLength={120} value={f.dest} onChange={upd('dest')} placeholder="Ej. Bodega centro → Cliente Pérez" />
              </label>
            ) : (
              <>
                <label className="field">Monto (MXN)<input id="a-monto" type="number" inputMode="decimal" min="1" step="0.01" value={f.monto} onChange={upd('monto')} required /></label>
                <label className="field">Litros (opcional)<input id="a-litros" type="number" inputMode="decimal" min="0" step="0.01" value={f.litros} onChange={upd('litros')} /></label>
              </>
            )}
            <button className="btn full" type="submit">{kind === 'v' ? 'Agregar vuelta' : 'Agregar carga'}</button>
          </form>
        ) : <div className="empty">Primero agrega una camioneta.</div>}
      </section>
      {editing && <EditSheet D={D} act={act} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditSheet({ D, act, item, onClose }) {
  const [f, setF] = useState({
    cam: item.camioneta, hora: item.hora || '', dest: item.destino || '', fecha: item.fecha,
    monto: item.monto != null ? String(item.monto) : '', litros: item.litros != null ? String(item.litros) : '',
  });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const camKnown = D.cams.some((c) => c.id === f.cam);
  const save = async (e) => {
    e.preventDefault();
    const data = { fecha: f.fecha, hora: f.hora, camioneta: f.cam };
    if (item.kind === 'v') data.destino = f.dest;
    else {
      if (!(parseFloat(f.monto) > 0)) { pushToast('Escribe el monto pagado'); return; }
      data.monto = f.monto; data.litros = f.litros;
    }
    if (await act(() => api(`/api/${item.col}/${item.id}`, { method: 'PATCH', body: data }), 'Cambios guardados')) onClose();
  };
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="glass sheet" onSubmit={save} role="dialog" aria-modal="true" aria-label="Editar registro">
        <h2>{item.kind === 'v' ? 'Editar vuelta' : 'Editar carga de gasolina'}</h2>
        <div className="grid2">
          <label className="field">Camioneta
            {camKnown ? <CamSelect id="e-cam" D={D} value={f.cam} onChange={(v) => setF({ ...f, cam: v })} /> : <input value={camLabel(D, f.cam)} disabled />}
          </label>
          <label className="field">Fecha<input id="e-fecha" type="date" value={f.fecha} onChange={upd('fecha')} required /></label>
          <label className="field">Hora<input id="e-hora" type="time" value={f.hora} onChange={upd('hora')} required /></label>
          {item.kind === 'v' ? (
            <label className="field full">Destino o nota<input id="e-dest" type="text" maxLength={120} value={f.dest} onChange={upd('dest')} /></label>
          ) : (
            <>
              <label className="field">Monto (MXN)<input id="e-monto" type="number" inputMode="decimal" min="1" step="0.01" value={f.monto} onChange={upd('monto')} required /></label>
              <label className="field">Litros<input id="e-litros" type="number" inputMode="decimal" min="0" step="0.01" value={f.litros} onChange={upd('litros')} /></label>
            </>
          )}
        </div>
        <div className="sheet-acts">
          <button type="button" className="btn soft" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn">Guardar cambios</button>
        </div>
      </form>
    </div>
  );
}

function Camionetas({ D, act }) {
  const [nombre, setNombre] = useState('');
  const [placas, setPlacas] = useState('');
  const add = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (await act(() => api('/api/camionetas', { method: 'POST', body: { nombre, placas } }), 'Camioneta agregada')) { setNombre(''); setPlacas(''); }
  };
  const last = (id) => { let m = null; for (const x of D.med) if (x.camioneta === id && (!m || x.fecha > m.fecha)) m = x; return m; };
  return (
    <>
      <div className="hello"><h1>Camionetas</h1><p>{D.cams.length} activas</p></div>
      <section className="glass card">
        {D.cams.length ? (
          <>
            <ul className="rows">
              {D.cams.map((c) => {
                const m = last(c.id);
                const tv = D.vueltas.filter((v) => v.camioneta === c.id).length;
                return (
                  <li className="row two" key={c.id}>
                    <span className="w"><b>{c.nombre}</b><small>{[c.placas, `${tv} vueltas en total`, m ? `medidor ${kmf(m.km)} km` : null].filter(Boolean).join(' · ')}</small></span>
                    <span className="acts"><ConfirmBtn label="Quitar" onConfirm={() => act(() => api('/api/camionetas/' + c.id, { method: 'DELETE' }), 'Camioneta quitada')} /></span>
                  </li>
                );
              })}
            </ul>
            <p className="hint">Al quitar una camioneta, sus vueltas y cargas anteriores se conservan.</p>
          </>
        ) : <div className="empty">Agrega tu primera camioneta para que Enoc pueda empezar a registrar.</div>}
      </section>
      <section className="glass card">
        <h2>Agregar camioneta</h2>
        <form className="grid2" onSubmit={add}>
          <label className="field">Nombre<input id="c-nombre" type="text" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Nissan blanca" required /></label>
          <label className="field">Placas (opcional)<input id="c-placas" type="text" maxLength={15} value={placas} onChange={(e) => setPlacas(e.target.value)} placeholder="ABC-123-D" /></label>
          <button className="btn full" type="submit">Agregar camioneta</button>
        </form>
      </section>
    </>
  );
}
