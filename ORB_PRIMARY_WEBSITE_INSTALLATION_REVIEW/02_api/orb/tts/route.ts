import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || body?.input || body?.prompt || '').trim();
    if (!text) {
      return NextResponse.json({ status: 'error', message: 'Missing text' }, { status: 400 });
    }

    const response = await fetch(new URL('/api/orb', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'speak', text }),
      signal: AbortSignal.timeout(Math.max(8000, Number(process.env.ORB_TTS_KOKORO_TIMEOUT_MS || '45000'))),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.status === 'error') {
      return NextResponse.json(
        { status: 'error', message: data?.message || 'TTS request failed' },
        { status: response.ok ? 502 : response.status },
      );
    }

    return NextResponse.json({
      ...data,
      ok: true,
      status: 'success',
      tts_audio_url: data?.tts_audio_url || data?.audio_url || data?.voice?.audio_url || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', ok: false, message: error?.message || 'TTS request failed' },
      { status: 502 },
    );
  }
}
