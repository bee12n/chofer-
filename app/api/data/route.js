import { db } from '@/lib/db';
import { handler, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handler(null, async () => {
  const sql = await db();
  const [camionetas, vueltas, gasolina, medidor] = await Promise.all([
    sql`SELECT id, nombre, placas, activa FROM camionetas ORDER BY id`,
    sql`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, camioneta_id AS camioneta, destino,
               creado_por AS "creadoPor", (extract(epoch FROM creado) * 1000)::float8 AS creado
        FROM vueltas WHERE fecha >= current_date - 400 ORDER BY fecha, hora, id`,
    sql`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, camioneta_id AS camioneta, monto::float8 AS monto,
               litros::float8 AS litros, creado_por AS "creadoPor", (extract(epoch FROM creado) * 1000)::float8 AS creado
        FROM gasolina WHERE fecha >= current_date - 400 ORDER BY fecha, hora, id`,
    sql`SELECT to_char(fecha, 'YYYY-MM-DD') || '_' || camioneta_id AS id, to_char(fecha, 'YYYY-MM-DD') AS fecha,
               camioneta_id AS camioneta, km, creado_por AS "creadoPor"
        FROM medidor ORDER BY fecha`,
  ]);
  return json({ camionetas, vueltas, gasolina, medidor });
});
