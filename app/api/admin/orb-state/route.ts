import { NextRequest, NextResponse } from 'next/server';
import { readOrbStates } from '@/lib/orb-introspection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const authorization = request.headers.get('authorization');

  if (!adminToken) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_ACCESS_TOKEN. Configure the environment before reading ORB state.' },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const orbs = await readOrbStates();
  return NextResponse.json({
    schema_version: 'orb-state.v1',
    generated_at: new Date().toISOString(),
    count: orbs.length,
    orbs,
  });
}
