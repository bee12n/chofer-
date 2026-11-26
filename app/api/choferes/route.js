import { db } from '@/lib/db';
import { json, serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Lista pública para la pantalla de entrada: solo nombres y la camioneta que usan.
export async function GET() {
  try {
    const sql = await db();
    const choferes = await sql`SELECT e.id, e.nombre,
        COALESCE(array_agg(c.nombre ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL), '{}') AS camionetas
      FROM empleados e
      LEFT JOIN camioneta_empleados ce ON ce.empleado_id = e.id
      LEFT JOIN camionetas c ON c.id = ce.camioneta_id AND c.activa
      WHERE e.activo
      GROUP BY e.id ORDER BY e.nombre`;
    return json({ choferes });
  } catch (e) {
    return serverError(e);
  }
}
