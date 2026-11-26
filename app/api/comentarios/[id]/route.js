import { db } from '@/lib/db';
import { handler, json, idParam } from '@/lib/http';

export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql`DELETE FROM mant_comentarios WHERE id = ${id}`;
  return json({ ok: true });
});
