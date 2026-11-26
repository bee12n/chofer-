'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api, pushToast, ToastHost, I, Mark, Avatar, Splash } from '@/components/ui';
import ChoferView from '@/components/chofer';
import Dia from '@/components/admin/dia';
import Dashboard from '@/components/admin/dashboard';
import Mantenimiento from '@/components/admin/mant';
import Flota from '@/components/admin/flota';

const PERFILES = [
  { u: 'ximena', nombre: 'Ximena', rol: 'admin', sub: 'Admin' },
  { u: 'ana', nombre: 'Ana', rol: 'admin', sub: 'Admin' },
  { u: 'chofer', nombre: 'Chofer', rol: 'chofer', sub: 'Sin contraseña' },
];
const ROLE_LABEL = { admin: 'Administración', chofer: 'Chofer' };

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
  const entrar = async (usuario, password) => {
    setBusy(true); setErr('');
    try { const d = await api('/api/login', { method: 'POST', body: { usuario, password } }); onLogin(d.user); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  const pick = (p) => {
    setErr(''); setPw('');
    if (p.rol === 'chofer') { setU(null); entrar('chofer', ''); } else setU(p.u);
  };
  return (
    <Splash>
      <p className="muted">¿Quién eres?</p>
      <div className="profiles">
        {PERFILES.map((p) => (
          <button key={p.u} type="button" className={'profile' + (u === p.u ? ' on' : '')} aria-pressed={u === p.u} disabled={busy} onClick={() => pick(p)}>
            <Avatar u={p.u} size="lg" /><b>{p.nombre}</b><span className={'role ' + p.rol}>{p.sub}</span>
          </button>
        ))}
      </div>
      {u && (
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); if (!busy) entrar(u, pw); }}>
          <label className="field">Contraseña de {PERFILES.find((p) => p.u === u).nombre}
            <input ref={pwRef} id="password" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
      )}
      {err && <p className="err">{err}</p>}
    </Splash>
  );
}

function useData(onExpired) {
  const [D, setD] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const d = await api('/api/data');
      setD({
        hoy: d.hoy,
        camsAll: d.camionetas,
        cams: d.camionetas.filter((c) => c.activa),
        empsAll: d.empleados,
        emps: d.empleados.filter((e) => e.activo),
        vueltas: d.vueltas,
        gas: d.gasolina,
        med: d.medidor,
        mants: d.mantenimientos || [],
        coms: d.comentarios || [],
      });
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
  const act = useCallback(async (fn, ok) => {
    try { await fn(); if (ok) pushToast(ok); await reload(); return true; }
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
  return (
    <div className="app layer">
      <header className="glass topbar">
        <div className="brand"><Mark /><div><div className="brand-name">Bitácora</div><div className="brand-sub">del Chofer</div></div></div>
        <div className="who">
          <div className="who-txt"><b>{me.nombre}</b><span className={'role ' + me.rol}>{ROLE_LABEL[me.rol]}</span></div>
          <Avatar u={me.usuario} />
          <button type="button" className="ghost" onClick={onLogout}>Salir</button>
        </div>
      </header>
      {error && <div className="notice">{error} Lo que ves puede no estar al día.</div>}
      {me.rol === 'chofer' ? <ChoferView D={D} act={act} /> : <AdminView D={D} act={act} me={me} />}
    </div>
  );
}

const TABS = [
  { id: 'dia', label: 'Día', icon: I.day },
  { id: 'dash', label: 'Dashboard', icon: I.chart },
  { id: 'mant', label: 'Mantenimiento', short: 'Manten.', icon: I.wrench },
  { id: 'flota', label: 'Flota', icon: I.truck },
];
function AdminView({ D, act, me }) {
  const [tab, setTabS] = useState('dia');
  useEffect(() => { try { const t = localStorage.getItem('bc-tab'); if (TABS.some((x) => x.id === t)) setTabS(t); } catch {} }, []);
  const setTab = (t) => { setTabS(t); try { localStorage.setItem('bc-tab', t); } catch {} window.scrollTo({ top: 0 }); };
  const [sel, setSel] = useState(D.hoy);
  const alertCount = D.mants.filter((m) => m.estado === 'pendiente').length;
  return (
    <>
      {tab === 'dia' && <Dia D={D} act={act} sel={sel} setSel={setSel} />}
      {tab === 'dash' && <Dashboard D={D} goTo={setTab} />}
      {tab === 'mant' && <Mantenimiento D={D} act={act} me={me} />}
      {tab === 'flota' && <Flota D={D} act={act} />}
      <nav className="glass tabbar" aria-label="Secciones">
        {TABS.map((t) => (
          <button type="button" key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <span className="ti">{t.icon}{t.id === 'mant' && alertCount > 0 && <i className="badge">{alertCount}</i>}</span>
            <span className="tl-long">{t.label}</span><span className="tl-short">{t.short || t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
