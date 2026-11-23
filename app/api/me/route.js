import { getUser } from '@/lib/auth';
import { json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return json({ user: await getUser() });
  } catch {
    return json({ user: null });
  }
}
