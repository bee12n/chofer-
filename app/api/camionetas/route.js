import { db } from '@/lib/db';
import { handler, json, body, texto, Bad } from '@/lib/http';

export const POST = handler(['admin'], async (req) => {
  const b = await body(req);
  const nombre = texto(b.nombre, 40);
  if (!nombre) throw new Bad('Escribe el nombre de la camioneta.');
  const sql = await db();
  const [r] = await sql`INSERT INTO camionetas (nombre, placas) VALUES (${nombre}, ${texto(b.placas, 15).toUpperCase()}) RETURNING id`;
  return json({ id: r.id });
});
