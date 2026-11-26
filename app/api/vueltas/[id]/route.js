import { db } from '@/lib/db';
import { handler, json, body, fecha, hora, entero, entOpc, texto, idParam } from '@/lib/http';

// Solo administración edita o borra.
export const PATCH = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const b = await body(req);
  const sql = await db();
  const r = await sql`UPDATE vueltas SET fecha = ${fecha(b.fecha)}, hora = ${hora(b.hora)},
      camioneta_id = ${entero(b.camioneta, 'Elige una camioneta.')}, empleado_id = ${entOpc(b.empleado)},
      destino = ${texto(b.destino, 120)}, editado_por = ${u.usuario}
    WHERE id = ${id} RETURNING id`;
  if (!r.length) return json({ error: 'Ese registro ya no existe.' }, 404);
  return json({ ok: true });
});

export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql`DELETE FROM vueltas WHERE id = ${id}`;
  return json({ ok: true });
});
