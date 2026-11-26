'use client';
import { useState, useEffect } from 'react';
import { api, pushToast, Kpi, Odo, Avatar, EmpAvatar, ConfirmBtn, CamSelect, EmpSelect, DateNav, Sheet } from '../ui';
import { statsRange, reading, prevReading, kmDia, camLabel, empLabel, kmf, money, shortDay, nowHM, byTime, USUARIOS } from '@/lib/calc';

export default function Dia({ D, act, sel, setSel }) {
  const s = statsRange(D, [sel]);
  const cams = D.cams;
  const done = cams.filter((c) => reading(D, c.id, sel)).length;
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
      <Movimientos D={D} act={act} sel={sel} />
      <section className="glass card">
        <div className="card-head"><h2>Medidor del día</h2><span>{shortDay(sel)}</span></div>
        {cams.length
          ? <div className="odo-grid">{cams.map((c) => <OdoCard key={c.id + sel} D={D} act={act} cam={c} fecha={sel} />)}</div>
          : <div className="empty">Agrega camionetas en la pestaña <b>Flota</b> para ver su medidor.</div>}
      </section>
      <Agregar D={D} act={act} sel={sel} />
    </>
  );
}

function Movimientos({ D, act, sel }) {
  const [editing, setEditing] = useState(null);
  const items = [
    ...D.vueltas.filter((x) => x.fecha === sel).map((x) => ({ ...x, kind: 'v', col: 'vueltas' })),
    ...D.gas.filter((x) => x.fecha === sel).map((x) => ({ ...x, kind: 'g', col: 'gasolina' })),
  ].sort(byTime);
  const nv = items.filter((i) => i.kind === 'v').length;
  let n = 0;
  return (
    <section className="glass card">
      <div className="card-head"><h2>Movimientos</h2><span>{nv} vueltas · {items.length - nv} cargas</span></div>
      {items.length ? (
        <ul className="rows">
          {items.map((i) => {
            const e = D.empsAll.find((x) => x.id === i.empleado);
            return (
              <li className="row" key={i.col + i.id}>
                <span className="t">{i.hora}</span>
                <span className="w">
                  {i.kind === 'v' ? <span className="tag v">Vuelta {++n}</span> : <span className="tag g">Gasolina · {money(i.monto)}</span>}
                  <span>{camLabel(D, i.camioneta)}{i.kind === 'g' && i.litros ? ` · ${(+i.litros).toFixed(2)} L` : ''}</span>
                  {i.kind === 'v' && i.destino && <small>{i.destino}</small>}
                  <span className="by">
                    {e ? <EmpAvatar emp={e} size="sm" /> : null}{empLabel(D, i.empleado)}
                    {i.creadoPor && i.creadoPor !== 'chofer' && <> · registró <Avatar u={i.creadoPor} size="sm" />{USUARIOS[i.creadoPor] || i.creadoPor}</>}
                  </span>
                </span>
                <span className="acts">
                  <button type="button" className="ghost" onClick={() => setEditing(i)}>Editar</button>
                  <ConfirmBtn onConfirm={() => act(() => api(`/api/${i.col}/${i.id}`, { method: 'DELETE' }), 'Registro borrado')} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : <div className="empty">Sin movimientos este día.</div>}
      {editing && <EditSheet D={D} act={act} item={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function Agregar({ D, act, sel }) {
  const [kind, setKind] = useState('v');
  const [f, setF] = useState({ cam: 0, emp: null, hora: '', dest: '', monto: '', litros: '' });
  useEffect(() => { setF((x) => (x.hora ? x : { ...x, hora: nowHM() })); }, []);
  const camVal = D.cams.some((c) => c.id === f.cam) ? f.cam : D.cams[0]?.id || 0;
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!camVal) return;
    const base = { fecha: sel, hora: f.hora || nowHM(), camioneta: camVal, empleado: f.emp };
    let ok;
    if (kind === 'v') ok = await act(() => api('/api/vueltas', { method: 'POST', body: { ...base, destino: f.dest } }), 'Vuelta agregada');
    else {
      if (!(parseFloat(f.monto) > 0)) { pushToast('Escribe el monto pagado'); return; }
      ok = await act(() => api('/api/gasolina', { method: 'POST', body: { ...base, monto: f.monto, litros: f.litros } }), 'Carga agregada');
    }
    if (ok) setF({ ...f, dest: '', monto: '', litros: '', hora: nowHM() });
  };
  return (
    <section className="glass card">
      <div className="card-head"><h2>Agregar registro</h2><span>para {shortDay(sel)}</span></div>
      <div className="seg" role="group" aria-label="Tipo">
        <button type="button" aria-pressed={kind === 'v'} onClick={() => setKind('v')}>Vuelta</button>
        <button type="button" aria-pressed={kind === 'g'} onClick={() => setKind('g')}>Gasolina</button>
      </div>
      {D.cams.length ? (
        <form className="grid2" onSubmit={submit}>
          <label className="field">Camioneta<CamSelect id="a-cam" D={D} value={camVal} onChange={(v) => setF({ ...f, cam: v })} /></label>
          <label className="field">Empleado<EmpSelect id="a-emp" D={D} value={f.emp} onChange={(v) => setF({ ...f, emp: v })} /></label>
          <label className="field">Hora<input id="a-hora" type="time" value={f.hora} onChange={upd('hora')} required /></label>
          {kind === 'v' ? (
            <label className="field">Destino o nota (opcional)
              <input id="a-dest" type="text" maxLength={120} value={f.dest} onChange={upd('dest')} placeholder="Ej. Bodega centro" />
            </label>
          ) : (
            <>
              <label className="field">Monto (MXN)<input id="a-monto" type="number" inputMode="decimal" min="1" step="0.01" value={f.monto} onChange={upd('monto')} required /></label>
              <label className="field">Litros (opcional)<input id="a-litros" type="number" inputMode="decimal" min="0" step="0.01" value={f.litros} onChange={upd('litros')} /></label>
            </>
          )}
          <button className="btn full" type="submit">{kind === 'v' ? 'Agregar vuelta' : 'Agregar carga'}</button>
        </form>
      ) : <div className="empty">Primero agrega una camioneta en la pestaña <b>Flota</b>.</div>}
    </section>
  );
}

function EditSheet({ D, act, item, onClose }) {
  const [f, setF] = useState({
    cam: item.camioneta, emp: item.empleado ?? null, hora: item.hora || '', dest: item.destino || '', fecha: item.fecha,
    monto: item.monto != null ? String(item.monto) : '', litros: item.litros != null ? String(item.litros) : '',
  });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const camKnown = D.cams.some((c) => c.id === f.cam);
  const save = async () => {
    const data = { fecha: f.fecha, hora: f.hora, camioneta: f.cam, empleado: f.emp };
    if (item.kind === 'v') data.destino = f.dest;
    else {
      if (!(parseFloat(f.monto) > 0)) { pushToast('Escribe el monto pagado'); return; }
      data.monto = f.monto; data.litros = f.litros;
    }
    if (await act(() => api(`/api/${item.col}/${item.id}`, { method: 'PATCH', body: data }), 'Cambios guardados')) onClose();
  };
  return (
    <Sheet title={item.kind === 'v' ? 'Editar vuelta' : 'Editar carga de gasolina'} onClose={onClose} onSubmit={save} submitLabel="Guardar cambios">
      <div className="grid2">
        <label className="field">Camioneta
          {camKnown ? <CamSelect id="e-cam" D={D} value={f.cam} onChange={(v) => setF({ ...f, cam: v })} /> : <input value={camLabel(D, f.cam)} disabled />}
        </label>
        <label className="field">Empleado<EmpSelect id="e-emp" D={D} value={f.emp} onChange={(v) => setF({ ...f, emp: v })} /></label>
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
    </Sheet>
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
    if (await act(() => api('/api/medidor', { method: 'PUT', body: { fecha, camioneta: cam.id, km: n, empleado: r?.empleado ?? null } }), 'Medidor guardado')) { setEdit(false); setErr(''); }
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
      {r && r.empleado != null && <div className="kv"><span>Registró</span><b>{empLabel(D, r.empleado)}</b></div>}
      {!edit && (
        <div className="btnrow">
          <button type="button" className="ghost" onClick={() => { setEdit(true); setKm(r ? String(r.km) : ''); }}>{r ? 'Editar' : 'Registrar lectura'}</button>
          {r && <ConfirmBtn onConfirm={() => act(() => api(`/api/medidor?fecha=${fecha}&camioneta=${cam.id}`, { method: 'DELETE' }), 'Lectura borrada')} />}
        </div>
      )}
    </div>
  );
}
