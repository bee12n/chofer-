import { db } from '@/lib/db';
import { handler, json, body, fecha, hora, entero, entOpc, dinero, litrosOpc, camActiva, empActivo, hoyMX, Bad } from '@/lib/http';

export const POST = handler(null, async (req, u) => {
  const b = await body(req);
  const sql = await db();
  const chofer = u.rol === 'chofer';
  const f = chofer ? hoyMX() : fecha(b.fecha);
  const cam = entero(b.camioneta, 'Elige una camioneta.');
  const emp = entOpc(b.empleado, 'Elige quién maneja.');
  if (chofer && emp == null) throw new Bad('Elige quién maneja.');
  await camActiva(sql, cam);
  await empActivo(sql, emp);
  const [r] = await sql`INSERT INTO gasolina (fecha, hora, camioneta_id, empleado_id, monto, litros, creado_por)
    VALUES (${f}, ${hora(b.hora)}, ${cam}, ${emp}, ${dinero(b.monto)}, ${litrosOpc(b.litros)}, ${u.usuario}) RETURNING id`;
  return json({ id: r.id });
});
