'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OrbService } from '@/Orb_Assistant/api/OrbService';
import { SprukedOrb } from '@/lib/orbital_behavior_skg';
import {
  WEBSITE_ORB_GUIDE_EVENT,
  buildGuideState,
  findPointerTargetElement,
  getPointerTarget,
  resolvePointerTarget,
  scrollPointerTargetIntoView,
  type WebsiteOrbGuideState,
} from '@/lib/website-orb/pointer-runtime';

const IDLE_TIMEOUT_MS = 300000;
const LISTENING_SEGMENT_MS = 5200;
const LISTENING_RESTART_MS = 700;
const MIN_RECORDING_BYTES = 1200;
const DRIFT_MIN_MS = 5000;
const DRIFT_MAX_MS = 9000;
const ORB_SIZE = 168;
const ORB_HALO = Math.ceil(ORB_SIZE * 0.3);
const CURSOR_AVOID_RADIUS = 120;
const EVADE_COOLDOWN_MS = 240;
const EVADE_DISTANCE = 165;
const VIEWPORT_PADDING = 20;
const DRIFT_MAX_HEIGHT_RATIO = 0.86;
const ORB_IMAGE_SRC = '/assets/redorbbluecenter1600.png';

export default function GlobalOrb() {
  const pathname = usePathname();
  const router = useRouter();
  const [pulseColor, setPulseColor] = useState('white');
  const [status, setStatus] = useState('Awaiting epistemic stimulus...');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInputReady, setVoiceInputReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bubbleText, setBubbleText] = useState('CALI is ready.');
  const [isAwake, setIsAwake] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [guide, setGuide] = useState<WebsiteOrbGuideState | null>(null);
  const [pendingGuide, setPendingGuide] = useState<{ targetId: string; message?: string } | null>(null);
  const orbPositionRef = useRef({ x: 0, y: 0 });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);
  const isAwakeRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const driftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listeningRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const evadeCooldownRef = useRef(0);
  const guidePulseRef = useRef(0);

  const sleepPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const minX = VIEWPORT_PADDING + ORB_HALO;
    const minY = VIEWPORT_PADDING + ORB_HALO;
    const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    return { x: maxX, y: minY };
  };

  const pickWaypoint = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const minX = VIEWPORT_PADDING + ORB_HALO;
    const minY = VIEWPORT_PADDING + ORB_HALO;
    const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    const maxY = Math.max(
      minY,
      Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO,
    );
    const x = Math.floor(minX + Math.random() * (maxX - minX));
    const y = Math.floor(minY + Math.random() * (maxY - minY));
    return { x, y };
  };

  const clampPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const minX = VIEWPORT_PADDING + ORB_HALO;
    const minY = VIEWPORT_PADDING + ORB_HALO;
    const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    const maxY = Math.max(
      minY,
      Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO,
    );
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  };

  const clampViewportPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const minX = VIEWPORT_PADDING + ORB_HALO;
    const minY = VIEWPORT_PADDING + ORB_HALO;
    const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    const maxY = Math.max(minY, window.innerHeight - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
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
    const next = clampPosition(targetX, targetY);

    evadeCooldownRef.current = now;
    setOrbPosition(next);
    wakeOrb();
    queueNextDrift();
  };

  const queueNextDrift = () => {
    if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
    const delay = DRIFT_MIN_MS + Math.floor(Math.random() * (DRIFT_MAX_MS - DRIFT_MIN_MS));
    driftTimerRef.current = setTimeout(() => {
      if (isProcessingRef.current || isRecordingRef.current || isSpeakingRef.current) {
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

  const wakeOrb = () => {
    setIsAwake(true);
    isAwakeRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isAwakeRef.current = false;
      setIsAwake(false);
      setOrbPosition(sleepPosition());
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    orbPositionRef.current = orbPosition;
  }, [orbPosition]);

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
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    setOrbPosition(sleepPosition());
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

    let behaviorOrb: SprukedOrb | null = null;
    try {
      behaviorOrb = new SprukedOrb((snapshot) => {
        const next = clampPosition(snapshot.position.x, snapshot.position.y);
        orbPositionRef.current = next;
        setOrbPosition(next);
        if (!isProcessingRef.current && !isSpeakingRef.current) {
          setPulseColor(getMindColor(snapshot.intent));
        }
      });
      behaviorOrb.start();
    } catch (error) {
      console.warn('Spruked ORB motion governor failed; holding sleep position.', error);
    }

    const handleWake = () => {
      wakeOrb();
    };
    const primeVoicePlayback = () => {
      void OrbService.primeAudio();
    };
    const handleResize = () => {
      setOrbPosition((prev) => {
        const minX = VIEWPORT_PADDING + ORB_HALO;
        const minY = VIEWPORT_PADDING + ORB_HALO;
        const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
        const maxY = Math.max(
          minY,
          Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO,
        );
        return {
          x: Math.min(maxX, Math.max(minX, prev.x)),
          y: Math.min(maxY, Math.max(minY, prev.y)),
        };
      });
    };

    window.addEventListener('mousemove', handleWake, { passive: true });
    window.addEventListener('click', handleWake, { passive: true });
    window.addEventListener('pointerdown', primeVoicePlayback, { passive: true, once: true });
    window.addEventListener('keydown', primeVoicePlayback, { passive: true, once: true });
    window.addEventListener('touchstart', primeVoicePlayback, { passive: true, once: true });
    window.addEventListener('resize', handleResize);
    wakeOrb();

    return () => {
      behaviorOrb?.destroy();
      window.removeEventListener('mousemove', handleWake);
      window.removeEventListener('click', handleWake);
      window.removeEventListener('pointerdown', primeVoicePlayback);
      window.removeEventListener('keydown', primeVoicePlayback);
      window.removeEventListener('touchstart', primeVoicePlayback);
      window.removeEventListener('resize', handleResize);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
      if (listeningRestartTimerRef.current) clearTimeout(listeningRestartTimerRef.current);
      if (stopRecordingTimerRef.current) clearTimeout(stopRecordingTimerRef.current);
      shouldListenRef.current = false;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
        setGuide(nextGuide);
        setBubbleText(nextGuide.message);
        setStatus(`Pointing to ${target.label}.`);
        setPulseColor('#fbbf24');
        setOrbPosition(() => {
          const size = ORB_SIZE;
          const rightSide = nextGuide.rect.right + 22;
          const leftSide = nextGuide.rect.left - size - 22;
          const x = rightSide + size < window.innerWidth ? rightSide : leftSide;
          const y = nextGuide.rect.top + nextGuide.rect.height / 2 - size / 2;
          const next = clampViewportPosition(x, y);
          orbPositionRef.current = next;
          return next;
        });
        setPendingGuide(null);
        window.setTimeout(() => {
          setGuide((current) => (current?.pulseKey === nextGuide.pulseKey ? null : current));
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
      setGuide((current) => (current ? { ...current, rect: element.getBoundingClientRect() } : current));
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
      case 'kant': return '#b4ff00';
      case 'spinoza': return '#00ffcc';
      case 'hume': return '#ff00aa';
      case 'locke': return '#ffaa00';
      case 'deductive': return '#67c6ff';
      case 'inductive': return '#63e6a6';
      case 'intuitive': return '#f5c96a';
      case 'kaygee': return '#63e6a6';
      case 'tool_router': return '#67c6ff';
      default: return '#b4ff00';
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
      void startRecording();
    }, delay);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('Voice input unavailable');
      return;
    }
    if (isProcessingRef.current || isSpeakingRef.current) {
      queueListening(1200);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = preferredRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
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
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);

        if (chunks.length === 0) {
          setStatus('No voice input detected');
          queueListening();
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        void transcribeRecording(audioBlob);
      };

      recorder.start();
      setVoiceInputReady(true);
      setIsRecording(true);
      setStatus('Listening...');
      setPulseColor('#63e6a6');
      wakeOrb();
      if (stopRecordingTimerRef.current) clearTimeout(stopRecordingTimerRef.current);
      stopRecordingTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, LISTENING_SEGMENT_MS);
    } catch (error) {
      setVoiceInputReady(false);
      setStatus('Mic permission needed');
      console.warn('CALI mic capture failed.', error);
    }
  };

  const stopRecording = () => {
    if (stopRecordingTimerRef.current) {
      clearTimeout(stopRecordingTimerRef.current);
      stopRecordingTimerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch (error) {
      console.warn('CALI recorder stop failed.', error);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recorderRef.current = null;
      setIsRecording(false);
    }
  };

  const handleClickToTalk = () => {
    void OrbService.primeAudio();
    wakeOrb();
    shouldListenRef.current = true;
    if (!isRecordingRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
      void startRecording();
    }
  };

  const sendPrompt = async (userText: string) => {
    const trimmed = String(userText || '').trim();
    if (!trimmed || isProcessingRef.current) return;

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
          if (meta?.text) {
            setBubbleText(String(meta.text));
          }
          if (active) {
            wakeOrb();
          } else {
            queueListening(500);
          }
        },
      });

      const msgText = String(response?.response || response?.text || 'No response text available.');
      setBubbleText(msgText);
      setStatus('Response ready.');
      setPulseColor(getMindColor(String(response?.metadata?.leading_mind || 'cali')));
    } catch (err) {
      console.error(err);
      const failure = 'Connection failed. Provider unavailable or offline.';
      setBubbleText(failure);
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
            className="fixed rounded-lg border-2 border-amber-300 shadow-[0_0_0_9999px_rgba(7,10,15,0.18),0_0_34px_rgba(251,191,36,0.42),inset_0_0_20px_rgba(251,191,36,0.16)]"
            style={{
              top: Math.max(8, guide.rect.top - 8),
              left: Math.max(8, guide.rect.left - 8),
              width: Math.max(32, guide.rect.width + 16),
              height: Math.max(32, guide.rect.height + 16),
              animation: 'website-orb-target-ping 1.18s ease-out 2',
            }}
          ></div>
        </div>
      )}

      {isSpeaking && bubbleText && (
        <div
          className="fixed top-0 z-[10000] max-h-[min(220px,calc(100vh-40px))] overflow-auto rounded-2xl border border-gray-800 bg-black/80 px-4 py-3 text-sm leading-relaxed text-gray-100 shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl pointer-events-auto transition-[left,top] duration-[1800ms] ease-in-out"
          style={{
            borderColor: `${pulseColor}4d`,
            left: `${bubbleLeft}px`,
            top: `${bubbleTop}px`,
            width: `${bubbleWidth}px`,
          }}
        >
          {bubbleText}
        </div>
      )}

      <div
        className="pointer-events-none fixed left-0 top-0 z-[9999] transition-transform duration-[1800ms] ease-in-out"
        style={{
          width: `${ORB_SIZE}px`,
          height: `${ORB_SIZE}px`,
          transform: `translate3d(${orbPosition.x}px, ${orbPosition.y}px, 0)`,
        }}
      >
      <div
        className="pointer-events-auto relative h-full w-full"
        role="button"
        aria-label="CALI voice presence"
        tabIndex={0}
        onClick={handleClickToTalk}
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
              boxShadow: '0 0 22px rgba(88,205,255,0.42), inset 0 0 18px rgba(88,205,255,0.2)',
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
              boxShadow: '0 0 36px rgba(68,190,255,0.22)',
              animation: 'orb-orbit-spin-reverse 18s linear infinite',
            }}
          ></div>
          <div
            className="absolute inset-[7%] z-10 rounded-full mix-blend-screen transition-all duration-700"
            style={{
              boxShadow: isSpeaking
                ? '0 0 28px rgba(100,255,118,0.62), 0 0 58px rgba(58,196,255,0.45)'
                : `0 0 ${isAwake ? '42px' : '18px'} ${pulseColor}`,
              animation: isAwake ? 'pulse 1.8s infinite ease-in-out' : 'pulse 4s infinite ease-in-out',
            }}
          ></div>

          <img
            src={ORB_IMAGE_SRC}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="relative z-20 h-full w-full select-none object-contain"
            style={{
              filter: isSpeaking
                ? 'drop-shadow(0 0 22px rgba(76,220,255,0.72)) drop-shadow(0 0 34px rgba(95,255,106,0.24))'
                : 'drop-shadow(0 0 20px rgba(88,205,255,0.46))',
            }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full mix-blend-screen">
            <div
              className={`absolute inset-[7%] rounded-full blur-[8px] transition-opacity duration-300 ${isSpeaking ? 'opacity-[0.94]' : 'opacity-0'}`}
              style={{
                background:
                  'radial-gradient(circle, rgba(99,255,106,0.94) 0%, rgba(99,255,106,0.32) 42%, rgba(99,255,106,0) 72%)',
                animation: isSpeaking ? 'pulse 720ms infinite ease-in-out' : undefined,
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
        </div>
      </div>
      </div>
    </>
  );
}
