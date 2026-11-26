import { db } from '@/lib/db';
import { handler, json, body, texto, idParam, Bad } from '@/lib/http';

export const POST = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const t = texto((await body(req)).texto, 1000);
  if (!t) throw new Bad('Escribe un comentario.');
  const sql = await db();
  const r = await sql`INSERT INTO mant_comentarios (mantenimiento_id, autor, texto)
    SELECT id, ${u.usuario}, ${t} FROM mantenimientos WHERE id = ${id} RETURNING id`;
  if (!r.length) return json({ error: 'Ese mantenimiento ya no existe.' }, 404);
  return json({ id: r[0].id });
});
