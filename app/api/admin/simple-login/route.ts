import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const adminToken = String(process.env.ADMIN_ACCESS_TOKEN || '').trim();

  if (!adminToken) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_ACCESS_TOKEN.' },
      { status: 503 },
    );
  }

  const legacyToken = String(body?.legacy_token || '').trim();
  if (legacyToken) {
    if (!safeEqual(legacyToken, adminToken)) {
      return NextResponse.json({ error: 'Invalid admin token.' }, { status: 401 });
    }

    return NextResponse.json({ status: 'success', token: adminToken, mode: 'legacy' });
  }

  const expectedUsername = String(process.env.SPRUKED_ADMIN_USERNAME || 'admin').trim();
  const expectedPassword = String(
    process.env.SPRUKED_ADMIN_PASSWORD || process.env.ADMIN_ACCESS_TOKEN || '',
  );

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');

  if (!expectedPassword) {
    return NextResponse.json(
      { error: 'Server is missing SPRUKED_ADMIN_PASSWORD and ADMIN_ACCESS_TOKEN.' },
      { status: 503 },
    );
  }

  if (!safeEqual(username, expectedUsername) || !safeEqual(password, expectedPassword)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  // Transitional bridge: the current admin dashboard already authorizes its
  // API calls with ADMIN_ACCESS_TOKEN. Return it only after credentials are
  // verified so the existing dashboard can remain unchanged and reversible.
  return NextResponse.json({ status: 'success', token: adminToken, mode: 'simple' });
}
