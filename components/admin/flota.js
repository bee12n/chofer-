'use client';
import { useState } from 'react';
import { api, pushToast, ConfirmBtn, EmpAvatar, Checks, Sheet } from '../ui';
import { lastReading, kmf, monthStart } from '@/lib/calc';

export default function Flota({ D, act }) {
  const [vista, setVista] = useState('cams');
  const [editing, setEditing] = useState(null);
  return (
    <>
      <div className="hello"><h1>Flota</h1><p>{D.cams.length} camionetas · {D.emps.length} empleados</p></div>
      <div className="seg big" role="group" aria-label="Ver">
        <button type="button" aria-pressed={vista === 'cams'} onClick={() => setVista('cams')}>Camionetas</button>
        <button type="button" aria-pressed={vista === 'emps'} onClick={() => setVista('emps')}>Empleados</button>
      </div>
      {vista === 'cams' ? <Camionetas D={D} act={act} edit={setEditing} /> : <Empleados D={D} act={act} edit={setEditing} />}
      {editing?.kind === 'cam' && <CamSheet D={D} act={act} c={editing.item} onClose={() => setEditing(null)} />}
      {editing?.kind === 'emp' && <EmpSheet D={D} act={act} e={editing.item} onClose={() => setEditing(null)} />}
    </>
  );
}

function Camionetas({ D, act, edit }) {
  return (
    <section className="glass card">
      <div className="card-head"><h2>Camionetas</h2><button type="button" className="btn sm" onClick={() => edit({ kind: 'cam', item: {} })}>+ Agregar</button></div>
      {D.cams.length ? (
        <>
          <ul className="rows">
            {D.cams.map((c) => {
              const m = lastReading(D, c.id);
              const emps = c.empleados.map((id) => D.emps.find((e) => e.id === id)).filter(Boolean);
              return (
                <li className="row two" key={c.id}>
                  <span className="w">
                    <b>{c.nombre}</b>
                    <small>{[c.placas, m ? `medidor ${kmf(m.km)} km` : 'sin lecturas'].filter(Boolean).join(' · ')}</small>
                    <span className="people">
                      {emps.length ? emps.map((e) => <span className="person-tag" key={e.id}><EmpAvatar emp={e} size="sm" />{e.nombre}</span>)
                        : <small>Sin empleados asignados</small>}
                    </span>
                  </span>
                  <span className="acts">
                    <button type="button" className="ghost" onClick={() => edit({ kind: 'cam', item: c })}>Editar</button>
                    <ConfirmBtn label="Quitar" onConfirm={() => act(() => api('/api/camionetas/' + c.id, { method: 'DELETE' }), 'Camioneta quitada')} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="hint">Al quitar una camioneta, sus vueltas, cargas y mantenimientos anteriores se conservan.</p>
        </>
      ) : <div className="empty">Agrega tu primera camioneta para que los choferes puedan empezar a registrar.</div>}
    </section>
  );
}

function Empleados({ D, act, edit }) {
  const ms = monthStart(D.hoy);
  return (
    <section className="glass card">
      <div className="card-head"><h2>Empleados</h2><button type="button" className="btn sm" onClick={() => edit({ kind: 'emp', item: {} })}>+ Agregar</button></div>
      {D.emps.length ? (
        <ul className="rows">
          {D.emps.map((e) => {
            const cams = D.cams.filter((c) => c.empleados.includes(e.id));
            const vMes = D.vueltas.filter((v) => v.empleado === e.id && v.fecha >= ms).length;
            return (
              <li className="row two" key={e.id}>
                <span className="w emp-row">
                  <EmpAvatar emp={e} />
                  <span className="w">
                    <b>{e.nombre}</b>
                    <small>{[e.telefono, `${vMes} ${vMes === 1 ? 'vuelta' : 'vueltas'} este mes`].filter(Boolean).join(' · ')}</small>
                    <small>{cams.length ? 'Usa: ' + cams.map((c) => c.nombre).join(', ') : 'Sin camioneta asignada'}</small>
                  </span>
                </span>
                <span className="acts">
                  <button type="button" className="ghost" onClick={() => edit({ kind: 'emp', item: e })}>Editar</button>
                  <ConfirmBtn label="Dar de baja" onConfirm={() => act(() => api('/api/empleados/' + e.id, { method: 'DELETE' }), 'Empleado dado de baja')} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : <div className="empty">Agrega a las personas que manejan. Aparecerán en el perfil de chofer para que elijan su nombre.</div>}
    </section>
  );
}

function CamSheet({ D, act, c, onClose }) {
  const nuevo = !c.id;
  const [f, setF] = useState({ nombre: c.nombre || '', placas: c.placas || '', empleados: c.empleados || [] });
  const save = async () => {
    if (!f.nombre.trim()) { pushToast('Escribe el nombre de la camioneta'); return; }
    const ok = await act(() => api(nuevo ? '/api/camionetas' : `/api/camionetas/${c.id}`, { method: nuevo ? 'POST' : 'PATCH', body: f }), nuevo ? 'Camioneta agregada' : 'Cambios guardados');
    if (ok) onClose();
  };
  return (
    <Sheet title={nuevo ? 'Nueva camioneta' : 'Editar camioneta'} onClose={onClose} onSubmit={save}>
      <div className="grid2">
        <label className="field">Nombre<input id="c-nombre" type="text" maxLength={40} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Nissan blanca" required /></label>
        <label className="field">Placas (opcional)<input id="c-placas" type="text" maxLength={15} value={f.placas} onChange={(e) => setF({ ...f, placas: e.target.value })} placeholder="ABC-123-D" /></label>
      </div>
      <div className="field">Empleados que la usan normalmente
        <Checks items={D.emps.map((e) => ({ id: e.id, label: e.nombre }))} value={f.empleados} onChange={(v) => setF({ ...f, empleados: v })}
          empty="Todavía no hay empleados. Agrégalos en la vista Empleados." />
      </div>
    </Sheet>
  );
}

function EmpSheet({ D, act, e, onClose }) {
  const nuevo = !e.id;
  const [f, setF] = useState({ nombre: e.nombre || '', telefono: e.telefono || '', camionetas: e.id ? D.cams.filter((c) => c.empleados.includes(e.id)).map((c) => c.id) : [] });
  const save = async () => {
    if (!f.nombre.trim()) { pushToast('Escribe el nombre del empleado'); return; }
    const ok = await act(() => api(nuevo ? '/api/empleados' : `/api/empleados/${e.id}`, { method: nuevo ? 'POST' : 'PATCH', body: f }), nuevo ? 'Empleado agregado' : 'Cambios guardados');
    if (ok) onClose();
  };
  return (
    <Sheet title={nuevo ? 'Nuevo empleado' : 'Editar empleado'} onClose={onClose} onSubmit={save}>
      <div className="grid2">
        <label className="field">Nombre<input id="e-nombre" type="text" maxLength={50} value={f.nombre} onChange={(ev) => setF({ ...f, nombre: ev.target.value })} placeholder="Ej. Enoc" required /></label>
        <label className="field">Teléfono (opcional)<input id="e-tel" type="tel" maxLength={20} value={f.telefono} onChange={(ev) => setF({ ...f, telefono: ev.target.value })} /></label>
      </div>
      <div className="field">Camionetas que usa normalmente
        <Checks items={D.cams.map((c) => ({ id: c.id, label: c.nombre }))} value={f.camionetas} onChange={(v) => setF({ ...f, camionetas: v })}
          empty="Todavía no hay camionetas." />
      </div>
    </Sheet>
  );
}
