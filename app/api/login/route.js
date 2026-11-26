import { checkPassword, makeToken, publicUser, choferUser, COOKIE, cookieOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { json, serverError } from '@/lib/http';

export async function POST(req) {
  try {
    const b = await req.json().catch(() => ({}));
    const u = String(b.usuario || '').toLowerCase();

    // Chofer: entra sin contraseña eligiendo su nombre de la lista de empleados activos
    if (u === 'chofer') {
      const id = Number(b.empleado);
      if (!Number.isInteger(id) || id <= 0) return json({ error: 'Elige tu nombre.' }, 400);
      const sql = await db();
      const [e] = await sql`SELECT id, nombre FROM empleados WHERE id = ${id} AND activo`;
      if (!e) return json({ error: 'Ese chofer ya no está activo. Pide ayuda a Ana o a Ximena.' }, 404);
      const res = json({ user: choferUser(e.id, e.nombre) });
      res.cookies.set(COOKIE, makeToken('chofer', { e: e.id, n: e.nombre }), cookieOptions);
      return res;
    }

    if (!checkPassword(u, String(b.password || ''))) {
      await new Promise((r) => setTimeout(r, 700));
      return json({ error: 'Contraseña incorrecta.' }, 401);
    }
    const res = json({ user: publicUser(u) });
    res.cookies.set(COOKIE, makeToken(u), cookieOptions);
    return res;
  } catch (e) {
    return serverError(e);
  }
}
