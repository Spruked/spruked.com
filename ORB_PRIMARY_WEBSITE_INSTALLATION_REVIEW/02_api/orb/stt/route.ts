import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const FAST_WHISPER_URL = process.env.FASTER_WHISPER_STT_URL
  || process.env.FAST_WHISPER_URL
  || 'http://127.0.0.1:9000/stt';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Missing audio file' }, { status: 400 });
    }

    const sttForm = new FormData();
    sttForm.append('file', file, (file as File).name);
    for (const key of ['source_app', 'orb_id', 'speaker_id', 'context_topic', 'trace_id']) {
      const value = formData.get(key);
      if (value && typeof value === 'string') {
        sttForm.append(key, value);
      }
    }

    const sttRes = await fetch(FAST_WHISPER_URL, {
      method: 'POST',
      body: sttForm,
      signal: AbortSignal.timeout(20000),
    });

    const data = await sttRes.json().catch(() => ({}));
    const transcript = String(data?.transcript || data?.text || '').trim();
    return NextResponse.json(
      {
        ...data,
        ok: sttRes.ok && Boolean(transcript),
        transcript,
        provider: data?.provider || 'faster-whisper',
      },
      { status: sttRes.status }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'faster-whisper unavailable' }, { status: 502 });
  }
}
