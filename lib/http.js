import { NextResponse } from 'next/server';
import { getUser } from './auth';

export class Bad extends Error {}
export const json = (d, status = 200) => NextResponse.json(d, { status });

export function serverError(e) {
  console.error(e);
  const m = String(e?.message || '');
  if (m.includes('DATABASE_URL')) return json({ error: 'Falta conectar la base de datos en Vercel.' }, 500);
  if (m.includes('SESSION_SECRET')) return json({ error: 'Falta configurar SESSION_SECRET en Vercel.' }, 500);
  return json({ error: 'Error del servidor. Intenta otra vez.' }, 500);
}

export function handler(roles, fn) {
  return async (req, ctx) => {
    try {
      const u = await getUser();
      if (!u) return json({ error: 'Tu sesión terminó. Vuelve a entrar.' }, 401);
      if (roles && !roles.includes(u.rol)) return json({ error: 'Tu perfil no puede hacer esto.' }, 403);
      return await fn(req, u, ctx);
    } catch (e) {
      if (e instanceof Bad) return json({ error: e.message }, 400);
      return serverError(e);
    }
  };
}

export const hoyMX = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const horaMX = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());

export async function body(req) {
  try { return await req.json(); } catch { throw new Bad('Datos inválidos.'); }
}
export function fecha(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) throw new Bad('Fecha inválida.');
  return v;
}
export function hora(v) {
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Bad('Hora inválida.');
  return v;
}
export function entero(v, msg = 'Número inválido.') {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 2147483647) throw new Bad(msg);
  return n;
}
export function texto(v, max) {
  return String(v ?? '').trim().slice(0, max);
}
export function dinero(v) {
  const n = Number(v);
  if (!(n > 0) || n > 1e7) throw new Bad('Escribe un monto válido.');
  return Math.round(n * 100) / 100;
}
export function litrosOpc(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!(n >= 0) || n > 10000) throw new Bad('Litros inválidos.');
  return n > 0 ? Math.round(n * 100) / 100 : null;
}
export function entOpc(v, msg) {
  if (v === null || v === undefined || v === '' || v === 0 || v === '0') return null;
  return entero(v, msg);
}
export function fechaOpc(v) {
  return v ? fecha(v) : null;
}
export function numOpc(v, max = 1e9) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!(n >= 0) || n > max) throw new Bad('Número inválido.');
  return Math.round(n * 100) / 100;
}
export function idList(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => entero(x)))].slice(0, 200);
}
export async function empActivo(sql, id) {
  if (id == null) return;
  const r = await sql`SELECT 1 FROM empleados WHERE id = ${id} AND activo`;
  if (!r.length) throw new Bad('Ese empleado no existe.');
}
export async function camActiva(sql, id) {
  const r = await sql`SELECT 1 FROM camionetas WHERE id = ${id} AND activa`;
  if (!r.length) throw new Bad('Esa camioneta no existe.');
}
export async function idParam(ctx) {
  const { id } = await ctx.params;
  return entero(id, 'Registro inválido.');
}
