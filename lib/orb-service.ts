type PulseHandler = (color: string, mind: string) => void;

type SpeechStateHandler = (
  active: boolean,
  meta?: {
    mode?: string;
    audioUrl?: string;
    text?: string;
  },
) => void;

type OrbServiceOptions = {
  context?: Record<string, unknown>;
  emotion?: string;
  speak?: boolean;
  speechText?: string;
  onSpeechState?: SpeechStateHandler;
};

type OrbResponse = Record<string, any>;

const WEB_ORB_ENDPOINT = '/api/orb';

const mindColors: Record<string, string> = {
  spinoza: '#00ffcc',
  kant: '#ff00ff',
  hume: '#ffaa00',
  locke: '#00ff00',
  deductive: '#67c6ff',
  inductive: '#63e6a6',
  intuitive: '#f5c96a',
  cali: '#ffffff',
};

function normalizeMindName(name: unknown) {
  const lowered = String(name || '').toLowerCase();
  if (lowered.includes('locke')) return 'locke';
  if (lowered.includes('hume')) return 'hume';
  if (lowered.includes('kant')) return 'kant';
  if (lowered.includes('spinoza')) return 'spinoza';
  if (lowered.includes('deductive')) return 'deductive';
  if (lowered.includes('inductive')) return 'inductive';
  if (lowered.includes('intuitive')) return 'intuitive';
  return 'cali';
}

function pulseMind(onPulse: PulseHandler | undefined, response: OrbResponse) {
  if (!onPulse) return;
  const leadingMind = normalizeMindName(
    response?.metadata?.leading_mind ||
      response?.reasoning?.[0]?.philosopher ||
      response?.raw?.philosophical_reasoning?.[0]?.philosopher ||
      response?.metadata?.provider ||
      'cali',
  );
  onPulse(mindColors[leadingMind] || '#ffffff', leadingMind);
}

function updateSpeechState(options: OrbServiceOptions, active: boolean, meta = {}) {
  options.onSpeechState?.(active, meta);
}

async function playServerAudio(audioUrl: unknown, options: OrbServiceOptions = {}) {
  if (typeof window === 'undefined' || !audioUrl) {
    return false;
  }

  return new Promise<boolean>(async (resolve) => {
    const resolved = String(audioUrl);
    const audio = new window.Audio(resolved);
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      updateSpeechState(options, false, {
        mode: 'server-audio',
        audioUrl: resolved,
        text: options.speechText || '',
      });
      resolve(ok);
    };

    audio.onplaying = () =>
      updateSpeechState(options, true, {
        mode: 'server-audio',
        audioUrl: resolved,
        text: options.speechText || '',
      });
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);

    try {
      updateSpeechState(options, true, {
        mode: 'server-audio-starting',
        audioUrl: resolved,
        text: options.speechText || '',
      });
      await audio.play();
      window.setTimeout(() => finish(true), 90000);
    } catch (error) {
      console.warn('Server audio playback failed:', error);
      finish(false);
    }
  });
}

async function invokeWebOrb(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch(WEB_ORB_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json();
  if (!response.ok || data?.status === 'error') {
    throw new Error(data?.message || `Website ORB request failed for ${action}`);
  }
  return data;
}

export const OrbService = {
  async sendMessage(text: string, onPulse?: PulseHandler, options: OrbServiceOptions = {}) {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) {
      return { status: 'error', message: 'Missing text prompt' };
    }

    onPulse?.('#ffffff', 'processing');

    const response = await invokeWebOrb('query', {
      prompt: trimmed,
      context: options.context || {},
      emotion: options.emotion || 'thoughtful_warm',
    });

    pulseMind(onPulse, response);
    if (options.speak !== false) {
      const spokenText = response?.response || response?.text || response?.voice?.text || '';
      const audioUrl = response?.audio_url || response?.tts_audio_url || response?.voice?.audio_url || '';
      const played = await playServerAudio(audioUrl, {
        ...options,
        speechText: spokenText,
      });
      if (!played) {
        updateSpeechState(options, false, {
          mode: 'text-only',
          text: response?.tts_error || 'Voice is temporarily unavailable, but I can still help here in text.',
        });
      }
    }
    return response;
  },
};
