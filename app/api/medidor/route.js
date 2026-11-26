import { db } from '@/lib/db';
import { handler, json, body, fecha, entero, entOpc, camActiva, empActivo, hoyMX, Bad } from '@/lib/http';

export const PUT = handler(null, async (req, u) => {
  const b = await body(req);
  const sql = await db();
  const chofer = u.rol === 'chofer';
  const f = chofer ? hoyMX() : fecha(b.fecha);
  const cam = entero(b.camioneta, 'Elige una camioneta.');
  const km = entero(b.km, 'Escribe los kilómetros del medidor.');
  const emp = chofer ? u.empleado : entOpc(b.empleado);
  await camActiva(sql, cam);
  await empActivo(sql, emp);
  const [prev] = await sql`SELECT km FROM medidor WHERE camioneta_id = ${cam} AND fecha < ${f} ORDER BY fecha DESC LIMIT 1`;
  if (prev && km < prev.km) throw new Bad(`La lectura no puede ser menor que la anterior (${prev.km} km).`);
  if (chofer) {
    // El chofer registra la lectura del día una sola vez; las correcciones las hace administración.
    const r = await sql`INSERT INTO medidor (fecha, camioneta_id, km, empleado_id, creado_por)
      VALUES (${f}, ${cam}, ${km}, ${emp}, ${u.usuario}) ON CONFLICT (fecha, camioneta_id) DO NOTHING RETURNING km`;
    if (!r.length) throw new Bad('El medidor de hoy ya está registrado. Si hay un error, avísale a Ana o a Ximena.');
  } else {
    await sql`INSERT INTO medidor (fecha, camioneta_id, km, empleado_id, creado_por) VALUES (${f}, ${cam}, ${km}, ${emp}, ${u.usuario})
      ON CONFLICT (fecha, camioneta_id) DO UPDATE SET km = EXCLUDED.km, editado_por = ${u.usuario}`;
  }
  return json({ ok: true });
});

export const DELETE = handler(['admin'], async (req) => {
  const p = new URL(req.url).searchParams;
  const sql = await db();
  await sql`DELETE FROM medidor WHERE fecha = ${fecha(p.get('fecha'))} AND camioneta_id = ${entero(p.get('camioneta'))}`;
  return json({ ok: true });
});
