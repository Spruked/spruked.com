import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function sttBase(): string {
  return trimTrailingSlash(process.env.CALI_STT_API_URL || 'http://127.0.0.1:13000');
}

export async function GET() {
  try {
    const response = await fetch(`${sttBase()}/api/stt/warmup`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(120000),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Local STT warm-up failed.' },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const audio = incoming.get('audio');
    if (!(audio instanceof File)) {
      return NextResponse.json({ status: 'error', message: 'Missing audio file.' }, { status: 400 });
    }

    const outbound = new FormData();
    outbound.set('file', audio, audio.name || 'cali-input.webm');
    outbound.set('language', String(incoming.get('language') || 'en'));

    const response = await fetch(`${sttBase()}/api/stt/transcribe`, {
      method: 'POST',
      body: outbound,
      signal: AbortSignal.timeout(120000),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Local STT transcription failed.' },
      { status: 500 },
    );
  }
}
