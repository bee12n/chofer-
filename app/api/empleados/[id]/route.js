import { db } from '@/lib/db';
import { handler, json, body, texto, idList, idParam, Bad } from '@/lib/http';

export const PATCH = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const b = await body(req);
  const nombre = texto(b.nombre, 50);
  if (!nombre) throw new Bad('Escribe el nombre del empleado.');
  const cams = idList(b.camionetas);
  const sql = await db();
  await sql.transaction([
    sql`UPDATE empleados SET nombre = ${nombre}, telefono = ${texto(b.telefono, 20)} WHERE id = ${id}`,
    sql`DELETE FROM camioneta_empleados WHERE empleado_id = ${id}`,
    sql`INSERT INTO camioneta_empleados (camioneta_id, empleado_id)
      SELECT c.id, ${id} FROM camionetas c WHERE c.activa AND c.id = ANY(${cams}) ON CONFLICT DO NOTHING`,
  ]);
  return json({ ok: true });
});

// Se desactiva para conservar su historial de vueltas.
export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql.transaction([
    sql`UPDATE empleados SET activo = FALSE WHERE id = ${id}`,
    sql`DELETE FROM camioneta_empleados WHERE empleado_id = ${id}`,
  ]);
  return json({ ok: true });
});
