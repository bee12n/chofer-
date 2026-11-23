import { db } from '@/lib/db';
import { handler, json, body, fecha, entero, camActiva, hoyMX, Bad } from '@/lib/http';

export const PUT = handler(null, async (req, u) => {
  const b = await body(req);
  const sql = await db();
  const f = u.rol === 'chofer' ? hoyMX() : fecha(b.fecha);
  const cam = entero(b.camioneta, 'Elige una camioneta.');
  const km = entero(b.km, 'Escribe los kilómetros del medidor.');
  await camActiva(sql, cam);
  const [prev] = await sql`SELECT km FROM medidor WHERE camioneta_id = ${cam} AND fecha < ${f} ORDER BY fecha DESC LIMIT 1`;
  if (prev && km < prev.km) throw new Bad(`La lectura no puede ser menor que la anterior (${prev.km} km).`);
  await sql`INSERT INTO medidor (fecha, camioneta_id, km, creado_por) VALUES (${f}, ${cam}, ${km}, ${u.usuario})
    ON CONFLICT (fecha, camioneta_id) DO UPDATE SET km = EXCLUDED.km, editado_por = ${u.usuario}`;
  return json({ ok: true });
});

export const DELETE = handler(['admin'], async (req) => {
  const p = new URL(req.url).searchParams;
  const sql = await db();
  await sql`DELETE FROM medidor WHERE fecha = ${fecha(p.get('fecha'))} AND camioneta_id = ${entero(p.get('camioneta'))}`;
  return json({ ok: true });
});
