'use client';
import { useState, useEffect } from 'react';
import { api, pushToast, Odo } from './ui';
import { reading, prevReading, lecturasDia, camLabel, empLabel, kmf, money, shortDay, longDay, nowHM, byTime } from '@/lib/calc';

/* Lista de las lecturas del día con los km recorridos entre cada una. */
export function Lecturas({ D, list, prev, emp, actions }) {
  if (!list.length) return null;
  return (
    <ul className="lecturas">
      {list.map((m, i) => {
        const base = i ? list[i - 1] : prev;
        const diff = base ? m.km - base.km : null;
        return (
          <li key={m.id}>
            <span className="lt-h">{m.hora || '—'}</span>
            <span className="lt-km"><b>{kmf(m.km)} km</b><small>{m.empleado === emp ? 'Tú' : empLabel(D, m.empleado)}</small></span>
            <span className="lt-diff">{diff != null ? `+${kmf(diff)} km` : 'inicio'}</span>
            {actions && actions(m)}
          </li>
        );
      })}
    </ul>
  );
}

function useStored(key) {
  const [v, setV] = useState(0);
  useEffect(() => { try { setV(Number(localStorage.getItem(key)) || 0); } catch {} }, [key]);
  const set = (x) => { setV(x); try { localStorage.setItem(key, String(x)); } catch {} };
  return [v, set];
}

