import { db } from '@/lib/db';
import { handler, json, body, fecha, hora, entero, entOpc, idParam } from '@/lib/http';
import { revisarKm } from '@/lib/lecturas';

// Solo administración corrige o borra lecturas.
export const PATCH = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const b = await body(req);
  const sql = await db();
  const [actual] = await sql`SELECT camioneta_id FROM lecturas WHERE id = ${id}`;
  if (!actual) return json({ error: 'Esa lectura ya no existe.' }, 404);
  const f = fecha(b.fecha);
  const km = entero(b.km, 'Escribe los kilómetros del medidor.');
  await revisarKm(sql, { cam: actual.camioneta_id, f, km, mismoDia: false, excluir: id });
  await sql`UPDATE lecturas SET fecha = ${f}, hora = ${hora(b.hora)}, km = ${km}, empleado_id = ${entOpc(b.empleado)},
    editado_por = ${u.usuario} WHERE id = ${id}`;
  return json({ ok: true });
});

export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql`DELETE FROM lecturas WHERE id = ${id}`;
  return json({ ok: true });
});
