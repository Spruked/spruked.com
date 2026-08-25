import { NextRequest, NextResponse } from 'next/server';
import { orbInternalUrl } from '@/lib/orb-internal-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FAST_WHISPER_STT_URL = process.env.FASTER_WHISPER_STT_URL
  || process.env.FAST_WHISPER_URL
  || 'http://127.0.0.1:9000/stt';

function jsonError(message: string, status: number) {
  return NextResponse.json({ status: 'error', ok: false, message }, { status });
}

async function transcribeAudio(file: File) {
  const sttForm = new FormData();
  sttForm.append('file', file, file.name || 'website-orb.webm');

  const response = await fetch(FAST_WHISPER_STT_URL, {
    method: 'POST',
    body: sttForm,
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || data?.error || `STT failed (${response.status})`);
  }

  const transcript = String(data?.text || data?.transcript || '').trim();
  if (!transcript) {
    const error = new Error('No transcript returned by STT provider');
    (error as any).status = 422;
    throw error;
  }

  return {
    transcript,
    provider: data?.provider || 'faster-whisper',
    raw: data,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return jsonError('Missing audio file', 400);
    }

    if (file.size <= 0) {
      return jsonError('Empty audio file', 400);
    }

    const startedAt = Date.now();
    const sttStartedAt = Date.now();
    const stt = await transcribeAudio(file);
    const sttMs = Date.now() - sttStartedAt;

    const queryStartedAt = Date.now();
    // Voice must speak the real CALI answer, not a fast local fallback. Use the
    // longer cognition budget when it exceeds the voice-specific setting.
    const providerTimeoutMs = Math.max(
      3000,
      Number(process.env.SPRUKED_ORB_VOICE_PROVIDER_TIMEOUT_MS || '5000') || 5000,
      Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000,
    );
    const qwenTimeoutMs = Math.max(5000, Number(process.env.QWEN_TTS_TIMEOUT_MS || '220000'));
    const kokoroTimeoutMs = Math.max(5000, Number(process.env.ORB_TTS_KOKORO_TIMEOUT_MS || '45000'));
    const orbTimeoutMs = providerTimeoutMs + qwenTimeoutMs + kokoroTimeoutMs + 10000;
    const orbResponse = await fetch(orbInternalUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'query',
        prompt: stt.transcript,
        context: {
          source: 'website_voice',
          currentPath: String(formData.get('current_path') || '/'),
          browserContext: (() => {
            try { return JSON.parse(String(formData.get('browser_context') || '{}')); } catch { return {}; }
          })(),
          providerTimeoutMs,
        },
        emotion: 'thoughtful_warm',
      }),
      signal: AbortSignal.timeout(orbTimeoutMs),
    });

    const data = await orbResponse.json().catch(() => ({}));
    if (!orbResponse.ok || data?.status === 'error') {
      throw new Error(data?.message || data?.metadata?.provider_error || 'Website ORB query failed');
    }

    const spokenOutput = String(data?.response || data?.text || data?.voice?.text || '').trim();
    const ttsAudioUrl = data?.tts_audio_url || data?.audio_url || data?.voice?.audio_url || null;
    if (!ttsAudioUrl || data?.metadata?.voice_ready === false || data?.voice_ready === false) {
      throw new Error(data?.metadata?.tts_error || data?.tts_error || 'Server TTS did not return playable audio');
    }

    const answerAndTtsMs = Date.now() - queryStartedAt;
    return NextResponse.json({
      ...data,
      ok: true,
      status: 'success',
      transcript: stt.transcript,
      spoken_output: spokenOutput,
      tts_audio_url: ttsAudioUrl,
      audio_url: data?.audio_url || ttsAudioUrl,
      stt_provider: stt.provider,
      timing_ms: {
        total: Date.now() - startedAt,
        transcription: sttMs,
        answer_and_tts: answerAndTtsMs,
        tts: data?.metadata?.tts_ms ?? null,
        orb_provider_timeout: providerTimeoutMs,
        voice_route_timeout: orbTimeoutMs,
      },
    });
  } catch (error: any) {
    const status = Number(error?.status || 502);
    return jsonError(error?.message || 'Website ORB voice request failed', status);
  }
}