export default function ChoferView({ D, act, me }) {
  const today = D.hoy;
  const emp = me.empleado;
  const [cam, setCam] = useStored('bc-cam-' + emp);
  const empObj = { id: emp, nombre: me.nombre };

  // Camionetas asignadas a este empleado primero
  const cams = [...D.cams].sort((a, b) => (b.empleados.includes(emp) ? 1 : 0) - (a.empleados.includes(emp) ? 1 : 0) || a.id - b.id);
  const camOk = cams.some((c) => c.id === cam);
  useEffect(() => {
    if (!empObj || camOk || !cams.length) return;
    setCam(cams[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp, camOk, cams.length]);
  const listo = !!empObj && camOk;

  const mine = D.vueltas.filter((v) => v.empleado === emp).sort(byTime);
  const myGas = D.gas.filter((g) => g.empleado === emp);

  const [dest, setDest] = useState('');
  const [busy, setBusy] = useState(false);
  const addVuelta = async () => {
    if (!listo || busy) return;
    setBusy(true);
    const ok = await act(() => api('/api/vueltas', { method: 'POST', body: { hora: nowHM(), camioneta: cam, empleado: emp, destino: dest } }), `Vuelta ${mine.length + 1} registrada`);
    if (ok) setDest('');
    setBusy(false);
  };

  const r = camOk ? reading(D, cam, today) : null;
  const p = camOk ? prevReading(D, cam, today) : null;
  const hoyLecturas = camOk ? lecturasDia(D, cam, today) : [];
  const ultima = r || p; // la lectura más reciente de esta camioneta
  const [km, setKm] = useState('');
  const [kmErr, setKmErr] = useState('');
  const [reAct, setReAct] = useState(false);
  useEffect(() => { setKm(''); setKmErr(''); setReAct(false); }, [cam]);
  const saveKm = async (e) => {
    e.preventDefault();
    const n = parseInt(km, 10);
    if (!(n >= 0)) { setKmErr('Escribe los kilómetros que marca el tablero.'); return; }
    if (ultima && n < ultima.km) { setKmErr(`No puede ser menor que la última lectura (${kmf(ultima.km)} km).`); return; }
    setKmErr('');
    if (await act(() => api('/api/medidor', { method: 'POST', body: { camioneta: cam, km: n } }), r ? 'Medidor reactualizado' : 'Medidor guardado')) { setKm(''); setReAct(false); }
  };
  const kmForm = (
    <form className="grid2" onSubmit={saveKm}>
      <label className="field full">{r ? '¿Cuántos kilómetros marca ahora el tablero?' : '¿Cuántos kilómetros marca el tablero?'}
        <input id="km" type="number" inputMode="numeric" min={ultima ? ultima.km : 0} step="1" placeholder={ultima ? String(ultima.km) : '125430'} value={km} onChange={(e) => setKm(e.target.value)} required autoFocus={reAct} />
      </label>
      <p className="hint full">{ultima ? `Última lectura: ${kmf(ultima.km)} km (${ultima.fecha === today ? 'hoy ' + ultima.hora : shortDay(ultima.fecha)}). Revisa bien el número antes de guardar.` : 'Primera lectura de esta camioneta.'}</p>
      {kmErr && <p className="err full">{kmErr}</p>}
      {reAct && <button className="btn soft" type="button" onClick={() => { setReAct(false); setKmErr(''); setKm(''); }}>Cancelar</button>}
      <button className={'btn' + (reAct ? '' : ' full')} type="submit">{r ? 'Guardar nueva lectura' : 'Guardar medidor'}</button>
    </form>
  );

  const [gOpen, setGOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [litros, setLitros] = useState('');
  const saveGas = async (e) => {
    e.preventDefault();
    if (!(parseFloat(monto) > 0)) { pushToast('Escribe cuánto pagaste'); return; }
    const ok = await act(() => api('/api/gasolina', { method: 'POST', body: { hora: nowHM(), camioneta: cam, empleado: emp, monto, litros } }), 'Carga de gasolina guardada');
    if (ok) { setMonto(''); setLitros(''); setGOpen(false); }
  };

  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <div className="hello">
        <h1>{saludo}{empObj ? <>, <em>{empObj.nombre.split(' ')[0]}</em></> : ''}</h1>
        <p className="cap">{longDay(today)}</p>
      </div>

      {empObj && (
        <section className="glass card">
          <span className="eyebrow">1 · ¿Qué camioneta traes?</span>
          {cams.length ? (
            <div className="chips">
              {cams.map((c) => (
                <button type="button" key={c.id} className={'chip' + (c.id === cam ? ' on' : '')} aria-pressed={c.id === cam} onClick={() => setCam(c.id)}>
                  <b>{c.nombre}</b>
                  <small>{[c.placas, c.empleados.includes(emp) ? 'Asignada a ti' : null].filter(Boolean).join(' · ') || ' '}</small>
                </button>
              ))}
            </div>
          ) : <div className="empty">Todavía no hay camionetas. Pide a Ana o a Ximena que las den de alta.</div>}
        </section>
      )}

      {listo && (
        <>
          <section className="glass card hero">
            <span className="eyebrow">2 · Cada vez que salgas</span>
            <div className="count"><span className="big">{mine.length}</span><span className="muted">{mine.length === 1 ? 'vuelta hoy' : 'vueltas hoy'}</span></div>
            <input className="input" id="destino" type="text" maxLength={120} placeholder="¿A dónde vas? (opcional)" value={dest} onChange={(e) => setDest(e.target.value)} />
            <button type="button" className="mega" disabled={busy} onClick={addVuelta}>+ Registrar vuelta</button>
          </section>

          <section className="glass card">
            <div className="card-head">
              <span className="eyebrow">3 · Medidor de hoy</span>
              {r ? <span className="pill ok">Registrado</span> : <span className="pill warn">Falta registrar</span>}
            </div>
            {r ? (
              <>
                <Odo km={r.km} />
                <div className="kv"><span>Recorrido de hoy</span><b>{p ? kmf(r.km - p.km) + ' km' : '—'}</b></div>
                <Lecturas D={D} list={hoyLecturas} prev={p} emp={emp} />
                {reAct ? kmForm : (
                  <button type="button" className="btn soft" onClick={() => setReAct(true)}>↻ Reactualizar medidor</button>
                )}
                <p className="hint">¿Saliste otra vez con esta camioneta? Al regresar toca <b>Reactualizar medidor</b>. Se guardan todas las lecturas. Si hay un error, avísale a Ana o a Ximena.</p>
              </>
            ) : kmForm}
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
                <button className="btn" type="submit">Guardar carga</button>
              </form>
            ) : <button type="button" className="btn soft" onClick={() => setGOpen(true)}>+ Registrar carga de gasolina</button>}
          </section>
        </>
      )}

      {empObj && (
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
      )}
    </>
  );
}
