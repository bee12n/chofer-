import { db } from '@/lib/db';
import { handler, json, body } from '@/lib/http';
import { leerMant } from '@/lib/mant';

export const POST = handler(['admin'], async (req, u) => {
  const m = leerMant(await body(req));
  const sql = await db();
  const [r] = await sql`INSERT INTO mantenimientos
      (camioneta_id, fecha, tipo, descripcion, costo, km, estado, proximo_fecha, proximo_km, creado_por)
    VALUES (${m.camioneta}, ${m.fecha}, ${m.tipo}, ${m.descripcion}, ${m.costo}, ${m.km}, ${m.estado},
      ${m.proximoFecha}, ${m.proximoKm}, ${u.usuario}) RETURNING id`;
  return json({ id: r.id });
});
