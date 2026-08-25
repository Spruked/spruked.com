'use client';

import { useEffect, useRef, useState } from 'react';
import { executeBrowserTool, observeBrowserContext, type BrowserToolResult } from '@/lib/orb-browser-tools';
import type { OrbToolRequest } from '@/lib/orb-capability-registry';

const IDLE_TIMEOUT_MS = 300000;
const DRIFT_MIN_MS = 5000;
const DRIFT_MAX_MS = 9000;
const ORB_SIZE = 213;
const ORB_FRAME_SIZE = ORB_SIZE + 18;
const SPEECH_BUBBLE_WIDTH = 360;
const SPEECH_BUBBLE_GAP = 12;
const CURSOR_AVOID_RADIUS = 120;
const EVADE_COOLDOWN_MS = 240;
const EVADE_DISTANCE = 165;
const VIEWPORT_PADDING = 20;
const DRIFT_MAX_HEIGHT_RATIO = 0.58;
const ORB_SKIN_URL = '/orb/weaver-red-blue-center.png?v=weaver-center-1';
const ORB_WARM_KEY = 'spruked:orb-voice-warmed';

const RECORDING_MAX_MS = 14000;
const RECORDING_MIN_MS = 650;
const SILENCE_AFTER_SPEECH_MS = 850;
const SILENCE_SAMPLE_MS = 120;
const SPEECH_RMS_THRESHOLD = 0.025;
const SILENCE_RMS_THRESHOLD = 0.018;

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';
type WakeRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type WakeRecognitionConstructor = new () => WakeRecognition;

function getMindColor(mind: string) {
  switch (mind.toLowerCase()) {
    case 'cali': return '#ffffff';
    case 'kant': return '#b4ff00';
    case 'spinoza': return '#00ffcc';
    case 'hume': return '#ff00aa';
    case 'locke': return '#ffaa00';
    case 'deductive': return '#67c6ff';
    case 'inductive': return '#63e6a6';
    case 'intuitive': return '#f5c96a';
    case 'tool_router': return '#67c6ff';
    default: return '#b4ff00';
  }
}

function audioUrl(raw: unknown) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function recorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const supportedTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mimeType of supportedTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }
  return '';
}

function recordingFileName(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mp4')) return 'website-orb.m4a';
  if (normalized.includes('ogg')) return 'website-orb.ogg';
  if (normalized.includes('wav')) return 'website-orb.wav';
  return 'website-orb.webm';
}

