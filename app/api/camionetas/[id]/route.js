import { db } from '@/lib/db';
import { handler, json, idParam } from '@/lib/http';

// Se desactiva en lugar de borrarse para conservar el historial.
export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql`UPDATE camionetas SET activa = FALSE WHERE id = ${id}`;
  return json({ ok: true });
});
