'use client';

import { useState, useEffect, useRef } from 'react';
import { OrbService } from '@/Orb_Assistant/api/OrbService';

const IDLE_TIMEOUT_MS = 300000;
const DRIFT_MIN_MS = 5000;
const DRIFT_MAX_MS = 9000;
const ORB_SIZE = 106;
const CURSOR_AVOID_RADIUS = 120;
const EVADE_COOLDOWN_MS = 240;
const EVADE_DISTANCE = 165;
const VIEWPORT_PADDING = 20;
const DRIFT_MAX_HEIGHT_RATIO = 0.58;

export default function GlobalOrb() {
  const [pulseColor, setPulseColor] = useState('white');
  const [status, setStatus] = useState('Awaiting epistemic stimulus...');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bubbleText, setBubbleText] = useState('Click the orb and speak.');
  const [isAwake, setIsAwake] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const orbPositionRef = useRef({ x: 0, y: 0 });
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const isAwakeRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const sendPromptRef = useRef<(text: string) => Promise<void> | void>(() => {});
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const driftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const evadeCooldownRef = useRef(0);

  const sleepPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const orbSize = ORB_SIZE + 14;
    const x = Math.max(VIEWPORT_PADDING, window.innerWidth - orbSize - VIEWPORT_PADDING);
    return { x, y: VIEWPORT_PADDING };
  };

  const pickWaypoint = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const orbSize = ORB_SIZE + 14;
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - orbSize - VIEWPORT_PADDING);
    const maxY = Math.max(
      VIEWPORT_PADDING,
      Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - orbSize,
    );
    const x = Math.floor(VIEWPORT_PADDING + Math.random() * (maxX - VIEWPORT_PADDING));
    const y = Math.floor(VIEWPORT_PADDING + Math.random() * (maxY - VIEWPORT_PADDING));
    return { x, y };
  };

  const clampPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const orbSize = ORB_SIZE + 14;
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - orbSize - VIEWPORT_PADDING);
    const maxY = Math.max(
      VIEWPORT_PADDING,
      Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - orbSize,
    );
    return {
      x: Math.min(maxX, Math.max(VIEWPORT_PADDING, x)),
      y: Math.min(maxY, Math.max(VIEWPORT_PADDING, y)),
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
      if (isProcessingRef.current || isListeningRef.current || isSpeakingRef.current) {
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
      setShowSettings(false);
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
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isAwakeRef.current = isAwake;
  }, [isAwake]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    setOrbPosition(sleepPosition());

    const handleWake = (event: MouseEvent) => {
      wakeOrb();
      maybeEvadeCursor(event.clientX, event.clientY);
    };
    const handleResize = () => {
      setOrbPosition((prev) => {
        const orbSize = ORB_SIZE + 14;
        const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - orbSize - VIEWPORT_PADDING);
        const maxY = Math.max(
          VIEWPORT_PADDING,
          Math.floor(window.innerHeight * DRIFT_MAX_HEIGHT_RATIO) - orbSize,
        );
        return {
          x: Math.min(maxX, Math.max(VIEWPORT_PADDING, prev.x)),
          y: Math.min(maxY, Math.max(VIEWPORT_PADDING, prev.y)),
        };
      });
    };

    window.addEventListener('mousemove', handleWake, { passive: true });
    window.addEventListener('click', handleWake, { passive: true });
    window.addEventListener('resize', handleResize);
    wakeOrb();
    queueNextDrift();

    return () => {
      window.removeEventListener('mousemove', handleWake);
      window.removeEventListener('click', handleWake);
      window.removeEventListener('resize', handleResize);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
    };
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const RecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const phrase = event.results[i]?.[0]?.transcript || '';
        if (event.results[i]?.isFinal) {
          finalText += phrase;
        } else {
          interim += phrase;
        }
      }

      const interimTrimmed = interim.trim();
      if (interimTrimmed) {
        setStatus('Listening...');
        wakeOrb();
      }

      const finalTrimmed = finalText.trim();
      if (finalTrimmed && !isProcessingRef.current) {
        try {
          recognition.stop();
        } catch {}
        setIsListening(false);
        void sendPromptRef.current(finalTrimmed);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus('Speech recognition error');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isProcessingRef.current) {
        setStatus('Voice recognition idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

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

  const startListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      setStatus('Speech recognition unavailable in this browser.');
      return;
    }
    if (isProcessingRef.current) {
      setStatus('Wait for current response.');
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setStatus('Listening...');
      wakeOrb();
    } catch {
      setStatus('Unable to start speech recognition');
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setIsListening(false);
    setStatus('Voice recognition paused');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  const sendPrompt = async (userText: string) => {
    const trimmed = String(userText || '').trim();
    if (!trimmed || isProcessingRef.current) return;

    setIsProcessing(true);
    setStatus('Transmitting...');
    setPulseColor('white');
    wakeOrb();

    try {
      const response = await OrbService.sendMessage(trimmed, (color: string, mind: string) => {
        setPulseColor(getMindColor(mind) || color);
        setStatus('Processing...');
      }, {
        speak: voiceEnabled,
        onSpeechState: (active: boolean, meta: { text?: string } = {}) => {
          setIsSpeaking(active);
          if (meta?.text) {
            setBubbleText(String(meta.text));
          }
          if (active) {
            wakeOrb();
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
    }
  };
  sendPromptRef.current = sendPrompt;

  if (!isMounted) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] flex items-start gap-3 pointer-events-none transition-transform duration-[5200ms] ease-in-out"
      style={{ transform: `translate3d(${orbPosition.x}px, ${orbPosition.y}px, 0)` }}
    >
      {isSpeaking && (
        <div
          className="hidden sm:block max-w-[360px] rounded-2xl border border-gray-800 bg-black/80 px-4 py-3 text-sm leading-relaxed text-gray-100 shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          style={{ borderColor: `${pulseColor}4d` }}
        >
          {bubbleText}
        </div>
      )}

      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={toggleListening}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            wakeOrb();
            setShowSettings((value) => !value);
          }}
          onMouseEnter={wakeOrb}
          aria-label={isListening ? 'Stop listening' : 'Start voice listening'}
          className="relative flex items-center justify-center rounded-full transition-all duration-500 ease-out"
          style={{
            width: '106px',
            height: '106px',
            opacity: isAwake ? 1 : 0.2,
            transform: `scale(${isAwake ? 1 : 0.78})`,
            filter: `saturate(${isAwake ? 1.1 : 0.4})`,
          }}
          title={isListening ? 'Listening' : 'Click to wake and speak'}
        >
          <div
            className="absolute h-full w-full rounded-full mix-blend-screen transition-all duration-700"
            style={{
              boxShadow: `0 0 ${isAwake ? '44px' : '18px'} ${pulseColor}`,
              animation: isAwake ? 'pulse 1.5s infinite ease-in-out' : 'pulse 4s infinite ease-in-out',
            }}
          ></div>

          <div className="relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/20 bg-black/80 backdrop-blur-md">
            <div
              className={`absolute h-[42px] w-[42px] rounded-full blur-[4px] ${isListening || isProcessing || isSpeaking ? 'animate-ping opacity-70' : 'opacity-30'}`}
              style={{ backgroundColor: pulseColor }}
            ></div>
            <div className="h-3 w-3 rounded-full bg-white shadow-[0_0_16px_white]"></div>
          </div>
        </button>

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
    </div>
  );
}
