'use client';
import { useState, useMemo } from 'react';
import { Kpi, I, EmpAvatar } from '../ui';
import {
  statsRange, mantAlerts, reading, camLabel, kmf, money, dow, parse, addDays, weekStart, monthStart,
  daysBetween, dateMed, shortDay,
} from '@/lib/calc';

const PRESETS = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mespasado', label: 'Mes pasado' },
  { id: '30', label: '30 días' },
  { id: 'custom', label: 'Fechas' },
];

export default function Dashboard({ D, goTo }) {
  const hoy = D.hoy;
  const [preset, setPreset] = useState('semana');
  const [cd, setCd] = useState(monthStart(hoy));
  const [ch, setCh] = useState(hoy);

  let desde, hasta;
  if (preset === 'semana') [desde, hasta] = [weekStart(hoy), hoy];
  else if (preset === 'mes') [desde, hasta] = [monthStart(hoy), hoy];
  else if (preset === 'mespasado') { const e = addDays(monthStart(hoy), -1); [desde, hasta] = [monthStart(e), e]; }
  else if (preset === '30') [desde, hasta] = [addDays(hoy, -29), hoy];
  else [desde, hasta] = cd <= ch ? [cd, ch] : [ch, cd];

  const R = useMemo(() => {
    const days = daysBetween(desde, hasta);
    const t = statsRange(D, days);
    const inRange = (x) => x.fecha >= desde && x.fecha <= hasta;
    const mantCost = D.mants.filter(inRange).reduce((a, m) => a + (m.costo || 0), 0);

    // Gráfica: por día hasta 45 días; por semana si el rango es más largo
    const weekly = days.length > 45;
    const buckets = [];
    for (const d of days) {
      const k = weekly ? weekStart(d) : d;
      let b = buckets[buckets.length - 1];
      if (!b || b.k !== k) { b = { k, v: 0, g: 0 }; buckets.push(b); }
    }
    const idx = new Map(buckets.map((b, i) => [b.k, i]));
    const keyOf = (f) => (weekly ? weekStart(f) : f);
    D.vueltas.filter(inRange).forEach((v) => { const i = idx.get(keyOf(v.fecha)); if (i != null) buckets[i].v++; });
    D.gas.filter(inRange).forEach((g) => { const i = idx.get(keyOf(g.fecha)); if (i != null) buckets[i].g += +g.monto || 0; });

    const porCam = D.camsAll
      .map((c) => ({ c, s: statsRange(D, days, { cam: c.id }), mant: D.mants.filter((m) => m.camioneta === c.id && inRange(m)).reduce((a, m) => a + (m.costo || 0), 0) }))
      .filter((x) => x.c.activa || x.s.vueltas || x.s.gas || x.mant);
    const empRows = [...D.empsAll.map((e) => ({ e, s: statsRange(D, days, { emp: e.id }) })), { e: null, s: statsRange(D, days, { emp: null }) }]
      .filter((x) => (x.e && x.e.activo) || x.s.vueltas || x.s.gas)
      .sort((a, b) => b.s.vueltas - a.s.vueltas);

    const dest = new Map();
    D.vueltas.filter(inRange).forEach((v) => { const k = v.destino.trim(); if (k) dest.set(k, (dest.get(k) || 0) + 1); });
    const destinos = [...dest.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { days, t, mantCost, weekly, buckets, porCam, empRows, destinos };
  }, [D, desde, hasta]);

  const alerts = mantAlerts(D, hoy);
  const pendientes = D.mants.filter((m) => m.estado === 'pendiente').length;
  const sinMedidor = D.cams.filter((c) => !reading(D, c.id, hoy));
  const { t } = R;
  const maxV = Math.max(1, ...R.buckets.map((b) => b.v));
  const maxG = Math.max(1, ...R.buckets.map((b) => b.g));
  const label = (k) => (R.weekly ? `${parse(k).getDate()}/${parse(k).getMonth() + 1}` : R.buckets.length <= 10 ? `${dow(k)} ${parse(k).getDate()}` : String(parse(k).getDate()));

  return (
    <>
      <div className="hello"><h1>Dashboard</h1><p>{dateMed(desde)} – {dateMed(hasta)}</p></div>

      <section className="glass card">
        <div className="seg wrap" role="group" aria-label="Periodo">
          {PRESETS.map((p) => <button type="button" key={p.id} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</button>)}
        </div>
        {preset === 'custom' && (
          <div className="grid2">
            <label className="field">Desde<input id="d-desde" type="date" value={cd} onChange={(e) => e.target.value && setCd(e.target.value)} /></label>
            <label className="field">Hasta<input id="d-hasta" type="date" value={ch} onChange={(e) => e.target.value && setCh(e.target.value)} /></label>
          </div>
        )}
        <a className="btn excel" href={`/api/export?desde=${desde}&hasta=${hasta}`}>{I.download}<span>Exportar a Excel</span></a>
      </section>

      {(alerts.length > 0 || pendientes > 0 || sinMedidor.length > 0) && (
        <section className="glass card">
          <div className="card-head"><h2>Pendientes</h2></div>
          <ul className="alerts">
            {sinMedidor.length > 0 && (
              <li className="alert warn"><span className="ai">{I.alert}</span><span>Falta el medidor de hoy: <b>{sinMedidor.map((c) => c.nombre).join(', ')}</b></span></li>
            )}
            {alerts.map((a, i) => (
              <li key={i} className={'alert ' + a.nivel}><span className="ai">{I.wrench}</span><span><b>{camLabel(D, a.m.camioneta)}</b> · {a.m.tipo}: {a.msg}</span></li>
            ))}
            {pendientes > 0 && (
              <li className="alert info"><span className="ai">{I.wrench}</span>
                <span>{pendientes} {pendientes === 1 ? 'mantenimiento pendiente' : 'mantenimientos pendientes'} <button type="button" className="linkbtn" onClick={() => goTo('mant')}>Ver</button></span>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="kpis six">
        <Kpi label="Vueltas" value={t.vueltas} hint={`${R.days.length} ${R.days.length === 1 ? 'día' : 'días'}`} tone="green" />
        <Kpi label="Gasolina" value={money(t.gas)} hint={t.litros ? `${t.litros.toFixed(1)} litros` : 'en el periodo'} tone="blue" />
        <Kpi label="Km recorridos" value={t.kk ? kmf(t.km) : '—'} hint="según el medidor" />
        <Kpi label="Rendimiento" value={t.kk && t.litros ? (t.km / t.litros).toFixed(1) : '—'} hint="km por litro" />
        <Kpi label="Gasolina por km" value={t.kk && t.km ? money(t.gas / t.km) : '—'} hint="costo de combustible" />
        <Kpi label="Mantenimiento" value={money(R.mantCost)} hint="gastado en el periodo" />
      </div>

      <section className="glass card">
        <div className="card-head"><h2>{R.weekly ? 'Por semana' : 'Por día'}</h2><span>Gasolina máx. {money(maxG)}</span></div>
        <div className="chart">
          {R.buckets.map((b) => (
            <div key={b.k} className="wk" title={`${R.weekly ? 'Semana del ' + shortDay(b.k) : shortDay(b.k)}: ${b.v} vueltas · ${money(b.g)}`}>
              <div className="bars">
                <span className="b v" style={{ height: (b.v / maxV) * 100 + '%' }} />
                <span className="b g" style={{ height: (b.g / maxG) * 100 + '%' }} />
              </div>
              <span className="n">{b.v}</span>
              <span className="d">{label(b.k)}</span>
            </div>
          ))}
        </div>
        <div className="legend"><span><i className="dot v" />Vueltas (número abajo)</span><span><i className="dot g" />Gasolina en pesos</span></div>
      </section>

      <section className="glass card">
        <div className="card-head"><h2>Por camioneta</h2></div>
        {R.porCam.length ? (
          <div className="tbl stack">
            <table>
              <thead><tr><th>Camioneta</th><th>Vueltas</th><th>Gasolina</th><th>Litros</th><th>Km</th><th>Km/L</th><th>Mantenimiento</th></tr></thead>
              <tbody>
                {R.porCam.map(({ c, s, mant }) => (
                  <tr key={c.id}>
                    <td className="t-name">{camLabel(D, c.id)}</td>
                    <td data-l="Vueltas">{s.vueltas}</td>
                    <td data-l="Gasolina">{money(s.gas)}</td>
                    <td data-l="Litros">{s.litros ? s.litros.toFixed(1) : '—'}</td>
                    <td data-l="Km">{s.kk ? kmf(s.km) : '—'}</td>
                    <td data-l="Km/L">{s.kk && s.litros ? (s.km / s.litros).toFixed(1) : '—'}</td>
                    <td data-l="Mantenimiento">{mant ? money(mant) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">Agrega camionetas en la pestaña Flota.</div>}
      </section>

      <div className="two-col">
        <section className="glass card">
          <div className="card-head"><h2>Por empleado</h2></div>
          {R.empRows.length ? (
            <ul className="rank">
              {R.empRows.map(({ e, s }) => (
                <li key={e ? e.id : 'na'}>
                  <EmpAvatar emp={e} size="sm2" />
                  <span className="rk-name"><b>{e ? e.nombre : 'Sin asignar'}</b><small>{s.dias} {s.dias === 1 ? 'día' : 'días'} · {s.camionetas.map((id) => camLabel(D, id)).join(', ') || 'sin vueltas'}</small></span>
                  <span className="rk-val"><b>{s.vueltas}</b><small>{money(s.gas)}</small></span>
                </li>
              ))}
            </ul>
          ) : <div className="empty">Agrega empleados en la pestaña Flota.</div>}
        </section>
        <section className="glass card">
          <div className="card-head"><h2>Destinos frecuentes</h2></div>
          {R.destinos.length ? (
            <ul className="rank">
              {R.destinos.map(([d, n]) => (
                <li key={d}><span className="rk-name"><b>{d}</b></span><span className="rk-val"><b>{n}</b><small>{n === 1 ? 'vuelta' : 'vueltas'}</small></span></li>
              ))}
            </ul>
          ) : <div className="empty">Aparecen cuando las vueltas llevan destino.</div>}
        </section>
      </div>
    </>
  );
}
