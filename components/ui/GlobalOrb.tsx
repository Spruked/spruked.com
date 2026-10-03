'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OrbService } from '@/Orb_Assistant/api/OrbService';
import { MotionRuntime } from '@/lib/motion_runtime/MotionRuntime';
import {
  WEBSITE_ORB_GUIDE_EVENT,
  buildGuideState,
  findPointerTargetElement,
  getPointerTarget,
  SPRUKED_POINTER_TARGETS,
  resolvePointerTarget,
  scrollPointerTargetIntoView,
  type WebsiteOrbGuideState,
} from '@/lib/motion_runtime/pointer/pointer-runtime';

const END_OF_SPEECH_SILENCE_MS = 4000;
const AUDIO_ANALYSIS_INTERVAL_MS = 100;
const SPEECH_ACTIVITY_THRESHOLD = 0.012;
const MAX_RECORDING_DURATION_MS = 120000;
const LISTENING_RESTART_MS = 700;
const MIN_RECORDING_BYTES = 1200;
const ORB_SIZE = 206;
const VIEWPORT_PADDING = 20;
const ORB_IMAGE_SRC = '/orb-skin-studio/assets/caliorb1600.png';
const SESSION_OBSERVATIONS_KEY = 'spruked:cali:session-observations';
const MAX_SESSION_OBSERVATIONS = 40;
const SITE_TOUR_TARGET_IDS = [
  'spruked.nav.home',
  'spruked.nav.ecosystem',
  'spruked.nav.technology',
  'spruked.nav.research',
  'spruked.nav.products',
  'spruked.products.alpha-certsig',
  'spruked.products.truemark',
  'spruked.nav.cart',
  'spruked.nav.checkout',
];

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SessionObservation = {
  type: 'path' | 'target' | 'scroll';
  path: string;
  label?: string;
  target?: string;
  depth?: number;
  at: number;
};

function recordSessionObservation(observation: SessionObservation) {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(SESSION_OBSERVATIONS_KEY) || '[]');
    const observations = Array.isArray(existing) ? existing : [];
    observations.push(observation);
    window.sessionStorage.setItem(
      SESSION_OBSERVATIONS_KEY,
      JSON.stringify(observations.slice(-MAX_SESSION_OBSERVATIONS)),
    );
  } catch {}
}

