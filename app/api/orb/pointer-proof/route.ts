import { NextRequest, NextResponse } from 'next/server';
import { getControlledPointerTarget } from '@/lib/orb-pointer-map-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const targetId = request.nextUrl.searchParams.get('target_id') || '';
  const target = await getControlledPointerTarget(targetId);
  if (!target) {
    return NextResponse.json({ status: 'error', message: 'Authoritative pointer target was not found.' }, { status: 404 });
  }
  return NextResponse.json({
    status: 'success',
    mode: 'authoritative_pointer_target',
    source: 'spruked_Vault/knowledge/website/orb-weaver/pointer_plot_map.json',
    target,
  });
}
