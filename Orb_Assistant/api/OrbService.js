const WEB_ORB_ENDPOINT = '/api/orb';

const mindColors = {
  spinoza: '#00ffcc',
  kant: '#ff00ff',
  hume: '#ffaa00',
  locke: '#00ff00',
  deductive: '#67c6ff',
  inductive: '#63e6a6',
  intuitive: '#f5c96a',
  cali: '#ffffff',
};

function normalizeMindName(name) {
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

function pulseMind(onPulse, response) {
  const leadingMind = normalizeMindName(
    response?.metadata?.leading_mind ||
    response?.reasoning?.[0]?.philosopher ||
    response?.raw?.philosophical_reasoning?.[0]?.philosopher ||
    response?.metadata?.provider ||
    'cali'
  );
  if (!onPulse) {
    return;
  }
  const color = mindColors[leadingMind] || '#ffffff';
  onPulse(color, leadingMind);
}

function updateSpeechState(options, active, meta = {}) {
  if (typeof options?.onSpeechState !== 'function') return;
  options.onSpeechState(active, meta);
}

async function playServerAudio(audioUrl, options = {}) {
  if (typeof window === 'undefined' || !audioUrl) {
    return false;
  }

  return await new Promise(async (resolve) => {
    const resolved = String(audioUrl);
    const audio = new window.Audio(resolved);
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      updateSpeechState(options, false, {
        mode: 'server-audio',
        audioUrl: resolved,
        text: options?.speechText || '',
      });
      resolve(ok);
    };

    audio.onplaying = () =>
      updateSpeechState(options, true, {
        mode: 'server-audio',
        audioUrl: resolved,
        text: options?.speechText || '',
      });
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);

    try {
      updateSpeechState(options, true, {
        mode: 'server-audio-starting',
        audioUrl: resolved,
        text: options?.speechText || '',
      });
      await audio.play();
      setTimeout(() => finish(true), 90000);
    } catch (error) {
      console.warn('Server audio playback failed:', error);
      finish(false);
    }
  });
}

async function invokeWebOrb(action, payload = {}) {
  if (typeof window !== 'undefined' && window.orbDockAdapter?.send) {
    return window.orbDockAdapter.send({ action, ...payload });
  }

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
  async sendMessage(text, onPulse, options = {}) {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) {
      return { status: 'error', message: 'Missing text prompt' };
    }

    if (onPulse) {
      onPulse('#ffffff', 'processing');
    }

    const response = await invokeWebOrb('query', {
      prompt: trimmed,
      context: options?.context || {},
      emotion: options?.emotion || 'thoughtful_warm',
    });

    pulseMind(onPulse, response);
    if (options?.speak !== false) {
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

  async research(query, domains = [], options = {}) {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    if (!trimmed) {
      return { status: 'error', message: 'Missing research query' };
    }

    const response = await invokeWebOrb('research', {
      query: trimmed,
      domains,
      emotion: options?.emotion || 'analytical',
    });

    if (options?.speak !== false) {
      await playServerAudio(response?.audio_url || response?.tts_audio_url || response?.voice?.audio_url || '', {
        ...options,
        speechText: response?.response || '',
      });
    }
    return response;
  },

  async speak(text, emotion = 'thoughtful_warm', options = {}) {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) {
      return { status: 'error', message: 'Missing speech text' };
    }

    const response = await invokeWebOrb('speak', { text: trimmed, emotion });
    const played = await playServerAudio(response?.audio_url || response?.tts_audio_url || response?.voice?.audio_url || '', {
      ...options,
      speechText: options?.speechText || trimmed,
    });
    if (!played) {
      updateSpeechState(options, false, {
        mode: 'text-only',
        text: response?.tts_error || 'Voice is temporarily unavailable, but I can still help here in text.',
      });
    }
    return response;
  },

  async getStatus() {
    if (typeof window !== 'undefined' && window.orbDockAdapter?.status) {
      return window.orbDockAdapter.status();
    }

    const response = await fetch(WEB_ORB_ENDPOINT, { method: 'GET' });
    const data = await response.json();
    if (!response.ok || data?.status === 'error') {
      throw new Error(data?.message || 'Failed to load ORB status');
    }
    return data;
  },

  async getMeshStatus() {
    if (typeof window !== 'undefined' && window.orbDockAdapter?.send) {
      return window.orbDockAdapter.send({ action: 'mesh_status' });
    }

    if (typeof window !== 'undefined' && window.electronAPI?.getMeshStatus) {
      return window.electronAPI.getMeshStatus();
    }

    return invokeWebOrb('mesh_status');
  },

  async publishArtifact(type, payload, metadata = {}) {
    if (typeof window !== 'undefined' && window.orbDockAdapter?.send) {
      return window.orbDockAdapter.send({ action: 'mesh_publish', type, payload, metadata });
    }

    if (typeof window !== 'undefined' && window.electronAPI?.publishMeshArtifact) {
      return window.electronAPI.publishMeshArtifact(type, payload, metadata);
    }

    return invokeWebOrb('mesh_publish', { type, payload, metadata });
  },

  async submitTask(targetOrb, taskType, payload, priority = 'normal') {
    if (typeof window !== 'undefined' && window.orbDockAdapter?.send) {
      return window.orbDockAdapter.send({ action: 'mesh_submit_task', targetOrb, taskType, payload, priority });
    }

    if (typeof window !== 'undefined' && window.electronAPI?.submitMeshTask) {
      return window.electronAPI.submitMeshTask(targetOrb, taskType, payload, priority);
    }

    return invokeWebOrb('mesh_submit_task', { targetOrb, taskType, payload, priority });
  },

  async listExports(otherOrbId) {
    if (typeof window !== 'undefined' && window.orbDockAdapter?.send) {
      return window.orbDockAdapter.send({ action: 'mesh_list_exports', otherOrbId });
    }

    if (typeof window !== 'undefined' && window.electronAPI?.listMeshExports) {
      return window.electronAPI.listMeshExports(otherOrbId);
    }

    return invokeWebOrb('mesh_list_exports', { otherOrbId });
  },

  async importArtifact(otherOrbId, artifactRelativePath) {
    if (typeof window !== 'undefined' && window.orbDockAdapter?.send) {
      return window.orbDockAdapter.send({ action: 'mesh_import_artifact', otherOrbId, artifactRelativePath });
    }

    if (typeof window !== 'undefined' && window.electronAPI?.importMeshArtifact) {
      return window.electronAPI.importMeshArtifact(otherOrbId, artifactRelativePath);
    }

    return invokeWebOrb('mesh_import_artifact', { otherOrbId, artifactRelativePath });
  },
};
