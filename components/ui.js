'use client';
import { useState, useEffect, useRef } from 'react';
import { addDays, longDay, todayStr, kmf, USUARIOS } from '@/lib/calc';

/* ---------- servidor ---------- */
export async function api(path, { method = 'GET', body } = {}) {
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
export let pushToast = () => {};
export function ToastHost() {
  const [t, setT] = useState(null);
  const tm = useRef();
  useEffect(() => {
    pushToast = (msg) => {
      clearTimeout(tm.current);
      setT(msg);
      tm.current = setTimeout(() => setT(null), 3000);
    };
  }, []);
  if (!t) return null;
  return <div className="toast" role="status"><span>{t}</span></div>;
}

/* ---------- íconos ---------- */
const S = (p) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p });
export const I = {
  route: <svg {...S({ strokeWidth: 2.2 })}><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8" /></svg>,
  day: <svg {...S()}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>,
  chart: <svg {...S()}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  wrench: <svg {...S()}><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-2.6-2.6 3.3-3.3-1.4-1.4-3.3 3.3L3 11l8-8 1.7 1.3a4 4 0 0 0 2 2z" /></svg>,
  truck: <svg {...S()}><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>,
  left: <svg {...S({ strokeWidth: 2.4 })}><path d="M15 5l-7 7 7 7" /></svg>,
  right: <svg {...S({ strokeWidth: 2.4 })}><path d="M9 5l7 7-7 7" /></svg>,
  download: <svg {...S()}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>,
  chat: <svg {...S()}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /></svg>,
  alert: <svg {...S()}><path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" /></svg>,
};
export const Mark = ({ big }) => <div className={'mark' + (big ? ' big' : '')} aria-hidden="true">{I.route}</div>;

/* ---------- piezas ---------- */
export function ConfirmBtn({ onConfirm, label = 'Borrar' }) {
  const [arm, setArm] = useState(false);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 4000); return () => clearTimeout(t); }, [arm]);
  return (
    <button type="button" className={'ghost' + (arm ? ' armed' : '')} onClick={() => { if (arm) { setArm(false); onConfirm(); } else setArm(true); }}>
      {arm ? '¿Seguro? Toca otra vez' : label}
    </button>
  );
}
export function Odo({ km }) {
  const s = String(Math.round(km)).padStart(6, '0');
  return <div className="odo-digits" aria-label={kmf(km) + ' kilómetros'}>{[...s].map((c, i) => <span key={i}>{c}</span>)}<em>km</em></div>;
}
export function Avatar({ u, size }) {
  return <span className={'avatar' + (size ? ' ' + size : '')} data-u={u} aria-hidden="true">{(USUARIOS[u] || '?')[0]}</span>;
}
export function EmpAvatar({ emp, size }) {
  const n = emp?.nombre || '?';
  return <span className={'avatar' + (size ? ' ' + size : '')} data-v={emp ? emp.id % 3 : 0} aria-hidden="true">{n.trim()[0]?.toUpperCase() || '?'}</span>;
}
export function Splash({ children }) {
  return (
    <div className="splash layer">
      <div className="glass splash-card"><Mark big /><h1>Bitácora del Chofer</h1>{children}</div>
    </div>
  );
}
export function Kpi({ label, value, hint, tone }) {
  return <div className={'glass kpi ' + (tone || '')}><span className="eyebrow">{label}</span><span className="v">{value}</span><span className="h">{hint}</span></div>;
}
export function CamSelect({ D, value, onChange, id, todas }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} required={!todas}>
      {todas && <option value={0}>Todas las camionetas</option>}
      {D.cams.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.placas ? ' · ' + c.placas : ''}</option>)}
    </select>
  );
}
export function EmpSelect({ D, value, onChange, id }) {
  return (
    <select id={id} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value) || null)}>
      <option value={0}>Sin asignar</option>
      {D.emps.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
    </select>
  );
}
export function Checks({ items, value, onChange, empty }) {
  if (!items.length) return <p className="hint">{empty}</p>;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="checks">
      {items.map((it) => (
        <button type="button" key={it.id} className={'check' + (value.includes(it.id) ? ' on' : '')} aria-pressed={value.includes(it.id)} onClick={() => toggle(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
export function DateNav({ sel, setSel }) {
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
export function Sheet({ title, onClose, onSubmit, children, submitLabel = 'Guardar' }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="glass sheet" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <div className="sheet-acts">
          <button type="button" className="btn soft" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
