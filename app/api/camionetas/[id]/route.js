import { db } from '@/lib/db';
import { handler, json, body, texto, idList, idParam, Bad } from '@/lib/http';

export const PATCH = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const b = await body(req);
  const nombre = texto(b.nombre, 40);
  if (!nombre) throw new Bad('Escribe el nombre de la camioneta.');
  const emps = idList(b.empleados);
  const sql = await db();
  await sql.transaction([
    sql`UPDATE camionetas SET nombre = ${nombre}, placas = ${texto(b.placas, 15).toUpperCase()} WHERE id = ${id}`,
    sql`DELETE FROM camioneta_empleados WHERE camioneta_id = ${id}`,
    sql`INSERT INTO camioneta_empleados (camioneta_id, empleado_id)
      SELECT ${id}, e.id FROM empleados e WHERE e.activo AND e.id = ANY(${emps}) ON CONFLICT DO NOTHING`,
  ]);
  return json({ ok: true });
});

// Se desactiva en lugar de borrarse para conservar el historial.
export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql.transaction([
    sql`UPDATE camionetas SET activa = FALSE WHERE id = ${id}`,
    sql`DELETE FROM camioneta_empleados WHERE camioneta_id = ${id}`,
  ]);
  return json({ ok: true });
});
