type MindCallback = (color: string, mind: string) => void;

type VoicePlaybackStateCallback = (
  active: boolean,
  meta?: { text?: string; engine?: string },
) => void;

type SendMessageOptions = {
  speak?: boolean;
  onVoicePlaybackState?: VoicePlaybackStateCallback;
  onResponseReady?: (data: OrbResponse) => void;
};

type OrbResponse = {
  status?: string;
  response?: string;
  text?: string;
  audio_url?: string | null;
  audio_wav_base64?: string | null;
  audio_engine?: string | null;
  metadata?: Record<string, any>;
  [key: string]: any;
};

let unlockedAudioContext: AudioContext | null = null;

function responseText(data: OrbResponse): string {
  return String(data?.response || data?.text || '').trim();
}

function audioSource(data: OrbResponse): string | null {
  const url = String(data?.audio_url || '').trim();
  if (url) return url;

  const wav = String(data?.audio_wav_base64 || '').trim();
  if (wav) return `data:audio/wav;base64,${wav}`;

  return null;
}

async function primeServerAudioPlayback(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = unlockedAudioContext || new AudioContextCtor();
    unlockedAudioContext = context;
    if (context.state === 'suspended') {
      await context.resume();
    }
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    source.start(0);
  } catch (error) {
    console.warn('ORB audio unlock failed.', error);
  }
}

async function playableAudioSource(source: string): Promise<{ source: string; cleanup: () => void }> {
  if (typeof window === 'undefined' || !source.startsWith('data:')) {
    return { source, cleanup: () => {} };
  }

  try {
    const blob = await fetch(source).then((response) => response.blob());
    const objectUrl = URL.createObjectURL(blob);
    return {
      source: objectUrl,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    console.warn('ORB audio blob conversion failed; using original source.', error);
    return { source, cleanup: () => {} };
  }
}

async function playServerAudio(
  source: string,
  text: string,
  engine: string,
  onVoicePlaybackState?: VoicePlaybackStateCallback,
): Promise<void> {
  if (typeof window === 'undefined') return;
  await primeServerAudioPlayback();
  const playable = await playableAudioSource(source);

  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(playable.source);
    audio.preload = 'auto';
    (audio as any).playsInline = true;

    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      playable.cleanup();
      onVoicePlaybackState?.(false, { text, engine });
      resolve();
    };

    audio.onended = finish;
    audio.onerror = () => {
      if (settled) return;
      settled = true;
      playable.cleanup();
      onVoicePlaybackState?.(false, { text, engine });
      reject(new Error('Server audio playback failed.'));
    };

    onVoicePlaybackState?.(true, { text, engine });
    void audio.play().catch((error) => {
      if (settled) return;
      settled = true;
      playable.cleanup();
      onVoicePlaybackState?.(false, { text, engine });
      reject(error);
    });
  });
}

async function speakResponse(
  data: OrbResponse,
  options: SendMessageOptions,
): Promise<void> {
  const text = responseText(data);
  if (!text || !options.speak) return;

  const source = audioSource(data);
  if (!source) {
    options.onVoicePlaybackState?.(false, { text, engine: 'server-tts-unavailable' });
    return;
  }

  try {
    await playServerAudio(
      source,
      text,
      String(data?.audio_engine || data?.metadata?.audio_engine || 'server-tts'),
      options.onVoicePlaybackState,
    );
  } catch (error) {
    console.warn('ORB server audio playback failed.', error);
    options.onVoicePlaybackState?.(false, { text, engine: 'server-tts-playback-failed' });
  }
}

export const OrbService = {
  primeAudio: primeServerAudioPlayback,

  async warmVoiceInput(): Promise<OrbResponse> {
    const response = await fetch('/api/orb/stt', {
      method: 'GET',
      cache: 'no-store',
    });
    const data = (await response.json().catch(() => ({}))) as OrbResponse;
    if (!response.ok || data?.status === 'error') {
      throw new Error(String(data?.message || data?.error || `Website ORB STT warm-up failed (${response.status}).`));
    }
    return data;
  },

  async transcribeAudio(audio: Blob): Promise<OrbResponse> {
    const form = new FormData();
    form.set('audio', audio, `cali-input-${Date.now()}.webm`);
    form.set('language', 'en');

    const response = await fetch('/api/orb/stt', {
      method: 'POST',
      cache: 'no-store',
      body: form,
    });
    const data = (await response.json().catch(() => ({}))) as OrbResponse;
    if (!response.ok || data?.status === 'error') {
      throw new Error(String(data?.message || data?.error || `Website ORB transcription failed (${response.status}).`));
    }
    return data;
  },

  async warmVoice(): Promise<OrbResponse> {
    const response = await fetch('/api/orb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        action: 'voice_warmup',
        context: {
          source: 'website',
          currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
          site_world: {
            site: 'spruked.com',
            role: 'public Website ORB',
            navigation_contract: 'CALI cognition first, then verified site pointer/navigation action',
            key_routes: '/, /products, /cart, /checkout',
          },
        },
      }),
    });

    const data = (await response.json().catch(() => ({}))) as OrbResponse;
    if (!response.ok || data?.status === 'error') {
      throw new Error(
        String(data?.message || data?.error || `Website ORB voice warm-up failed (${response.status}).`),
      );
    }

    return data;
  },

  async sendMessage(
    message: string,
    onMind?: MindCallback,
    options: SendMessageOptions = {},
  ): Promise<OrbResponse> {
    const prompt = String(message || '').trim();
    if (!prompt) {
      throw new Error('Message is empty.');
    }

    const response = await fetch('/api/orb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        action: 'query',
        prompt,
        context: {
          source: 'website',
          currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
        },
        emotion: 'thoughtful_warm',
      }),
    });

    const data = (await response.json().catch(() => ({}))) as OrbResponse;
    if (!response.ok || data?.status === 'error') {
      throw new Error(
        String(data?.message || data?.error || `Website ORB request failed (${response.status}).`),
      );
    }

    const mind = String(data?.metadata?.leading_mind || data?.metadata?.provider || 'orb');
    onMind?.('#ffffff', mind);
    options.onResponseReady?.(data);

    if (options.speak) {
      await speakResponse(data, options);
    }

    return data;
  },
};

export default OrbService;
