import { db } from '@/lib/db';
import { handler, json, body, fecha, hora, entero, texto, camActiva, hoyMX } from '@/lib/http';

export const POST = handler(null, async (req, u) => {
  const b = await body(req);
  const sql = await db();
  const f = u.rol === 'chofer' ? hoyMX() : fecha(b.fecha);
  const cam = entero(b.camioneta, 'Elige una camioneta.');
  await camActiva(sql, cam);
  const [r] = await sql`INSERT INTO vueltas (fecha, hora, camioneta_id, destino, creado_por)
    VALUES (${f}, ${hora(b.hora)}, ${cam}, ${texto(b.destino, 120)}, ${u.usuario}) RETURNING id`;
  return json({ id: r.id });
});