export default function GlobalOrb() {
  const [pulseColor, setPulseColor] = useState('white');
  const [status, setStatus] = useState('Click the orb and speak.');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [bubbleText, setBubbleText] = useState('Click the orb and speak.');
  const [isAwake, setIsAwake] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubblePinned, setBubblePinned] = useState(false);
  const [deployedMorb, setDeployedMorb] = useState<{ x: number; y: number } | null>(null);

  const orbPositionRef = useRef({ x: 0, y: 0 });
  const isAwakeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>('idle');
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const driftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const evadeCooldownRef = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingMonitorTimerRef = useRef<number | null>(null);
  const recordingCancelledRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const silenceStartedAtRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);

  const voiceRequestInFlightRef = useRef(false);
  const activeVoiceAbortControllerRef = useRef<AbortController | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechFinishTimerRef = useRef<number | null>(null);
  const voiceTurnIdRef = useRef(0);
  const bubblePinnedRef = useRef(false);
  const micPermissionWarmedRef = useRef(false);
  const wakeRecognitionRef = useRef<WakeRecognition | null>(null);
  const wakeListeningRef = useRef(false);

  const isBusy = voiceState === 'recording' || voiceState === 'processing' || voiceState === 'speaking';

  const applyWarmStartState = () => {
    if (typeof window === 'undefined') return;
    const state = window.sessionStorage.getItem(ORB_WARM_KEY);
    if (!state) return;
    wakeOrb();
    setBubbleVisible(true);
    if (state === 'granted') {
      micPermissionWarmedRef.current = true;
      setStatus('Voice warmed.');
      setBubbleText('ORB voice and microphone permission are ready. Click the ORB and speak.');
      setPulseColor('#67c6ff');
    } else if (state === 'blocked') {
      setStatus('Mic permission needed.');
      setBubbleText('ORB voice is awake, but microphone permission is blocked in the browser.');
      setPulseColor('red');
    } else {
      setStatus('Voice output ready.');
      setBubbleText('ORB voice is awake. This browser does not expose microphone warm-up support.');
      setPulseColor('#ffaa00');
    }
  };

  const setRuntimeState = (next: VoiceState, nextStatus?: string) => {
    voiceStateRef.current = next;
    setVoiceState(next);
    if (nextStatus) setStatus(nextStatus);
  };

  const horizontalFootprint = () => (
    typeof window !== 'undefined' && window.innerWidth >= 640
      ? ORB_FRAME_SIZE + SPEECH_BUBBLE_GAP + SPEECH_BUBBLE_WIDTH
      : ORB_FRAME_SIZE
  );

  const sleepPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const x = Math.max(VIEWPORT_PADDING, window.innerWidth - horizontalFootprint() - VIEWPORT_PADDING);
    return { x, y: VIEWPORT_PADDING };
  };

  const pickWaypoint = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - horizontalFootprint() - VIEWPORT_PADDING);
    const maxY = Math.max(
      VIEWPORT_PADDING,
      Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - ORB_FRAME_SIZE,
    );
    const x = Math.floor(VIEWPORT_PADDING + Math.random() * (maxX - VIEWPORT_PADDING));
    const y = Math.floor(VIEWPORT_PADDING + Math.random() * (maxY - VIEWPORT_PADDING));
    return { x, y };
  };

  const clampPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - horizontalFootprint() - VIEWPORT_PADDING);
    const maxY = Math.max(
      VIEWPORT_PADDING,
      Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - ORB_FRAME_SIZE,
    );
    return {
      x: Math.min(maxX, Math.max(VIEWPORT_PADDING, x)),
      y: Math.min(maxY, Math.max(VIEWPORT_PADDING, y)),
    };
  };

  const wakeOrb = () => {
    setIsAwake(true);
    isAwakeRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isAwakeRef.current = false;
      setIsAwake(false);
      setShowSettings(false);
      setOrbPosition(sleepPosition());
    }, IDLE_TIMEOUT_MS);
  };

  const queueNextDrift = () => {
    if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
    const delay = DRIFT_MIN_MS + Math.floor(Math.random() * (DRIFT_MAX_MS - DRIFT_MIN_MS));
    driftTimerRef.current = setTimeout(() => {
      if (voiceStateRef.current !== 'idle') {
        queueNextDrift();
        return;
      }
      if (!isAwakeRef.current) {
        setOrbPosition(sleepPosition());
        queueNextDrift();
        return;
      }
      setOrbPosition(pickWaypoint());
      queueNextDrift();
    }, delay);
  };

  const maybeEvadeCursor = (cursorX: number, cursorY: number) => {
    const now = Date.now();
    if (now - evadeCooldownRef.current < EVADE_COOLDOWN_MS) return;

    const centerX = orbPositionRef.current.x + ORB_SIZE / 2;
    const centerY = orbPositionRef.current.y + ORB_SIZE / 2;
    const dx = centerX - cursorX;
    const dy = centerY - cursorY;
    const distance = Math.hypot(dx, dy);
    if (distance > CURSOR_AVOID_RADIUS) return;

    const safeDx = distance < 1 ? 1 : dx / distance;
    const safeDy = distance < 1 ? -0.6 : dy / distance;
    const targetX = centerX + safeDx * EVADE_DISTANCE - ORB_SIZE / 2;
    const targetY = centerY + safeDy * EVADE_DISTANCE - ORB_SIZE / 2;

    evadeCooldownRef.current = now;
    setOrbPosition(clampPosition(targetX, targetY));
    wakeOrb();
    queueNextDrift();
  };

  const clearRecordingMonitor = () => {
    if (recordingMonitorTimerRef.current) {
      window.clearTimeout(recordingMonitorTimerRef.current);
      recordingMonitorTimerRef.current = null;
    }
  };

  const cleanupRecordingResources = () => {
    clearRecordingMonitor();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
  };

  const stopSpeechAudio = () => {
    if (speechFinishTimerRef.current) {
      window.clearTimeout(speechFinishTimerRef.current);
      speechFinishTimerRef.current = null;
    }
    if (!speechAudioRef.current) return;
    speechAudioRef.current.onended = null;
    speechAudioRef.current.onerror = null;
    speechAudioRef.current.pause();
    speechAudioRef.current.currentTime = 0;
    speechAudioRef.current = null;
  };

  const resetVoiceTurn = (nextStatus = 'Click the orb and speak.') => {
    voiceRequestInFlightRef.current = false;
    activeVoiceAbortControllerRef.current = null;
    setRuntimeState('idle', nextStatus);
    setPulseColor('white');
    window.setTimeout(() => startWakeWordListening(), 350);
  };

  const startWakeWordListening = () => {
    if (typeof window === 'undefined' || wakeListeningRef.current || voiceStateRef.current !== 'idle') return;
    const recognitionConstructor = (window as Window & {
      SpeechRecognition?: WakeRecognitionConstructor;
      webkitSpeechRecognition?: WakeRecognitionConstructor;
    }).SpeechRecognition || (window as Window & {
      webkitSpeechRecognition?: WakeRecognitionConstructor;
    }).webkitSpeechRecognition;
    if (!recognitionConstructor) return;

    const recognition = new recognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    wakeRecognitionRef.current = recognition;
    wakeListeningRef.current = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => String(result?.[0]?.transcript || ''))
        .join(' ')
        .toLowerCase();
      if (!/\b(?:cali|hey cali|okay cali|ok cali|orb)\b/.test(transcript)) return;
      wakeListeningRef.current = false;
      recognition.stop();
      wakeOrb();
      setBubbleText('I’m listening.');
      setBubbleVisible(true);
      window.setTimeout(() => {
        if (voiceStateRef.current === 'idle') void startRecording();
      }, 220);
    };
    recognition.onend = () => {
      if (wakeListeningRef.current && voiceStateRef.current === 'idle') {
        window.setTimeout(() => {
          try { recognition.start(); } catch { /* browser may already be restarting */ }
        }, 450);
      }
    };
    recognition.onerror = () => {
      // Wake-word recognition is an enhancement. Preserve click-to-speak if a
      // browser revokes recognition or does not expose the service.
      wakeListeningRef.current = false;
    };
    try {
      recognition.start();
    } catch {
      wakeListeningRef.current = false;
    }
  };

  const abortActiveVoiceRequest = () => {
    activeVoiceAbortControllerRef.current?.abort();
    activeVoiceAbortControllerRef.current = null;
    voiceRequestInFlightRef.current = false;
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    cleanupRecordingResources();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    resetVoiceTurn('Recording cancelled.');
  };

  const monitorRecordingSilence = () => {
    const recorder = mediaRecorderRef.current;
    const analyser = analyserRef.current;
    if (!recorder || recorder.state !== 'recording' || !analyser) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let index = 0; index < data.length; index += 1) {
      const sample = data[index];
      const centered = (sample - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / data.length);
    const now = Date.now();
    const elapsed = now - recordingStartedAtRef.current;

    if (rms >= SPEECH_RMS_THRESHOLD) {
      speechDetectedRef.current = true;
      silenceStartedAtRef.current = null;
    } else if (speechDetectedRef.current && rms <= SILENCE_RMS_THRESHOLD) {
      silenceStartedAtRef.current ??= now;
      if (elapsed >= RECORDING_MIN_MS && now - silenceStartedAtRef.current >= SILENCE_AFTER_SPEECH_MS) {
        recorder.stop();
        return;
      }
    } else {
      silenceStartedAtRef.current = null;
    }

    if (elapsed >= RECORDING_MAX_MS) {
      recorder.stop();
      return;
    }

    recordingMonitorTimerRef.current = window.setTimeout(monitorRecordingSilence, SILENCE_SAMPLE_MS);
  };

  const playVoiceAudio = async (rawAudioUrl: unknown, text: string) => {
    const resolved = audioUrl(rawAudioUrl);
    if (!resolved || !voiceEnabled) {
      setBubbleText(text || 'Voice is temporarily unavailable, but I can still help here in text.');
      resetVoiceTurn('Response ready.');
      return;
    }

    stopSpeechAudio();
    setRuntimeState('speaking', 'Speaking...');
    const audio = new Audio(resolved);
    speechAudioRef.current = audio;

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (speechFinishTimerRef.current) {
          window.clearTimeout(speechFinishTimerRef.current);
          speechFinishTimerRef.current = null;
        }
        speechAudioRef.current = null;
        resetVoiceTurn('Voice playback complete.');
        if (!bubblePinnedRef.current) setBubbleVisible(false);
        resolve();
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(() => finish());
      // Some browsers do not reliably emit `ended` for cached WAV responses.
      // Bound the fallback to the expected speech duration so the ORB cannot
      // remain stuck in listening/speaking state indefinitely.
      const expectedPlaybackMs = Math.max(8000, Math.min(45000, (text.length * 180) + 5000));
      speechFinishTimerRef.current = window.setTimeout(finish, expectedPlaybackMs);
    });
  };

  const processRecordedOrbAudio = async (audioBlob: Blob) => {
    if (recordingCancelledRef.current || voiceRequestInFlightRef.current) return;
    if (!audioBlob.size) {
      resetVoiceTurn('No speech detected.');
      return;
    }

    const turnId = voiceTurnIdRef.current + 1;
    voiceTurnIdRef.current = turnId;
    voiceRequestInFlightRef.current = true;
    const abortController = new AbortController();
    activeVoiceAbortControllerRef.current = abortController;
    setRuntimeState('processing', 'Transcribing...');
    setPulseColor('#67c6ff');

    try {
      const formData = new FormData();
      // Preserve the recorder's real container. Safari commonly records MP4/M4A;
      // labeling those bytes as WebM makes some STT/ffmpeg deployments reject them.
      formData.append('file', audioBlob, recordingFileName(audioBlob.type));
      formData.append('current_path', window.location.pathname || '/');
      formData.append('browser_context', JSON.stringify(observeBrowserContext()));

      const response = await fetch('/api/orb/website-voice', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.status === 'error') {
        throw new Error(data?.message || 'Website ORB voice request failed');
      }
      if (turnId !== voiceTurnIdRef.current) return;

      const spokenText = String(data?.spoken_output || data?.response || data?.text || '').trim();
      const transcript = String(data?.transcript || '').trim();
      setBubbleText(spokenText || transcript || 'I heard you, but I could not form a response.');
      setBubbleVisible(true);
      setPulseColor(getMindColor(String(data?.metadata?.leading_mind || data?.llm_source || 'cali')));
      if (data?.tool_request) {
        const toolResult = await executeBrowserTool(data.tool_request as OrbToolRequest);
        if (data.tool_request.name !== 'navigate') {
          const confirmation = await fetch('/api/orb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'tool_result', result: toolResult }),
          });
          const confirmedData = await confirmation.json().catch(() => ({}));
          const confirmedText = String(confirmedData?.response || toolResult.message).trim();
          setBubbleText(confirmedText);
          await playVoiceAudio(confirmedData?.audio_url || confirmedData?.tts_audio_url, confirmedText);
          return;
        }
        return;
      }
      if (data?.timing_ms?.total) {
        const totalSeconds = (Number(data.timing_ms.total) / 1000).toFixed(1);
        const ttsSeconds = data.timing_ms.tts ? ` TTS ${(Number(data.timing_ms.tts) / 1000).toFixed(1)}s.` : '';
        setStatus(`Response ready in ${totalSeconds}s.${ttsSeconds}`);
      }
      await playVoiceAudio(data?.tts_audio_url || data?.audio_url || data?.voice?.audio_url, spokenText);
    } catch (error: any) {
      if (abortController.signal.aborted) {
        resetVoiceTurn('Voice turn cancelled.');
        return;
      }
      setBubbleText(error?.message || 'I could not complete that request.');
      setBubbleVisible(true);
      setPulseColor('red');
      setRuntimeState('error', 'Voice request failed.');
      window.setTimeout(() => {
        if (voiceStateRef.current === 'error') resetVoiceTurn();
      }, 1800);
    } finally {
      if (activeVoiceAbortControllerRef.current === abortController) {
        activeVoiceAbortControllerRef.current = null;
      }
      voiceRequestInFlightRef.current = false;
    }
  };

  const startRecording = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRuntimeState('error', 'Microphone unavailable in this browser.');
      return;
    }
    if (voiceRequestInFlightRef.current) return;

    stopSpeechAudio();
    abortActiveVoiceRequest();
    recordingCancelledRef.current = false;
    speechDetectedRef.current = false;
    silenceStartedAtRef.current = null;
    recordingStartedAtRef.current = Date.now();
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mimeType = recorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        cleanupRecordingResources();
        mediaRecorderRef.current = null;
        if (recordingCancelledRef.current) {
          audioChunksRef.current = [];
          return;
        }
        const recordedType = mimeType || audioChunksRef.current[0]?.type || 'application/octet-stream';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
        audioChunksRef.current = [];
        void processRecordedOrbAudio(audioBlob);
      };

      recorder.start();
      setRuntimeState('recording', 'Listening...');
      setPulseColor('#ffffff');
      setBubbleText("I'm listening.");
      setBubbleVisible(true);
      wakeOrb();
      monitorRecordingSilence();
    } catch (error: any) {
      cleanupRecordingResources();
      setBubbleText(error?.message || 'Microphone permission was not granted.');
      setPulseColor('red');
      setRuntimeState('error', 'Microphone unavailable.');
      window.setTimeout(() => {
        if (voiceStateRef.current === 'error') resetVoiceTurn();
      }, 1800);
    }
  };

  const handleOrbClick = () => {
    wakeOrb();
    if (voiceStateRef.current === 'recording') {
      cancelRecording();
      return;
    }
    if (voiceStateRef.current === 'speaking') {
      stopSpeechAudio();
      resetVoiceTurn('Voice interrupted.');
      return;
    }
    if (voiceStateRef.current === 'processing') {
      abortActiveVoiceRequest();
      resetVoiceTurn('Voice turn cancelled.');
      return;
    }
    void startRecording();
  };

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    if (!isMounted) return;
    startWakeWordListening();
    return () => {
      wakeListeningRef.current = false;
      wakeRecognitionRef.current?.stop();
      wakeRecognitionRef.current = null;
    };
    // Wake recognition is intentionally initialized once per mounted orb.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  useEffect(() => {
    orbPositionRef.current = orbPosition;
  }, [orbPosition]);

  useEffect(() => {
    isAwakeRef.current = isAwake;
  }, [isAwake]);

  useEffect(() => {
    bubblePinnedRef.current = bubblePinned;
  }, [bubblePinned]);

  useEffect(() => {
    const handleMorbDeployment = (event: Event) => {
      const detail = (event as CustomEvent<{ x?: number; y?: number }>).detail || {};
      if (typeof detail.x !== 'number' || typeof detail.y !== 'number') return;
      setDeployedMorb({ x: detail.x, y: detail.y });
      const travelAudio = new Audio('/orb/travel_morb2.mp3');
      travelAudio.volume = 0.25;
      void travelAudio.play().catch(() => {});
      window.setTimeout(() => {
        const pingAudio = new Audio('/orb/pointeerping.mp3');
        pingAudio.volume = 0.55;
        void pingAudio.play().catch(() => {});
      }, 1450);
      window.setTimeout(() => setDeployedMorb(null), 3800);
    };
    window.addEventListener('spruked-morb-deploy', handleMorbDeployment);
    return () => window.removeEventListener('spruked-morb-deploy', handleMorbDeployment);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;
    setOrbPosition(sleepPosition());

    const handleWake = (event: MouseEvent) => {
      wakeOrb();
      maybeEvadeCursor(event.clientX, event.clientY);
    };
    const handleResize = () => {
      setOrbPosition((prev) => clampPosition(prev.x, prev.y));
    };

    window.addEventListener('mousemove', handleWake, { passive: true });
    window.addEventListener('click', handleWake, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('spruked-orb-warm-start', applyWarmStartState);
    wakeOrb();
    applyWarmStartState();
    queueNextDrift();

    const pendingRaw = window.sessionStorage.getItem('orb.pending-tool');
    if (pendingRaw) {
      window.sessionStorage.removeItem('orb.pending-tool');
      try {
        const pending = JSON.parse(pendingRaw) as OrbToolRequest;
        const target = document.querySelector<HTMLElement>('main') || document.body;
        target.dataset.orbAnchor = pending.arguments.anchor_id || `route:${window.location.pathname}`;
        window.setTimeout(async () => {
          // Navigation is verified by the canonical pathname. It does not need
          // a pointer-proof record for the old or new page.
          if (pending.name === 'navigate') {
            const result = await executeBrowserTool(pending);
            const verified = window.location.pathname === pending.arguments.route && result.ok;
            const navigationResult: BrowserToolResult = {
              ...result,
              tool: 'navigate',
              ok: verified,
              status: verified ? 'confirmed' : 'failed',
              message: verified
                ? `You’re now at ${document.title || pending.arguments.route}.`
                : `I could not confirm navigation to ${pending.arguments.route}.`,
            };
            const response = await fetch('/api/orb', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'tool_result', result: navigationResult }),
            });
            const data = await response.json().catch(() => ({}));
            const message = String(data?.response || navigationResult.message);
            setBubbleText(message);
            setBubbleVisible(true);
            if (navigationResult.ok) void playVoiceAudio(data?.audio_url || data?.tts_audio_url, message);
            return;
          }
          if (pending.arguments.anchor_id) {
            const proofResponse = await fetch(`/api/orb/pointer-proof?target_id=${encodeURIComponent(pending.arguments.anchor_id)}`);
            const proofData = await proofResponse.json().catch(() => ({}));
            if (proofResponse.ok && proofData?.target) {
              pending.pointer_target = proofData.target;
              pending.arguments.anchor_id = proofData.target.target_id;
            }
          }
          const result = await executeBrowserTool(pending);
          const navigationResult: BrowserToolResult = {
            ...result,
            tool: 'navigate',
            ok: window.location.pathname === pending.arguments.route && result.ok,
            status: window.location.pathname === pending.arguments.route && result.ok ? 'confirmed' : 'failed',
            message: window.location.pathname === pending.arguments.route && result.ok
              ? `You’re now at ${document.title || pending.arguments.route}. I highlighted the page.`
              : `I could not confirm navigation to ${pending.arguments.route}.`,
          };
          const response = await fetch('/api/orb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'tool_result', result: navigationResult }),
          });
          const data = await response.json().catch(() => ({}));
          const message = String(data?.response || navigationResult.message);
          setBubbleText(message);
          setBubbleVisible(true);
          if (navigationResult.ok) void playVoiceAudio(data?.audio_url || data?.tts_audio_url, message);
        }, 500);
      } catch {
        // Ignore malformed session data; no action is claimed.
      }
    }

    return () => {
      window.removeEventListener('mousemove', handleWake);
      window.removeEventListener('click', handleWake);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('spruked-orb-warm-start', applyWarmStartState);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
      clearRecordingMonitor();
      cleanupRecordingResources();
      abortActiveVoiceRequest();
      stopSpeechAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const closeMenu = () => setShowSettings(false);
    if (showSettings) {
      window.addEventListener('click', closeMenu);
    }
    return () => {
      window.removeEventListener('click', closeMenu);
    };
  }, [showSettings]);

  if (!isMounted) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] flex items-start gap-3 pointer-events-none transition-transform duration-[5200ms] ease-in-out"
      style={{ transform: `translate3d(${orbPosition.x}px, ${orbPosition.y}px, 0)` }}
    >
      <div className="pointer-events-auto relative">
        <button
          type="button"
          data-orb-transient="orb-self"
          onClick={handleOrbClick}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            wakeOrb();
            setShowSettings((value) => !value);
          }}
          onMouseEnter={wakeOrb}
          aria-label={isBusy ? 'Cancel or interrupt ORB voice turn' : 'Start ORB voice turn'}
          className="relative flex items-center justify-center rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${ORB_SIZE}px`,
            height: `${ORB_SIZE}px`,
            opacity: isAwake ? 1 : 0.2,
            transform: `scale(${isAwake ? 1 : 0.78})`,
            filter: `saturate(${isAwake ? 1.1 : 0.4})`,
          }}
          title={isBusy ? status : 'Click to speak'}
        >
          <div
            aria-hidden="true"
            className="absolute inset-[5px] rounded-full border-[3px] border-[#294956] transition-all duration-700"
            style={{
              boxShadow: isAwake
                ? '0 0 22px rgba(41,73,86,0.95), inset 0 0 18px rgba(41,73,86,0.9)'
                : '0 0 10px rgba(41,73,86,0.72), inset 0 0 10px rgba(41,73,86,0.68)',
            }}
          />

          <div
            className="absolute h-full w-full rounded-full mix-blend-screen transition-all duration-700"
            style={{
              boxShadow: `0 0 ${isAwake ? '44px' : '18px'} rgba(74, 164, 255, 0.76)`,
              animation: isAwake ? 'pulse 1.5s infinite ease-in-out' : 'pulse 4s infinite ease-in-out',
            }}
          />

          <div className="relative z-10 flex h-[177px] w-[177px] items-center justify-center overflow-hidden rounded-full border border-white/35 bg-black shadow-[inset_0_0_20px_rgba(255,255,255,0.22)]">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${ORB_SKIN_URL})` }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.28),transparent_34%,rgba(0,0,0,0.14)_74%)]"
            />
            <div aria-hidden="true" className={`orb-center-tint ${voiceState === 'speaking' ? 'is-speaking' : ''}`} />
            <div aria-hidden="true" className="orb-center-swirls">
              <span className="orb-swirl orb-swirl-one" />
              <span className="orb-swirl orb-swirl-two" />
              <span className="orb-swirl orb-swirl-three" />
            </div>
            <div
              className={`absolute inset-0 rounded-full border-2 ${isBusy ? 'animate-ping opacity-70' : 'opacity-30'}`}
              style={{ borderColor: '#67c6ff', boxShadow: 'inset 0 0 18px rgba(103,198,255,0.72)' }}
            />
          </div>
        </button>

        <div aria-hidden="true" className="orb-morb-orbit">
          <span className="orb-orbit-dot orb-morb-one" />
          <span className="orb-orbit-dot orb-morb-two" />
          <span className="orb-orbit-dot orb-morb-three" />
        </div>

        {deployedMorb && (
          <span
            aria-hidden="true"
            className="orb-morb-flight"
            style={{
              left: `${ORB_SIZE / 2 - 12.5}px`,
              top: `${ORB_SIZE / 2 - 12.5}px`,
              '--morb-dx': `${deployedMorb.x - (orbPosition.x + ORB_SIZE / 2)}px`,
              '--morb-dy': `${deployedMorb.y - (orbPosition.y + ORB_SIZE / 2)}px`,
            } as React.CSSProperties}
          />
        )}

        {showSettings && (
          <div
            className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-gray-800 bg-black/90 p-2 text-xs text-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-white/5"
              onClick={() => setVoiceEnabled((value) => !value)}
            >
              Voice: {voiceEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className="mt-1 block w-full rounded-md px-2 py-1.5 text-left hover:bg-white/5"
              onClick={() => {
                setOrbPosition(pickWaypoint());
                setShowSettings(false);
          }}
        >
              Nudge Path
        </button>

          </div>
        )}
      </div>

      {(bubbleVisible || isBusy) && (
        <div
          className="pointer-events-auto hidden sm:block w-[360px] max-w-[calc(100vw-160px)] cursor-pointer rounded-2xl border border-gray-800 bg-black/80 px-4 py-3 text-sm leading-relaxed text-gray-100 shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          style={{ borderColor: `${pulseColor}4d` }}
          onClick={(event) => {
            event.stopPropagation();
            setBubblePinned((pinned) => !pinned);
          }}
          title={bubblePinned ? 'Click to unpin this response' : 'Click to keep this response open'}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">{status}</p>
          <p>{bubbleText}</p>
        </div>
      )}
    </div>
  );
}
