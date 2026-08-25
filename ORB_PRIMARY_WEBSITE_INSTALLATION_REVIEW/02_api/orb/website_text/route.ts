import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || body?.message || body?.text || '').trim();
    if (!prompt) {
      return NextResponse.json({ status: 'error', message: 'Missing prompt' }, { status: 400 });
    }

    const response = await fetch(new URL('/api/orb', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'query',
        prompt,
        context: body?.context || { source: 'website_text' },
        emotion: body?.emotion || 'thoughtful_warm',
      }),
      signal: AbortSignal.timeout(Math.max(22000, Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') + 6000)),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.status === 'error') {
      return NextResponse.json(
        { status: 'error', message: data?.message || 'Website ORB text request failed' },
        { status: response.ok ? 502 : response.status },
      );
    }

    return NextResponse.json({
      ...data,
      ok: true,
      status: 'success',
      spoken_output: String(data?.response || data?.text || data?.voice?.text || '').trim(),
      tts_audio_url: data?.tts_audio_url || data?.audio_url || data?.voice?.audio_url || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', ok: false, message: error?.message || 'Website ORB text request failed' },
      { status: 502 },
    );
  }
}
