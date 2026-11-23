import { db } from '@/lib/db';
import { handler, json, body, fecha, hora, entero, texto, idParam } from '@/lib/http';

export const PATCH = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const b = await body(req);
  const sql = await db();
  const r = await sql`UPDATE vueltas SET fecha = ${fecha(b.fecha)}, hora = ${hora(b.hora)},
      camioneta_id = ${entero(b.camioneta, 'Elige una camioneta.')}, destino = ${texto(b.destino, 120)},
      editado_por = ${u.usuario}
    WHERE id = ${id} RETURNING id`;
  if (!r.length) return json({ error: 'Ese registro ya no existe.' }, 404);
  return json({ ok: true });
});

// El chofer solo puede deshacer su propia vuelta durante los primeros 10 minutos.
export const DELETE = handler(null, async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  const r = u.rol === 'admin'
    ? await sql`DELETE FROM vueltas WHERE id = ${id} RETURNING id`
    : await sql`DELETE FROM vueltas WHERE id = ${id} AND creado_por = ${u.usuario}
                AND creado > now() - interval '10 minutes' RETURNING id`;
  if (!r.length) {
    return json({ error: u.rol === 'admin' ? 'Ese registro ya no existe.' : 'Ya no se puede deshacer. Avísale a Ana o a Ximena.' }, 403);
  }
  return json({ ok: true });
});
