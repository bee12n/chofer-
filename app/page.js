'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api, pushToast, ToastHost, I, Mark, Avatar, EmpAvatar, Splash } from '@/components/ui';
import ChoferView from '@/components/chofer';
import Dia from '@/components/admin/dia';
import Dashboard from '@/components/admin/dashboard';
import Mantenimiento from '@/components/admin/mant';
import Flota from '@/components/admin/flota';

const ADMINS = [
  { u: 'ximena', nombre: 'Ximena' },
  { u: 'ana', nombre: 'Ana' },
];
const LAST_KEY = 'bc-ultimo-chofer';
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch { return null; } };
const saveLast = (v) => { try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch {} };
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
  const [choferes, setChoferes] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [last, setLast] = useState(null);
  const [q, setQ] = useState('');
  const [admin, setAdmin] = useState(null);
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);
  const pwRef = useRef(null);

  const cargar = useCallback(() => {
    setLoadErr('');
    api('/api/choferes').then((d) => setChoferes(d.choferes)).catch((e) => setLoadErr(e.message));
  }, []);
  useEffect(() => { cargar(); setLast(readLast()); }, [cargar]);
  useEffect(() => { if (admin) pwRef.current?.focus(); }, [admin]);

  const entrarChofer = async (c) => {
    if (busy) return;
    setBusy('c' + c.id); setErr('');
    try {
      const d = await api('/api/login', { method: 'POST', body: { usuario: 'chofer', empleado: c.id } });
      saveLast({ id: c.id, nombre: c.nombre });
      onLogin(d.user);
    } catch (e) { setErr(e.message); setBusy(null); cargar(); }
  };
  const entrarAdmin = async (e) => {
    e.preventDefault();
    if (busy || !admin) return;
    setBusy(admin); setErr('');
    try { const d = await api('/api/login', { method: 'POST', body: { usuario: admin, password: pw } }); onLogin(d.user); }
    catch (e2) { setErr(e2.message); setBusy(null); setPw(''); pwRef.current?.focus(); }
  };

  const lastOk = last && choferes?.find((c) => c.id === last.id);
  const lista = (choferes || []).filter((c) => !q.trim() || c.nombre.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="splash layer">
      <div className="glass splash-card login-card">
        <div className="login-head">
          <Mark big />
          <div><h1>Bitácora del Chofer</h1><p className="muted">¿Quién eres?</p></div>
        </div>

        {lastOk && (
          <button type="button" className="continue" disabled={!!busy} onClick={() => entrarChofer(lastOk)}>
            <EmpAvatar emp={lastOk} size="lg" />
            <span className="continue-txt"><small>Último en este celular</small><b>Continuar como {lastOk.nombre}</b></span>
            <span className="continue-go" aria-hidden="true">{I.right}</span>
          </button>
        )}

        <section className="login-sec">
          <div className="login-sec-head"><span className="eyebrow">Choferes</span><span className="pill ok">Sin contraseña</span></div>
          {choferes === null && !loadErr && <div className="loader" />}
          {loadErr && <><p className="err">{loadErr}</p><button type="button" className="btn soft" onClick={cargar}>Reintentar</button></>}
          {choferes && choferes.length > 6 && (
            <input className="input" type="search" id="buscar-chofer" placeholder="Buscar tu nombre…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar chofer" />
          )}
          {choferes && (choferes.length ? (
            <div className="drivers">
              {lista.map((c) => (
                <button type="button" key={c.id} className="driver" disabled={!!busy} onClick={() => entrarChofer(c)}>
                  <EmpAvatar emp={c} size="sm2" />
                  <span className="driver-txt"><b>{c.nombre}</b><small>{busy === 'c' + c.id ? 'Entrando…' : c.camionetas[0] || 'Sin camioneta asignada'}</small></span>
                </button>
              ))}
              {!lista.length && <p className="hint">Nadie se llama así.</p>}
            </div>
          ) : <div className="empty">Todavía no hay choferes. Ana o Ximena los agregan en Flota → Empleados.</div>)}
        </section>

        <section className="login-sec">
          <div className="login-sec-head"><span className="eyebrow">Administración</span></div>
          <div className="admins">
            {ADMINS.map((a) => (
              <button key={a.u} type="button" className={'admin-btn' + (admin === a.u ? ' on' : '')} aria-pressed={admin === a.u} disabled={!!busy && busy !== a.u}
                onClick={() => { setAdmin(admin === a.u ? null : a.u); setPw(''); setErr(''); }}>
                <Avatar u={a.u} size="sm2" /><b>{a.nombre}</b>
              </button>
            ))}
          </div>
          {admin && (
            <form className="login-form" onSubmit={entrarAdmin}>
              <label className="field">Contraseña de {ADMINS.find((a) => a.u === admin).nombre}
                <span className="pw-wrap">
                  <input ref={pwRef} id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
                  <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{show ? 'Ocultar' : 'Ver'}</button>
                </span>
              </label>
              <button className="btn" type="submit" disabled={!!busy}>{busy === admin ? 'Entrando…' : 'Entrar'}</button>
            </form>
          )}
        </section>

        {err && <p className="err" role="alert">{err}</p>}
      </div>
    </div>
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
        <div className="brand"><Mark /><div className="brand-txt"><div className="brand-name">Bitácora</div><div className="brand-sub">del Chofer</div></div></div>
        <div className="who">
          {me.rol === 'chofer' ? <EmpAvatar emp={{ id: me.empleado, nombre: me.nombre }} /> : <Avatar u={me.usuario} />}
          <div className="who-txt"><b>{me.nombre}</b><span className={'role ' + me.rol}>{me.rol === 'admin' ? <><span className="tl-long">{ROLE_LABEL.admin}</span><span className="tl-short">Admin</span></> : ROLE_LABEL.chofer}</span></div>
          <button type="button" className="ghost logout" onClick={onLogout}>
            {me.rol === 'chofer' ? <><span className="tl-long">Cambiar chofer</span><span className="tl-short">Cambiar</span></> : 'Salir'}
          </button>
        </div>
      </header>
      {error && <div className="notice">{error} Lo que ves puede no estar al día.</div>}
      {me.rol === 'chofer' ? <ChoferView D={D} act={act} me={me} /> : <AdminView D={D} act={act} me={me} />}
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
