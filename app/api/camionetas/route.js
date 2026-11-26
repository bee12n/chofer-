import { db } from '@/lib/db';
import { handler, json, body, texto, idList, Bad } from '@/lib/http';

export const POST = handler(['admin'], async (req) => {
  const b = await body(req);
  const nombre = texto(b.nombre, 40);
  if (!nombre) throw new Bad('Escribe el nombre de la camioneta.');
  const sql = await db();
  const [r] = await sql`INSERT INTO camionetas (nombre, placas) VALUES (${nombre}, ${texto(b.placas, 15).toUpperCase()}) RETURNING id`;
  const emps = idList(b.empleados);
  if (emps.length) {
    await sql`INSERT INTO camioneta_empleados (camioneta_id, empleado_id)
      SELECT ${r.id}, id FROM empleados WHERE activo AND id = ANY(${emps}) ON CONFLICT DO NOTHING`;
  }
  return json({ id: r.id });
});