export default function GlobalOrb() {
  const pathname = usePathname();
  const router = useRouter();
  const [pulseColor, setPulseColor] = useState('white');
  const [status, setStatus] = useState('Awaiting epistemic stimulus...');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInputReady, setVoiceInputReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [isAwake, setIsAwake] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [guide, setGuide] = useState<WebsiteOrbGuideState | null>(null);
  const [pendingGuide, setPendingGuide] = useState<{ targetId: string; message?: string } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStopRequestedRef = useRef(false);
  const recordingStartPendingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isProcessingRef = useRef(false);
  const isAwakeRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const listeningRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioAnalysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const motionRuntimeRef = useRef<MotionRuntime | null>(null);
  const guidePulseRef = useRef(0);
  const bubbleClearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const browserRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const browserSpeechActiveRef = useRef(false);
  const browserSpeechAvailableRef = useRef<boolean | null>(null);
  const browserFinalTranscriptRef = useRef('');
  const browserFinalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tourTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tourIndexRef = useRef(0);
  const tourActiveRef = useRef(false);

  const showSpeechBubble = (text: string) => {
    if (bubbleClearTimerRef.current) clearTimeout(bubbleClearTimerRef.current);
    setBubbleText(String(text || '').trim());
  };

  const clearSpeechBubbleSoon = () => {
    if (bubbleClearTimerRef.current) clearTimeout(bubbleClearTimerRef.current);
    bubbleClearTimerRef.current = setTimeout(() => setBubbleText(''), 950);
  };

  const clearRecordingTimersAndAnalysis = () => {
    if (stopRecordingTimerRef.current) clearTimeout(stopRecordingTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioAnalysisTimerRef.current) clearInterval(audioAnalysisTimerRef.current);
    stopRecordingTimerRef.current = null;
    silenceTimerRef.current = null;
    audioAnalysisTimerRef.current = null;
    try {
      audioSourceRef.current?.disconnect();
    } catch {}
    audioSourceRef.current = null;
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close().catch(() => {});
    }
  };

  const clearRecordingResources = () => {
    clearRecordingTimersAndAnalysis();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const stopBrowserRecognition = () => {
    if (browserFinalTimerRef.current) clearTimeout(browserFinalTimerRef.current);
    browserFinalTimerRef.current = null;
    browserFinalTranscriptRef.current = '';
    browserSpeechActiveRef.current = false;
    setIsRecording(false);
    isRecordingRef.current = false;
    try { browserRecognitionRef.current?.stop(); } catch {}
  };

  const wakeOrb = () => {
    setIsAwake(true);
    isAwakeRef.current = true;
    motionRuntimeRef.current?.wake();
  };

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isAwakeRef.current = isAwake;
  }, [isAwake]);

  useEffect(() => {
    motionRuntimeRef.current?.setHold(isProcessing || isRecording || isSpeaking);
  }, [isProcessing, isRecording, isSpeaking]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    const handleWarmStart = (event: Event) => {
      const permission = String((event as CustomEvent<{ permission?: string }>).detail?.permission || '');
      const granted = permission === 'granted';
      setVoiceInputReady(granted);
      setStatus(granted ? 'Listening...' : permission === 'blocked' ? 'Mic permission needed' : 'Voice output ready.');
      setBubbleText(granted ? 'CALI is listening. Speak naturally.' : permission === 'blocked' ? 'CALI voice is ready. Microphone permission is still needed.' : 'CALI voice is ready.');
      if (granted) {
        shouldListenRef.current = true;
        wakeOrb();
        queueListening(250);
      }
    };
    window.addEventListener('spruked-orb-warm-start', handleWarmStart);
    const warmupStarted = performance.now();
    void OrbService.warmVoice()
      .then((result) => {
        console.info('CALI voice warm-up complete', {
          state: result?.metadata?.warmup_state || result?.status,
          latency_ms: result?.metadata?.warmup_latency_ms ?? Math.round(performance.now() - warmupStarted),
          voice_ready: Boolean(result?.metadata?.voice_ready),
          engine: result?.audio_engine || result?.metadata?.audio_engine,
        });
      })
      .catch((error) => {
        console.warn('CALI voice warm-up failed without blocking startup.', error);
      });
    void OrbService.warmVoiceInput()
      .then((result) => {
        setVoiceInputReady(Boolean(result?.loaded || result?.voice_input_ready || result?.status === 'ok'));
      })
      .catch((error) => {
        setVoiceInputReady(false);
        console.warn('CALI voice-input warm-up failed without blocking startup.', error);
      });
    if (navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          setVoiceInputReady(true);
          stream.getTracks().forEach((track) => track.stop());
          shouldListenRef.current = true;
          queueListening(500);
        })
        .catch((error) => {
          setVoiceInputReady(false);
          console.warn('CALI mic permission was not granted during startup.', error);
        });
    }

    let motionRuntime: MotionRuntime | null = null;
    try {
      motionRuntime = new MotionRuntime((position) => {
        setOrbPosition(position);
      }, (snapshot) => {
        if (!isProcessingRef.current && !isSpeakingRef.current) {
          setPulseColor(getMindColor(snapshot.behavior?.intent || 'observing'));
        }
      });
      motionRuntimeRef.current = motionRuntime;
      motionRuntime.start();
    } catch (error) {
      console.warn('Unified ORB motion runtime failed; holding sleep position.', error);
    }

    const handleWake = () => {
      wakeOrb();
    };
    const handlePointerMove = (event: PointerEvent) => {
      handleWake();
      motionRuntimeRef.current?.handleCursor(event.clientX, event.clientY);
    };
    const primeVoicePlayback = () => {
      void OrbService.primeAudio();
    };
    const handleResize = () => {
      motionRuntimeRef.current?.handleResize();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('click', handleWake, { passive: true });
    window.addEventListener('pointerdown', primeVoicePlayback, { passive: true, once: true });
    window.addEventListener('keydown', primeVoicePlayback, { passive: true, once: true });
    window.addEventListener('touchstart', primeVoicePlayback, { passive: true, once: true });
    window.addEventListener('resize', handleResize);
    wakeOrb();

    return () => {
      motionRuntime?.destroy();
      motionRuntimeRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('click', handleWake);
      window.removeEventListener('pointerdown', primeVoicePlayback);
      window.removeEventListener('keydown', primeVoicePlayback);
      window.removeEventListener('touchstart', primeVoicePlayback);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('spruked-orb-warm-start', handleWarmStart);
      if (listeningRestartTimerRef.current) clearTimeout(listeningRestartTimerRef.current);
      if (bubbleClearTimerRef.current) clearTimeout(bubbleClearTimerRef.current);
      if (browserFinalTimerRef.current) clearTimeout(browserFinalTimerRef.current);
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
      shouldListenRef.current = false;
      try { browserRecognitionRef.current?.abort(); } catch {}
      browserRecognitionRef.current = null;
      browserSpeechActiveRef.current = false;
      tourActiveRef.current = false;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null;
        recorderRef.current.ondataavailable = null;
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      clearRecordingResources();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const runtime = motionRuntimeRef.current;
    if (!runtime) return;
    runtime.loadSpatialTargets(SPRUKED_POINTER_TARGETS.map((target) => ({
      target_id: target.id,
      semantic_locator: target.selector,
      anchor_strategy: 'element_center',
    })));
    runtime.startSpatialAudit();
    return () => runtime.stopSpatialAudit();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    recordSessionObservation({ type: 'path', path: pathname || '/', at: Date.now() });
    let lastScrollBucket = -1;
    const handleObservedClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-orb-target], a, button') : null;
      if (!target || target.closest('[data-orb-interactive="true"]')) return;
      const label = String(
        target.getAttribute('data-orb-target') || target.getAttribute('aria-label') || target.textContent || '',
      ).replace(/\s+/g, ' ').trim().slice(0, 100);
      if (!label) return;
      recordSessionObservation({
        type: 'target',
        path: window.location.pathname,
        label,
        target: target.getAttribute('data-orb-target') || undefined,
        at: Date.now(),
      });
    };
    const handleObservedScroll = () => {
      const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const depth = Math.min(10, Math.floor((window.scrollY / documentHeight) * 10));
      if (depth === lastScrollBucket) return;
      lastScrollBucket = depth;
      recordSessionObservation({ type: 'scroll', path: window.location.pathname, depth, at: Date.now() });
    };
    document.addEventListener('click', handleObservedClick, true);
    window.addEventListener('scroll', handleObservedScroll, { passive: true });
    return () => {
      document.removeEventListener('click', handleObservedClick, true);
      window.removeEventListener('scroll', handleObservedScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const handleGuideEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ targetId?: string; message?: string }>).detail;
      if (detail?.targetId && getPointerTarget(detail.targetId)) {
        setPendingGuide({ targetId: detail.targetId, message: detail.message });
      }
    };
    window.addEventListener(WEBSITE_ORB_GUIDE_EVENT, handleGuideEvent);
    return () => window.removeEventListener(WEBSITE_ORB_GUIDE_EVENT, handleGuideEvent);
  }, []);

  useEffect(() => {
    if (!pendingGuide) return;

    const target = getPointerTarget(pendingGuide.targetId);
    if (!target) {
      setPendingGuide(null);
      return;
    }

    if (pathname !== target.route) {
      setStatus(`Opening ${target.label}...`);
      router.push(target.route);
      return;
    }

    const timeout = window.setTimeout(() => {
      const element = findPointerTargetElement(target);
      if (!element) {
        setStatus(`${target.label} target not verified`);
        setPendingGuide(null);
        setGuide(null);
        return;
      }

      scrollPointerTargetIntoView(element);
      window.setTimeout(() => {
        const verified = findPointerTargetElement(target);
        if (!verified) {
          setStatus(`${target.label} target not verified`);
          setPendingGuide(null);
          setGuide(null);
          return;
        }

        guidePulseRef.current += 1;
        const nextGuide = buildGuideState(target, verified, pendingGuide.message, guidePulseRef.current);
        const lidarCoordinate = motionRuntimeRef.current?.getSpatialCoordinate(target.id);
        if (lidarCoordinate) {
          nextGuide.rect = new DOMRect(
            lidarCoordinate.left,
            lidarCoordinate.top,
            lidarCoordinate.width,
            lidarCoordinate.height,
          );
        }
        setGuide(nextGuide);
        setStatus(nextGuide.message || 'CALI is ready.');
        setStatus(`LiDAR lock: ${target.label}.`);
        setPulseColor('#d946ef');
        motionRuntimeRef.current?.setGuidedTarget(nextGuide.rect);
        setPendingGuide(null);
        window.setTimeout(() => {
          setGuide((current) => {
            if (current?.pulseKey !== nextGuide.pulseKey) return current;
            motionRuntimeRef.current?.clearGuidance(
              isProcessingRef.current || isRecordingRef.current || isSpeakingRef.current,
            );
            return null;
          });
        }, 4600);
      }, 560);
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [pathname, pendingGuide, router]);

  useEffect(() => {
    if (!guide) return;

    const refreshGuide = () => {
      const element = findPointerTargetElement(guide.target);
      if (!element) {
        setGuide(null);
        return;
      }
      const lidarCoordinate = motionRuntimeRef.current?.getSpatialCoordinate(guide.target.id);
      const rect = lidarCoordinate
        ? new DOMRect(lidarCoordinate.left, lidarCoordinate.top, lidarCoordinate.width, lidarCoordinate.height)
        : element.getBoundingClientRect();
      motionRuntimeRef.current?.setGuidedTarget(rect);
      setGuide((current) => (current ? { ...current, rect } : current));
    };

    window.addEventListener('resize', refreshGuide);
    window.addEventListener('scroll', refreshGuide, { passive: true });
    return () => {
      window.removeEventListener('resize', refreshGuide);
      window.removeEventListener('scroll', refreshGuide);
    };
  }, [guide]);

  const getMindColor = (mind: string) => {
    switch (mind.toLowerCase()) {
      case 'cali': return '#ffffff';
      case 'kant': return '#ff5277';
      case 'spinoza': return '#00ffcc';
      case 'hume': return '#ff00aa';
      case 'locke': return '#c084fc';
      case 'deductive': return '#67c6ff';
      case 'inductive': return '#67c6ff';
      case 'intuitive': return '#d946ef';
      case 'tool_router': return '#67c6ff';
      default: return '#c084fc';
    }
  };

  const preferredRecordingMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const transcribeRecording = async (blob: Blob) => {
    if (blob.size < MIN_RECORDING_BYTES || isSpeakingRef.current) {
      queueListening();
      return;
    }

    setIsProcessing(true);
    setStatus('Transcribing...');
    setPulseColor('#67c6ff');
    try {
      const stt = await OrbService.transcribeAudio(blob);
      const text = String(stt?.text || '').trim();
      if (!text) {
        setStatus('No voice input detected');
        queueListening();
        return;
      }
      isProcessingRef.current = false;
      setIsProcessing(false);
      await sendPrompt(text);
    } catch (error) {
      console.warn('CALI voice input failed.', error);
      setStatus('Voice input unavailable');
    } finally {
      setIsProcessing(false);
      queueListening();
    }
  };

  const queueListening = (delay = LISTENING_RESTART_MS) => {
    if (typeof window === 'undefined') return;
    if (listeningRestartTimerRef.current) clearTimeout(listeningRestartTimerRef.current);
    listeningRestartTimerRef.current = setTimeout(() => {
      if (!shouldListenRef.current) return;
      if (isProcessingRef.current || isSpeakingRef.current || isRecordingRef.current) {
        queueListening(1200);
        return;
      }
      void startListening();
    }, delay);
  };

  const startBrowserListening = () => {
    if (typeof window === 'undefined' || browserSpeechAvailableRef.current === false) return false;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      browserSpeechAvailableRef.current = false;
      return false;
    }
    browserSpeechAvailableRef.current = true;

    if (!browserRecognitionRef.current) {
      const recognition = new SpeechRecognitionCtor() as BrowserSpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => {
        browserSpeechActiveRef.current = true;
        setIsRecording(true);
        isRecordingRef.current = true;
        setStatus('Listening...');
        setPulseColor('#67c6ff');
        wakeOrb();
      };
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
          const transcript = String(event.results[index]?.[0]?.transcript || '').trim();
          if (event.results[index]?.isFinal) {
            browserFinalTranscriptRef.current = `${browserFinalTranscriptRef.current} ${transcript}`.trim();
          } else {
            interim = `${interim} ${transcript}`.trim();
          }
        }
        if (interim) setStatus('Listening...');
        const finalText = browserFinalTranscriptRef.current.trim();
        if (finalText) {
          if (browserFinalTimerRef.current) clearTimeout(browserFinalTimerRef.current);
          browserFinalTimerRef.current = setTimeout(() => {
            const prompt = browserFinalTranscriptRef.current.trim();
            browserFinalTranscriptRef.current = '';
            stopBrowserRecognition();
            if (prompt) void sendPrompt(prompt);
          }, 900);
        }
      };
      recognition.onerror = (event: any) => {
        const error = String(event?.error || 'speech recognition failed');
        browserSpeechActiveRef.current = false;
        setIsRecording(false);
        isRecordingRef.current = false;
        if (['not-allowed', 'service-not-allowed', 'network'].includes(error)) {
          browserSpeechAvailableRef.current = false;
          setStatus(error === 'network' ? 'Browser voice unavailable; using microphone fallback.' : 'Mic permission needed');
        }
        console.warn('CALI browser speech recognition failed.', error);
      };
      recognition.onend = () => {
        browserSpeechActiveRef.current = false;
        setIsRecording(false);
        isRecordingRef.current = false;
        if (shouldListenRef.current && !isProcessingRef.current && !isSpeakingRef.current && !browserFinalTranscriptRef.current) {
          queueListening(500);
        }
      };
      browserRecognitionRef.current = recognition;
    }

    if (browserSpeechActiveRef.current || isProcessingRef.current || isSpeakingRef.current) return true;
    try {
      browserRecognitionRef.current.start();
      return true;
    } catch (error) {
      console.warn('CALI browser speech recognition could not start.', error);
      browserSpeechAvailableRef.current = false;
      return false;
    }
  };

  const startListening = async () => {
    if (startBrowserListening()) return;
    await startRecording();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('Voice input unavailable');
      return;
    }
    if (isProcessingRef.current || isSpeakingRef.current || recordingStartPendingRef.current) {
      queueListening(1200);
      return;
    }
    if (recorderRef.current?.state === 'recording') return;

    recordingStartPendingRef.current = true;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!shouldListenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        recordingStartPendingRef.current = false;
        return;
      }
      const mimeType = preferredRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recordingStopRequestedRef.current = false;
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        clearRecordingResources();
        recorderRef.current = null;
        recordingStopRequestedRef.current = false;
        setIsRecording(false);
        isRecordingRef.current = false;

        if (chunks.length === 0) {
          setStatus('No voice input detected');
          queueListening();
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        void transcribeRecording(audioBlob);
      };

      recorder.start();
      recordingStartPendingRef.current = false;
      setVoiceInputReady(true);
      setIsRecording(true);
      isRecordingRef.current = true;
      setStatus('Listening...');
      setPulseColor('#67c6ff');
      wakeOrb();

      let speechDetected = false;
      try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextCtor) {
          const audioContext = new AudioContextCtor();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = audioContext;
          audioSourceRef.current = source;
          if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});

          const samples = new Float32Array(analyser.fftSize);
          audioAnalysisTimerRef.current = setInterval(() => {
            if (recorderRef.current !== recorder || recorder.state !== 'recording') return;
            analyser.getFloatTimeDomainData(samples);
            let sumSquares = 0;
            for (let index = 0; index < samples.length; index += 1) {
              sumSquares += samples[index] * samples[index];
            }
            const rms = Math.sqrt(sumSquares / samples.length);

            if (rms >= SPEECH_ACTIVITY_THRESHOLD) {
              speechDetected = true;
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            } else if (speechDetected && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                stopRecording();
              }, END_OF_SPEECH_SILENCE_MS);
            }
          }, AUDIO_ANALYSIS_INTERVAL_MS);
        }
      } catch (error) {
        console.warn('CALI silence detection unavailable; using manual stop or the recording limit.', error);
      }

      stopRecordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_DURATION_MS);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      clearRecordingResources();
      recorderRef.current = null;
      recordingStartPendingRef.current = false;
      setVoiceInputReady(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      setStatus('Mic permission needed');
      console.warn('CALI mic capture failed.', error);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording' || recordingStopRequestedRef.current) return;

    recordingStopRequestedRef.current = true;
    clearRecordingTimersAndAnalysis();
    try {
      recorder.stop();
    } catch (error) {
      console.warn('CALI recorder stop failed.', error);
      clearRecordingResources();
      recorderRef.current = null;
      recordingStopRequestedRef.current = false;
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const handleClickToTalk = () => {
    void OrbService.primeAudio();
    wakeOrb();
    shouldListenRef.current = true;
    if (recorderRef.current?.state === 'recording') {
      stopRecording();
      return;
    }
    if (browserSpeechActiveRef.current) {
      stopBrowserRecognition();
      return;
    }
    if (!isRecordingRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
      void startListening();
    }
  };

  const finishSiteTour = () => {
    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    tourTimerRef.current = null;
    tourActiveRef.current = false;
    setGuide(null);
    setStatus('CALI is listening.');
    shouldListenRef.current = true;
    queueListening(500);
  };

  const runSiteTour = () => {
    if (tourActiveRef.current) return;
    tourActiveRef.current = true;
    tourIndexRef.current = 0;
    shouldListenRef.current = false;
    if (listeningRestartTimerRef.current) clearTimeout(listeningRestartTimerRef.current);
    if (browserSpeechActiveRef.current) stopBrowserRecognition();
    if (recorderRef.current?.state === 'recording') stopRecording();

    const visitNext = () => {
      const targetId = SITE_TOUR_TARGET_IDS[tourIndexRef.current];
      const target = getPointerTarget(targetId);
      if (!target) {
        tourIndexRef.current += 1;
        if (tourIndexRef.current < SITE_TOUR_TARGET_IDS.length) visitNext();
        else finishSiteTour();
        return;
      }
      const tourText = `${target.label}. ${target.description}`;
      showSpeechBubble(tourText);
      setPendingGuide({ targetId: target.id, message: tourText });
      setStatus(`Tour stop: ${target.label}`);
      setPulseColor('#d946ef');
      void OrbService.speak(tourText, (active, meta = {}) => {
        setIsSpeaking(active);
        isSpeakingRef.current = active;
        if (meta.text) showSpeechBubble(meta.text);
      }).catch((error) => console.warn('CALI site tour speech failed.', error));
      tourIndexRef.current += 1;
      tourTimerRef.current = setTimeout(() => {
        if (tourIndexRef.current >= SITE_TOUR_TARGET_IDS.length) finishSiteTour();
        else visitNext();
      }, 5200);
    };

    wakeOrb();
    visitNext();
  };

  const sendPrompt = async (userText: string) => {
    const trimmed = String(userText || '').trim();
    if (!trimmed || isProcessingRef.current) return;

    if (/\b(site tour|tour the site|show me around|walk me through the site|give me a tour)\b/i.test(trimmed)) {
      runSiteTour();
      return;
    }

    setIsProcessing(true);
    isProcessingRef.current = true;
    setStatus('Transmitting...');
    setPulseColor('white');
    wakeOrb();

    try {
      const response = await OrbService.sendMessage(trimmed, (color: string, mind: string) => {
        setPulseColor(getMindColor(mind) || color);
        setStatus('Processing...');
      }, {
        speak: true,
        onResponseReady: (data) => {
          const target = resolvePointerTarget(trimmed, data);
          if (target) {
            setPendingGuide({ targetId: target.id, message: target.description });
          }
        },
        onVoicePlaybackState: (active: boolean, meta: { text?: string } = {}) => {
          setIsSpeaking(active);
          isSpeakingRef.current = active;
          if (meta?.text) {
            showSpeechBubble(String(meta.text));
          }
          if (active) {
            wakeOrb();
          } else {
            clearSpeechBubbleSoon();
            queueListening(500);
          }
        },
      });

      setStatus('Response ready.');
      setPulseColor(getMindColor(String(response?.metadata?.leading_mind || 'cali')));
    } catch (err) {
      console.error(err);
      setStatus('Connection failed');
      setPulseColor('red');
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };
  if (!isMounted) return null;

  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const bubbleWidth = Math.min(320, Math.max(220, viewportWidth - VIEWPORT_PADDING * 2));
  const bubbleOnLeft = orbPosition.x + ORB_SIZE / 2 > viewportWidth / 2;
  const preferredBubbleLeft = bubbleOnLeft
    ? orbPosition.x - 12 - bubbleWidth
    : orbPosition.x + ORB_SIZE + 12;
  const bubbleLeft = Math.min(
    viewportWidth - bubbleWidth - VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, preferredBubbleLeft),
  );
  const bubbleTop = Math.min(
    viewportHeight - 116,
    Math.max(VIEWPORT_PADDING, orbPosition.y + ORB_SIZE * 0.2),
  );

  return (
    <>
      {guide && (
        <div className="pointer-events-none fixed inset-0 z-[9998]" aria-hidden="true">
          <div
            key={guide.pulseKey}
            data-orb-lidar="locked"
            className="fixed rounded-lg border-2 border-fuchsia-300 shadow-[0_0_0_9999px_rgba(7,10,15,0.18),0_0_34px_rgba(217,70,239,0.48),inset_0_0_20px_rgba(217,70,239,0.2)]"
            style={{
              top: Math.max(8, guide.rect.top - 8),
              left: Math.max(8, guide.rect.left - 8),
              width: Math.max(32, guide.rect.width + 16),
              height: Math.max(32, guide.rect.height + 16),
              animation: 'website-orb-target-ping 1.18s ease-out 2',
            }}
          ></div>
          <div
            className="fixed rounded-md border border-fuchsia-300/80 bg-[#1b0b26]/90 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100 shadow-[0_0_16px_rgba(217,70,239,0.38)]"
            style={{
              top: Math.max(8, guide.rect.top - 34),
              left: Math.max(8, guide.rect.left - 8),
            }}
          >
            LiDAR lock · {guide.target.label}
          </div>
        </div>
      )}

      {bubbleText && (
        <div
          className="fixed top-0 z-[10000] overflow-hidden rounded-2xl border border-gray-800 bg-black/80 px-4 py-3 text-sm leading-relaxed text-gray-100 shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl pointer-events-auto transition-[left,top] duration-[1800ms] ease-in-out"
          aria-live="polite"
          aria-label="CALI voice conversation"
          style={{
            borderColor: `${pulseColor}4d`,
            left: `${bubbleLeft}px`,
            top: `${bubbleTop}px`,
            width: `${bubbleWidth}px`,
            maxHeight: 'none',
            maxWidth: 'min(560px, calc(100vw - 40px))',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {bubbleText}
        </div>
      )}

      <div
        className="pointer-events-none fixed left-0 top-0 z-[9999] transition-transform duration-[6200ms] ease-in-out"
        style={{
          width: `${ORB_SIZE}px`,
          height: `${ORB_SIZE}px`,
          transform: `translate3d(${orbPosition.x}px, ${orbPosition.y}px, 0)`,
        }}
      >
      <div
        className="pointer-events-auto relative h-full w-full cursor-pointer touch-manipulation"
        role="button"
        aria-label="CALI voice presence. Speak naturally; click only as a fallback."
        data-orb-interactive="true"
        title="Speak naturally to CALI. Click only as a fallback."
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          handleClickToTalk();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClickToTalk();
          }
        }}
      >
        <div
          aria-hidden="true"
          className="relative flex h-full w-full items-center justify-center rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${ORB_SIZE}px`,
            height: `${ORB_SIZE}px`,
            opacity: isAwake ? 1 : 0.2,
            transform: `scale(${isAwake ? 1 : 0.78})`,
            filter: `saturate(${isAwake ? 1.1 : 0.4})`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-[-18%] z-0 rounded-full border border-sky-300/55 opacity-90"
            style={{
              boxShadow: '0 0 14px rgba(88,205,255,0.24), inset 0 0 12px rgba(88,205,255,0.12)',
              animation: 'orb-orbit-spin 12s linear infinite',
            }}
          >
            {[0, 120, 240].map((angle) => (
              <span
                key={angle}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-sky-200 shadow-[0_0_8px_rgba(125,220,255,0.92)]"
                style={{
                  animation: 'orb-node-pulse 1.8s ease-in-out infinite',
                  animationDelay: `${angle / 360}s`,
                  transform: `rotate(${angle}deg) translateX(${ORB_SIZE * 0.72}px) translate(-50%, -50%)`,
                }}
              ></span>
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-[-27%] z-0 rounded-full border border-sky-400/30"
            style={{
              boxShadow: '0 0 22px rgba(68,190,255,0.12)',
              animation: 'orb-orbit-spin-reverse 18s linear infinite',
            }}
          ></div>
          <div
            className="absolute inset-[7%] z-10 rounded-full mix-blend-screen transition-all duration-700"
            style={{
              boxShadow: `0 0 ${isAwake ? '18px' : '10px'} ${pulseColor}`,
            }}
          ></div>

          <img
            src={ORB_IMAGE_SRC}
            alt="CALI Website ORB"
            aria-hidden="true"
            draggable={false}
            className="relative z-20 h-full w-full select-none object-contain"
            style={{
              filter: isSpeaking
                ? 'drop-shadow(0 0 16px rgba(76,220,255,0.48)) drop-shadow(0 0 24px rgba(111,231,255,0.16))'
                : 'drop-shadow(0 0 14px rgba(88,205,255,0.28))',
            }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full mix-blend-screen">
            <div
              className={`absolute inset-[7%] rounded-full blur-[8px] transition-opacity duration-300 ${isSpeaking ? 'opacity-[0.94]' : 'opacity-0'}`}
              style={{
                background:
                  'radial-gradient(circle, rgba(181,249,255,0.96) 0%, rgba(58,196,255,0.42) 42%, rgba(58,196,255,0) 72%)',
                animation: isSpeaking ? 'orb-voice-pulse 620ms infinite ease-in-out' : undefined,
              }}
            ></div>
            <div
              className={`absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[4px] transition-opacity duration-500 ${isRecording || isProcessing || isSpeaking ? 'opacity-45' : 'opacity-20'}`}
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(255,255,255,0.86), rgba(66,190,255,0.18), rgba(255,255,255,0.74), rgba(35,128,255,0.1), rgba(255,255,255,0.86))',
                animation: 'orb-core-swirl 4.2s linear infinite',
              }}
            ></div>
          </div>
          <img
            src={ORB_IMAGE_SRC}
            alt="CALI Website ORB lens overlay"
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 z-40 h-full w-full select-none object-contain"
            style={{
              maskImage: 'radial-gradient(circle at center, transparent 0 15%, black 16%)',
              WebkitMaskImage: 'radial-gradient(circle at center, transparent 0 15%, black 16%)',
            }}
          />
        </div>
      </div>
      </div>
    </>
  );
}
