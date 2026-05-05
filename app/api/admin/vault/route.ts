import { NextRequest, NextResponse } from 'next/server';
import { addEntry, deleteEntry, readVault, upsertCategory } from '@/lib/admin-vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifyAdmin(request: NextRequest): NextResponse | null {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const authorization = request.headers.get('authorization');

  if (!adminToken) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_ACCESS_TOKEN. Configure the environment before using the admin vault.' },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const vault = await readVault();
  return NextResponse.json(vault);
}

type VaultAction = 'upsert-category' | 'add-entry' | 'delete-entry';

export async function POST(request: NextRequest) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const action = String(payload?.action || '') as VaultAction;

  try {
    if (action === 'upsert-category') {
      const data = await upsertCategory({
        key: payload?.key,
        label: String(payload?.label || ''),
        description: payload?.description,
      });
      return NextResponse.json({ status: 'ok', action, data });
    }

    if (action === 'add-entry') {
      const tags = Array.isArray(payload?.tags) ? payload.tags : [];
      const data = await addEntry({
        category_key: String(payload?.category_key || ''),
        title: String(payload?.title || ''),
        body: String(payload?.body || ''),
        tags: tags.map((tag: unknown) => String(tag)),
      });
      return NextResponse.json({ status: 'ok', action, data });
    }

    if (action === 'delete-entry') {
      const data = await deleteEntry({
        category_key: String(payload?.category_key || ''),
        entry_id: String(payload?.entry_id || ''),
      });
      return NextResponse.json({ status: 'ok', action, data });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
