import { db } from '@/lib/db';
import { handler, json, body, fecha, hora, entero, entOpc, camActiva, empActivo, hoyMX, horaMX, Bad } from '@/lib/http';
import { revisarKm } from '@/lib/lecturas';

// Agrega una lectura del medidor. Puede haber varias por día: una por cada viaje.
export const POST = handler(null, async (req, u) => {
  const b = await body(req);
  const sql = await db();
  const chofer = u.rol === 'chofer';
  const f = chofer ? hoyMX() : fecha(b.fecha);
  const h = chofer ? horaMX() : hora(b.hora);
  const cam = entero(b.camioneta, 'Elige una camioneta.');
  const km = entero(b.km, 'Escribe los kilómetros del medidor.');
  const emp = chofer ? u.empleado : entOpc(b.empleado);
  await camActiva(sql, cam);
  await empActivo(sql, emp);
  await revisarKm(sql, { cam, f, km, mismoDia: chofer });
  const [r] = await sql`INSERT INTO lecturas (fecha, hora, camioneta_id, km, empleado_id, creado_por)
    VALUES (${f}, ${h}, ${cam}, ${km}, ${emp}, ${u.usuario}) RETURNING id`;
  return json({ id: r.id });
});

export const PUT = POST;
