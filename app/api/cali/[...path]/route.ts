import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function targetBase() {
  return trimTrailingSlash(process.env.CALI_API_URL || 'http://127.0.0.1:8002');
}

async function proxy(request: NextRequest, method: string, segments: string[]) {
  const path = segments.join('/');
  const targetUrl = new URL(`${targetBase()}/cali/${path}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const incomingAuth = request.headers.get('authorization');
  const fallbackToken = process.env.CALI_ADMIN_TOKEN || process.env.ADMIN_ACCESS_TOKEN || '';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (incomingAuth) {
    headers.Authorization = incomingAuth;
  } else if (fallbackToken) {
    headers.Authorization = `Bearer ${fallbackToken}`;
  }

  const body = method === 'GET' ? undefined : await request.text();
  const response = await fetch(targetUrl.toString(), {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function getSegments(params: { path?: string[] }) {
  return Array.isArray(params.path) ? params.path : [];
}

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  try {
    return await proxy(request, 'GET', getSegments(params));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cali proxy GET failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  try {
    return await proxy(request, 'POST', getSegments(params));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cali proxy POST failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { path?: string[] } }) {
  try {
    return await proxy(request, 'PUT', getSegments(params));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cali proxy PUT failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { path?: string[] } }) {
  try {
    return await proxy(request, 'PATCH', getSegments(params));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cali proxy PATCH failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path?: string[] } }) {
  try {
    return await proxy(request, 'DELETE', getSegments(params));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cali proxy DELETE failed' }, { status: 500 });
  }
}
