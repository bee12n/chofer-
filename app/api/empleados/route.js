import { db } from '@/lib/db';
import { handler, json, body, texto, idList, Bad } from '@/lib/http';

export const POST = handler(['admin'], async (req) => {
  const b = await body(req);
  const nombre = texto(b.nombre, 50);
  if (!nombre) throw new Bad('Escribe el nombre del empleado.');
  const sql = await db();
  const [r] = await sql`INSERT INTO empleados (nombre, telefono) VALUES (${nombre}, ${texto(b.telefono, 20)}) RETURNING id`;
  const cams = idList(b.camionetas);
  if (cams.length) {
    await sql`INSERT INTO camioneta_empleados (camioneta_id, empleado_id)
      SELECT id, ${r.id} FROM camionetas WHERE activa AND id = ANY(${cams}) ON CONFLICT DO NOTHING`;
  }
  return json({ id: r.id });
});
