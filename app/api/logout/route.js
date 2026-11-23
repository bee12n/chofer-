import { COOKIE, cookieOptions } from '@/lib/auth';
import { json } from '@/lib/http';

export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return res;
}
