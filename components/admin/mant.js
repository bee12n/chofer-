'use client';
import { useState } from 'react';
import { api, pushToast, I, Avatar, ConfirmBtn, CamSelect, Sheet } from '../ui';
import { mantAlerts, lastReading, camLabel, kmf, money, dateMed, relTime, monthStart, TIPOS_MANT, USUARIOS } from '@/lib/calc';

export default function Mantenimiento({ D, act, me }) {
  const hoy = D.hoy;
  const [fCam, setFCam] = useState(0);
  const [fEst, setFEst] = useState('pendiente');
  const [editing, setEditing] = useState(null);
  const alerts = mantAlerts(D, hoy);
  const pend = D.mants.filter((m) => m.estado === 'pendiente').length;
  const gastoMes = D.mants.filter((m) => m.fecha >= monthStart(hoy) && m.fecha <= hoy).reduce((a, m) => a + (m.costo || 0), 0);
  const list = D.mants.filter((m) => (!fCam || m.camioneta === fCam) && (fEst === 'todos' || m.estado === fEst));

  return (
    <>
      <div className="hello"><h1>Mantenimiento</h1><p>Solo lo ven Ana y Ximena</p></div>

      <div className="kpis three">
        <div className="glass kpi"><span className="eyebrow">Pendientes</span><span className="v">{pend}</span><span className="h">por hacer</span></div>
        <div className="glass kpi"><span className="eyebrow">Alertas</span><span className="v">{alerts.length}</span><span className="h">servicios próximos o vencidos</span></div>
        <div className="glass kpi blue"><span className="eyebrow">Gasto del mes</span><span className="v">{money(gastoMes)}</span><span className="h">en mantenimiento</span></div>
      </div>

      {alerts.length > 0 && (
        <section className="glass card">
          <div className="card-head"><h2>Próximos servicios</h2></div>
          <ul className="alerts">
            {alerts.map((a, i) => (
              <li key={i} className={'alert ' + a.nivel}><span className="ai">{I.wrench}</span>
                <span><b>{camLabel(D, a.m.camioneta)}</b> · {a.m.tipo}: {a.msg}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass card">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Estado">
            <button type="button" aria-pressed={fEst === 'pendiente'} onClick={() => setFEst('pendiente')}>Pendientes</button>
            <button type="button" aria-pressed={fEst === 'hecho'} onClick={() => setFEst('hecho')}>Hechos</button>
            <button type="button" aria-pressed={fEst === 'todos'} onClick={() => setFEst('todos')}>Todos</button>
          </div>
          <label className="field compact"><span className="sr">Camioneta</span><CamSelect id="m-fcam" D={D} value={fCam} onChange={setFCam} todas /></label>
          <button type="button" className="btn" disabled={!D.cams.length} onClick={() => setEditing({})}>+ Nuevo</button>
        </div>
        {!D.cams.length ? <div className="empty">Primero agrega camionetas en la pestaña <b>Flota</b>.</div>
          : list.length ? <div className="mants">{list.map((m) => <MantCard key={m.id} D={D} act={act} me={me} m={m} onEdit={() => setEditing(m)} />)}</div>
          : <div className="empty">{fEst === 'pendiente' ? 'No hay mantenimientos pendientes.' : 'No hay registros con este filtro.'}</div>}
      </section>

      {editing && <MantSheet D={D} act={act} m={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function MantCard({ D, act, me, m, onEdit }) {
  const coms = D.coms.filter((c) => c.mantenimiento === m.id);
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const send = async (e) => {
    e.preventDefault();
    if (!txt.trim()) return;
    if (await act(() => api(`/api/mantenimientos/${m.id}/comentarios`, { method: 'POST', body: { texto: txt } }), 'Comentario agregado')) setTxt('');
  };
  const toggle = () => act(() => api(`/api/mantenimientos/${m.id}`, { method: 'PATCH', body: { ...m, estado: m.estado === 'hecho' ? 'pendiente' : 'hecho' } }),
    m.estado === 'hecho' ? 'Marcado como pendiente' : 'Marcado como hecho');
  const prox = [m.proximoKm != null ? `${kmf(m.proximoKm)} km` : null, m.proximoFecha ? dateMed(m.proximoFecha) : null].filter(Boolean).join(' o ');
  return (
    <article className={'mant ' + m.estado}>
      <div className="mant-head">
        <div className="mant-title"><b>{m.tipo}</b><span>{camLabel(D, m.camioneta)} · {dateMed(m.fecha)}</span></div>
        <span className={'pill ' + (m.estado === 'hecho' ? 'ok' : 'warn')}>{m.estado === 'hecho' ? 'Hecho' : 'Pendiente'}</span>
      </div>
      {m.descripcion && <p className="mant-desc">{m.descripcion}</p>}
      <div className="mant-meta">
        {m.costo != null && <span><small>Costo</small><b>{money(m.costo)}</b></span>}
        {m.km != null && <span><small>Km</small><b>{kmf(m.km)}</b></span>}
        {prox && <span><small>Próximo servicio</small><b>{prox}</b></span>}
        <span><small>Registró</small><b>{USUARIOS[m.creadoPor] || m.creadoPor}</b></span>
      </div>
      <div className="btnrow">
        <button type="button" className="ghost" onClick={toggle}>{m.estado === 'hecho' ? 'Marcar pendiente' : '✓ Marcar hecho'}</button>
        <button type="button" className="ghost" onClick={onEdit}>Editar</button>
        <button type="button" className="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{I.chat}<span>{coms.length ? `${coms.length} ${coms.length === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}</span></button>
        <ConfirmBtn onConfirm={() => act(() => api(`/api/mantenimientos/${m.id}`, { method: 'DELETE' }), 'Mantenimiento borrado')} />
      </div>
      {open && (
        <div className="thread">
          {coms.map((c) => (
            <div className="com" key={c.id}>
              <Avatar u={c.autor} size="sm2" />
              <div className="com-body">
                <div className="com-head"><b>{USUARIOS[c.autor] || c.autor}</b><small>{relTime(c.creado)}</small>
                  {c.autor === me.usuario && <button type="button" className="linkbtn" onClick={() => act(() => api(`/api/comentarios/${c.id}`, { method: 'DELETE' }), 'Comentario borrado')}>Borrar</button>}
                </div>
                <p>{c.texto}</p>
              </div>
            </div>
          ))}
          <form className="com-form" onSubmit={send}>
            <input className="input" type="text" maxLength={1000} placeholder="Escribe un comentario…" value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="Comentario" />
            <button className="btn" type="submit" disabled={!txt.trim()}>Enviar</button>
          </form>
        </div>
      )}
    </article>
  );
}

function MantSheet({ D, act, m, onClose }) {
  const nuevo = !m.id;
  const firstCam = D.cams[0]?.id || 0;
  const [f, setF] = useState({
    camioneta: m.camioneta || firstCam,
    fecha: m.fecha || D.hoy,
    tipo: m.tipo || TIPOS_MANT[0],
    descripcion: m.descripcion || '',
    costo: m.costo != null ? String(m.costo) : '',
    km: m.km != null ? String(m.km) : (nuevo && firstCam ? String(lastReading(D, firstCam)?.km ?? '') : ''),
    estado: m.estado || 'pendiente',
    proximoKm: m.proximoKm != null ? String(m.proximoKm) : '',
    proximoFecha: m.proximoFecha || '',
  });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setCam = (id) => setF({ ...f, camioneta: id, km: nuevo && !f.km ? String(lastReading(D, id)?.km ?? '') : f.km });
  const camKnown = D.cams.some((c) => c.id === f.camioneta);
  const save = async () => {
    if (!f.tipo.trim()) { pushToast('Elige el tipo de mantenimiento'); return; }
    const ok = await act(() => api(nuevo ? '/api/mantenimientos' : `/api/mantenimientos/${m.id}`, { method: nuevo ? 'POST' : 'PATCH', body: f }),
      nuevo ? 'Mantenimiento agregado' : 'Cambios guardados');
    if (ok) onClose();
  };
  return (
    <Sheet title={nuevo ? 'Nuevo mantenimiento' : 'Editar mantenimiento'} onClose={onClose} onSubmit={save}>
      <div className="grid2">
        <label className="field">Camioneta
          {camKnown ? <CamSelect id="mt-cam" D={D} value={f.camioneta} onChange={setCam} /> : <input value={camLabel(D, f.camioneta)} disabled />}
        </label>
        <label className="field">Tipo
          <input id="mt-tipo" list="tipos-mant" value={f.tipo} onChange={upd('tipo')} maxLength={40} required />
          <datalist id="tipos-mant">{TIPOS_MANT.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="field">Fecha<input id="mt-fecha" type="date" value={f.fecha} onChange={upd('fecha')} required /></label>
        <label className="field">Estado
          <select id="mt-estado" value={f.estado} onChange={upd('estado')}>
            <option value="pendiente">Pendiente</option>
            <option value="hecho">Hecho</option>
          </select>
        </label>
        <label className="field full">Descripción
          <textarea id="mt-desc" rows={3} maxLength={1000} value={f.descripcion} onChange={upd('descripcion')} placeholder="Qué se hizo o qué hace falta, taller, refacciones…" />
        </label>
        <label className="field">Costo (MXN)<input id="mt-costo" type="number" inputMode="decimal" min="0" step="0.01" value={f.costo} onChange={upd('costo')} /></label>
        <label className="field">Km en el tablero<input id="mt-km" type="number" inputMode="numeric" min="0" step="1" value={f.km} onChange={upd('km')} /></label>
        <p className="hint full">Próximo servicio (opcional): te avisamos cuando se acerque.</p>
        <label className="field">A los km<input id="mt-pkm" type="number" inputMode="numeric" min="0" step="1" value={f.proximoKm} onChange={upd('proximoKm')} placeholder={f.km ? String(Number(f.km) + 10000) : ''} /></label>
        <label className="field">O en la fecha<input id="mt-pf" type="date" value={f.proximoFecha} onChange={upd('proximoFecha')} /></label>
      </div>
    </Sheet>
  );
}
