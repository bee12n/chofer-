import { checkPassword, makeToken, publicUser, COOKIE, cookieOptions } from '@/lib/auth';
import { json, serverError } from '@/lib/http';

export async function POST(req) {
  try {
    const b = await req.json().catch(() => ({}));
    const u = String(b.usuario || '').toLowerCase();
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
