import crypto from 'crypto';
import { cookies } from 'next/headers';

// El perfil de chofer es abierto: entra sin contraseña y solo puede registrar lo del día.
export const USERS = {
  ximena: { nombre: 'Ximena', rol: 'admin', env: 'PASS_XIMENA' },
  ana: { nombre: 'Ana', rol: 'admin', env: 'PASS_ANA' },
  chofer: { nombre: 'Chofer', rol: 'chofer', abierto: true },
};
export const COOKIE = 'bc_session';
const MAX_AGE = 30 * 24 * 60 * 60;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Falta configurar SESSION_SECRET');
  return s;
}
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();

export function publicUser(u) {
  return { usuario: u, nombre: USERS[u].nombre, rol: USERS[u].rol };
}
export function makeToken(u) {
  const p = Buffer.from(JSON.stringify({ u, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${p}.${sign(p)}`;
}
export function readToken(t) {
  if (!t) return null;
  const [p, s] = t.split('.');
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (d.exp < Date.now() || !USERS[d.u]) return null;
    return publicUser(d.u);
  } catch {
    return null;
  }
}
export async function getUser() {
  const c = await cookies();
  return readToken(c.get(COOKIE)?.value);
}
export function checkPassword(u, pw) {
  const user = USERS[u];
  if (!user) return false;
  if (user.abierto) return true;
  const real = process.env[user.env];
  if (!real) return false;
  return crypto.timingSafeEqual(hash(pw), hash(real));
}
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE,
};
