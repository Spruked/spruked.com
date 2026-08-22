type MindCallback = (color: string, mind: string) => void;

type SpeechStateCallback = (
  active: boolean,
  meta?: { text?: string; engine?: string },
) => void;

type SendMessageOptions = {
  speak?: boolean;
  onSpeechState?: SpeechStateCallback;
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

function preferredBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter((voice) => /^en[-_]/i.test(voice.lang));
  const preferredPatterns = [
    /microsoft.*(aria|jenny|guy|david)/i,
    /google.*english/i,
    /samantha/i,
    /alex/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = english.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }

  return english[0] || voices[0] || null;
}

async function playServerAudio(
  source: string,
  text: string,
  engine: string,
  onSpeechState?: SpeechStateCallback,
): Promise<void> {
  if (typeof window === 'undefined') return;

  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(source);
    audio.preload = 'auto';

    const finish = () => {
      onSpeechState?.(false, { text, engine });
      resolve();
    };

    audio.onended = finish;
    audio.onerror = () => {
      onSpeechState?.(false, { text, engine });
      reject(new Error('Server audio playback failed.'));
    };

    onSpeechState?.(true, { text, engine });
    void audio.play().catch((error) => {
      onSpeechState?.(false, { text, engine });
      reject(error);
    });
  });
}

async function speakInBrowser(
  text: string,
  onSpeechState?: SpeechStateCallback,
): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return;
  }

  await new Promise<void>((resolve) => {
    const synthesis = window.speechSynthesis;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = preferredBrowserVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const finish = () => {
      onSpeechState?.(false, { text, engine: 'browser-speech-synthesis' });
      resolve();
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    onSpeechState?.(true, { text, engine: 'browser-speech-synthesis' });
    synthesis.speak(utterance);
  });
}

async function speakResponse(
  data: OrbResponse,
  options: SendMessageOptions,
): Promise<void> {
  const text = responseText(data);
  if (!text || !options.speak) return;

  const source = audioSource(data);
  if (source) {
    try {
      await playServerAudio(
        source,
        text,
        String(data?.audio_engine || data?.metadata?.audio_engine || 'server-tts'),
        options.onSpeechState,
      );
      return;
    } catch (error) {
      console.warn('ORB server audio unavailable; using browser voice fallback.', error);
    }
  }

  await speakInBrowser(text, options.onSpeechState);
}

export const OrbService = {
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

    if (options.speak) {
      await speakResponse(data, options);
    }

    return data;
  },
};

export default OrbService;
