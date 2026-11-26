import { db } from '@/lib/db';
import { handler, json, body, idParam } from '@/lib/http';
import { leerMant } from '@/lib/mant';

export const PATCH = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const m = leerMant(await body(req));
  const sql = await db();
  const r = await sql`UPDATE mantenimientos SET camioneta_id = ${m.camioneta}, fecha = ${m.fecha}, tipo = ${m.tipo},
      descripcion = ${m.descripcion}, costo = ${m.costo}, km = ${m.km}, estado = ${m.estado},
      proximo_fecha = ${m.proximoFecha}, proximo_km = ${m.proximoKm}, editado_por = ${u.usuario}
    WHERE id = ${id} RETURNING id`;
  if (!r.length) return json({ error: 'Ese mantenimiento ya no existe.' }, 404);
  return json({ ok: true });
});

export const DELETE = handler(['admin'], async (req, u, ctx) => {
  const id = await idParam(ctx);
  const sql = await db();
  await sql`DELETE FROM mantenimientos WHERE id = ${id}`;
  return json({ ok: true });
});
