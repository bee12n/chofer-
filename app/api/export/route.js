import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { handler, fecha, Bad } from '@/lib/http';
import { USERS } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MONEY = '"$"#,##0.00';
const quien = (u) => USERS[u]?.nombre || u || '';

function hoja(wb, nombre, columnas, filas) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columnas.map((c) => ({ header: c.h, key: c.k, width: c.w || 14, style: c.money ? { numFmt: MONEY } : {} }));
  filas.forEach((f) => ws.addRow(f));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D63E6' } };
  head.alignment = { vertical: 'middle' };
  head.height = 22;
  if (filas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  return ws;
}

export const GET = handler(['admin'], async (req) => {
  const p = new URL(req.url).searchParams;
  const desde = fecha(p.get('desde'));
  const hasta = fecha(p.get('hasta'));
  if (desde > hasta) throw new Bad('La fecha inicial debe ser antes que la final.');
  const sql = await db();

  const [vueltas, gasolina, medidor, mants] = await Promise.all([
    sql`SELECT to_char(v.fecha, 'YYYY-MM-DD') AS fecha, v.hora, c.nombre AS camioneta, c.placas, e.nombre AS empleado,
           v.destino, v.creado_por
        FROM vueltas v JOIN camionetas c ON c.id = v.camioneta_id LEFT JOIN empleados e ON e.id = v.empleado_id
        WHERE v.fecha BETWEEN ${desde} AND ${hasta} ORDER BY v.fecha, v.hora, v.id`,
    sql`SELECT to_char(g.fecha, 'YYYY-MM-DD') AS fecha, g.hora, c.nombre AS camioneta, e.nombre AS empleado,
           g.monto::float8 AS monto, g.litros::float8 AS litros, g.creado_por
        FROM gasolina g JOIN camionetas c ON c.id = g.camioneta_id LEFT JOIN empleados e ON e.id = g.empleado_id
        WHERE g.fecha BETWEEN ${desde} AND ${hasta} ORDER BY g.fecha, g.hora, g.id`,
    sql`SELECT * FROM (
          SELECT m.fecha AS f, to_char(m.fecha, 'YYYY-MM-DD') AS fecha, c.nombre AS camioneta, m.km,
                 m.km - LAG(m.km) OVER (PARTITION BY m.camioneta_id ORDER BY m.fecha) AS recorrido, e.nombre AS empleado
          FROM medidor m JOIN camionetas c ON c.id = m.camioneta_id LEFT JOIN empleados e ON e.id = m.empleado_id) x
        WHERE f BETWEEN ${desde} AND ${hasta} ORDER BY f, camioneta`,
    sql`SELECT to_char(m.fecha, 'YYYY-MM-DD') AS fecha, c.nombre AS camioneta, m.tipo, m.descripcion, m.costo::float8 AS costo,
           m.km, m.estado, m.proximo_km, to_char(m.proximo_fecha, 'YYYY-MM-DD') AS proximo_fecha,
           COALESCE((SELECT string_agg(mc.autor || ': ' || mc.texto, ' | ' ORDER BY mc.creado)
                     FROM mant_comentarios mc WHERE mc.mantenimiento_id = m.id), '') AS comentarios
        FROM mantenimientos m JOIN camionetas c ON c.id = m.camioneta_id
        WHERE m.fecha BETWEEN ${desde} AND ${hasta} ORDER BY m.fecha, m.id`,
  ]);

  // Resúmenes por camioneta y por empleado
  const porCam = new Map();
  const cam = (n) => { if (!porCam.has(n)) porCam.set(n, { camioneta: n, vueltas: 0, gasolina: 0, litros: 0, km: 0, mant: 0 }); return porCam.get(n); };
  vueltas.forEach((v) => { cam(v.camioneta).vueltas++; });
  gasolina.forEach((g) => { const c = cam(g.camioneta); c.gasolina += g.monto; c.litros += g.litros || 0; });
  medidor.forEach((m) => { if (m.recorrido != null) cam(m.camioneta).km += Number(m.recorrido); });
  mants.forEach((m) => { cam(m.camioneta).mant += m.costo || 0; });

  const porEmp = new Map();
  const emp = (n) => { const k = n || 'Sin asignar'; if (!porEmp.has(k)) porEmp.set(k, { empleado: k, vueltas: 0, gasolina: 0, dias: new Set(), cams: new Set() }); return porEmp.get(k); };
  vueltas.forEach((v) => { const e = emp(v.empleado); e.vueltas++; e.dias.add(v.fecha); e.cams.add(v.camioneta); });
  gasolina.forEach((g) => { emp(g.empleado).gasolina += g.monto; });

  const tot = [...porCam.values()].reduce((a, c) => ({ vueltas: a.vueltas + c.vueltas, gasolina: a.gasolina + c.gasolina, litros: a.litros + c.litros, km: a.km + c.km, mant: a.mant + c.mant }), { vueltas: 0, gasolina: 0, litros: 0, km: 0, mant: 0 });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bitácora del Chofer';
  wb.created = new Date();

  const rs = wb.addWorksheet('Resumen');
  rs.columns = [{ width: 26 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 }];
  rs.addRow(['Bitácora del Chofer']).font = { bold: true, size: 16 };
  rs.addRow([`Periodo: ${desde} a ${hasta}`]).font = { color: { argb: 'FF4A5F78' } };
  rs.addRow([]);
  const kpis = [
    ['Vueltas', tot.vueltas],
    ['Gasolina', tot.gasolina, MONEY],
    ['Litros', Math.round(tot.litros * 100) / 100],
    ['Km recorridos', tot.km],
    ['Km por litro', tot.litros ? Math.round((tot.km / tot.litros) * 10) / 10 : '—'],
    ['Gasolina por km', tot.km ? Math.round((tot.gasolina / tot.km) * 100) / 100 : '—', MONEY],
    ['Mantenimiento', tot.mant, MONEY],
  ];
  kpis.forEach(([k, v, fmt]) => { const r = rs.addRow([k, v]); r.getCell(1).font = { bold: true }; if (fmt && typeof v === 'number') r.getCell(2).numFmt = fmt; });
  rs.addRow([]);
  const h1 = rs.addRow(['Por camioneta', 'Vueltas', 'Gasolina', 'Litros', 'Km', 'Km/L', 'Mantenimiento']);
  [h1].forEach((r) => { r.font = { bold: true, color: { argb: 'FFFFFFFF' } }; r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C9A70' } }; });
  [...porCam.values()].forEach((c) => {
    const r = rs.addRow([c.camioneta, c.vueltas, c.gasolina, Math.round(c.litros * 100) / 100, c.km, c.litros ? Math.round((c.km / c.litros) * 10) / 10 : '—', c.mant]);
    r.getCell(3).numFmt = MONEY; r.getCell(7).numFmt = MONEY;
  });
  rs.addRow([]);
  const h2 = rs.addRow(['Por empleado', 'Vueltas', 'Gasolina', 'Días trabajados', 'Camionetas']);
  h2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C9A70' } };
  [...porEmp.values()].forEach((e) => {
    const r = rs.addRow([e.empleado, e.vueltas, e.gasolina, e.dias.size, [...e.cams].join(', ')]);
    r.getCell(3).numFmt = MONEY;
  });

  hoja(wb, 'Vueltas', [
    { h: 'Fecha', k: 'fecha', w: 12 }, { h: 'Hora', k: 'hora', w: 8 }, { h: 'Camioneta', k: 'camioneta', w: 20 },
    { h: 'Placas', k: 'placas', w: 12 }, { h: 'Empleado', k: 'empleado', w: 20 }, { h: 'Destino / nota', k: 'destino', w: 40 },
    { h: 'Registró', k: 'registro', w: 12 },
  ], vueltas.map((v) => ({ ...v, empleado: v.empleado || '', registro: quien(v.creado_por) })));

  hoja(wb, 'Gasolina', [
    { h: 'Fecha', k: 'fecha', w: 12 }, { h: 'Hora', k: 'hora', w: 8 }, { h: 'Camioneta', k: 'camioneta', w: 20 },
    { h: 'Empleado', k: 'empleado', w: 20 }, { h: 'Monto', k: 'monto', w: 14, money: true }, { h: 'Litros', k: 'litros', w: 10 },
    { h: 'Precio por litro', k: 'ppl', w: 16, money: true }, { h: 'Registró', k: 'registro', w: 12 },
  ], gasolina.map((g) => ({ ...g, empleado: g.empleado || '', litros: g.litros ?? '', ppl: g.litros ? Math.round((g.monto / g.litros) * 100) / 100 : '', registro: quien(g.creado_por) })));

  hoja(wb, 'Medidor', [
    { h: 'Fecha', k: 'fecha', w: 12 }, { h: 'Camioneta', k: 'camioneta', w: 20 }, { h: 'Km en tablero', k: 'km', w: 14 },
    { h: 'Km recorridos', k: 'recorrido', w: 14 }, { h: 'Registró (empleado)', k: 'empleado', w: 20 },
  ], medidor.map((m) => ({ fecha: m.fecha, camioneta: m.camioneta, km: m.km, recorrido: m.recorrido ?? '', empleado: m.empleado || '' })));

  hoja(wb, 'Mantenimientos', [
    { h: 'Fecha', k: 'fecha', w: 12 }, { h: 'Camioneta', k: 'camioneta', w: 20 }, { h: 'Tipo', k: 'tipo', w: 18 },
    { h: 'Descripción', k: 'descripcion', w: 40 }, { h: 'Costo', k: 'costo', w: 14, money: true }, { h: 'Km', k: 'km', w: 10 },
    { h: 'Estado', k: 'estado', w: 12 }, { h: 'Próximo km', k: 'proximo_km', w: 12 }, { h: 'Próxima fecha', k: 'proximo_fecha', w: 14 },
    { h: 'Comentarios', k: 'comentarios', w: 60 },
  ], mants.map((m) => ({ ...m, costo: m.costo ?? '', km: m.km ?? '', estado: m.estado === 'hecho' ? 'Hecho' : 'Pendiente', proximo_km: m.proximo_km ?? '', proximo_fecha: m.proximo_fecha || '', comentarios: m.comentarios.replace(/(^|\| )(ximena|ana):/g, (s, a, u) => `${a}${quien(u)}:`) })));

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bitacora_${desde}_a_${hasta}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
});
