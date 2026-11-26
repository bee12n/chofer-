import { db } from '@/lib/db';
import { handler, json, hoyMX } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Administración recibe todo; el chofer solo lo que necesita para registrar el día.
export const GET = handler(null, async (req, u) => {
  const sql = await db();
  const admin = u.rol === 'admin';
  const hoy = hoyMX();

  const camionetas = sql`SELECT c.id, c.nombre, c.placas, c.activa,
      COALESCE(array_agg(ce.empleado_id) FILTER (WHERE ce.empleado_id IS NOT NULL), '{}') AS empleados
    FROM camionetas c LEFT JOIN camioneta_empleados ce ON ce.camioneta_id = c.id
    GROUP BY c.id ORDER BY c.id`;
  const yo = admin ? null : u.empleado;
  const empleados = admin
    ? sql`SELECT id, nombre, telefono, activo FROM empleados ORDER BY nombre`
    : sql`SELECT id, nombre, activo FROM empleados WHERE id = ${yo}`;
  const vueltas = admin
    ? sql`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, camioneta_id AS camioneta, empleado_id AS empleado, destino,
             creado_por AS "creadoPor", (extract(epoch FROM creado) * 1000)::float8 AS creado
          FROM vueltas WHERE fecha >= current_date - 400 ORDER BY fecha, hora, id`
    : sql`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, camioneta_id AS camioneta, empleado_id AS empleado, destino,
             (extract(epoch FROM creado) * 1000)::float8 AS creado
          FROM vueltas WHERE fecha = ${hoy} AND empleado_id = ${yo} ORDER BY hora, id`;
  const gasolina = admin
    ? sql`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, camioneta_id AS camioneta, empleado_id AS empleado,
             monto::float8 AS monto, litros::float8 AS litros, creado_por AS "creadoPor",
             (extract(epoch FROM creado) * 1000)::float8 AS creado
          FROM gasolina WHERE fecha >= current_date - 400 ORDER BY fecha, hora, id`
    : sql`SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, camioneta_id AS camioneta, empleado_id AS empleado,
             monto::float8 AS monto, litros::float8 AS litros, (extract(epoch FROM creado) * 1000)::float8 AS creado
          FROM gasolina WHERE fecha = ${hoy} AND empleado_id = ${yo} ORDER BY hora, id`;
  const medidor = sql`SELECT to_char(fecha, 'YYYY-MM-DD') || '_' || camioneta_id AS id, to_char(fecha, 'YYYY-MM-DD') AS fecha,
      camioneta_id AS camioneta, km, empleado_id AS empleado
    FROM medidor ORDER BY fecha`;

  const base = await Promise.all([camionetas, empleados, vueltas, gasolina, medidor]);
  const out = { hoy, camionetas: base[0], empleados: base[1], vueltas: base[2], gasolina: base[3], medidor: base[4] };

  if (admin) {
    const [mantenimientos, comentarios] = await Promise.all([
      sql`SELECT id, camioneta_id AS camioneta, to_char(fecha, 'YYYY-MM-DD') AS fecha, tipo, descripcion,
             costo::float8 AS costo, km, estado, to_char(proximo_fecha, 'YYYY-MM-DD') AS "proximoFecha", proximo_km AS "proximoKm",
             creado_por AS "creadoPor", (extract(epoch FROM creado) * 1000)::float8 AS creado
          FROM mantenimientos ORDER BY fecha DESC, id DESC`,
      sql`SELECT id, mantenimiento_id AS mantenimiento, autor, texto, (extract(epoch FROM creado) * 1000)::float8 AS creado
          FROM mant_comentarios ORDER BY creado`,
    ]);
    out.mantenimientos = mantenimientos;
    out.comentarios = comentarios;
  }
  return json(out);
});
