'use client';

import { useState, useEffect, useRef } from 'react';
import { OrbService } from '@/Orb_Assistant/api/OrbService';
import { MotionGovernor } from '@/lib/orbital_behavior_skg/core/MotionGovernor';
import type { OrbSnapshot } from '@/lib/orbital_behavior_skg/core/types';

type LogEntry = { id: string; mind: string; conf: number; text: string };

export default function GlobalOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [pulseColor, setPulseColor] = useState('white');
  const [status, setStatus] = useState('Awaiting epistemic stimulus...');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDesktopShell, setIsDesktopShell] = useState(false);
  const [meshState, setMeshState] = useState('Mesh link pending');
  const [showBackComms, setShowBackComms] = useState(false);

  const [heardText, setHeardText] = useState('');
  const [bubbleText, setBubbleText] = useState('Click the orb and speak.');
  const [bubbleMind, setBubbleMind] = useState('CALI');
  const [bubbleConfidence, setBubbleConfidence] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);

  const orbRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  const governorRef = useRef<MotionGovernor | null>(null);
  const isIdle = useRef(false);
  const lastVisualSync = useRef(0);
  const [isMounted, setIsMounted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const sendPromptRef = useRef<(text: string) => Promise<void> | void>(() => {});

  const [isVivid, setIsVivid] = useState(false);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === 'undefined') return;
    setIsDesktopShell(Boolean((window as any)?.electronAPI));

    const updateFromGovernor = (snapshot: OrbSnapshot) => {
      if (!isOpenRef.current && orbRef.current) {
        orbRef.current.style.transform = `translate3d(${snapshot.position.x}px, ${snapshot.position.y}px, 0)`;
      }

      const now = Date.now();
      if (now - lastVisualSync.current < 120) return;
      lastVisualSync.current = now;

      isIdle.current = snapshot.isIdle;
      const vivid = !snapshot.isIdle || snapshot.intent === 'offering' || snapshot.intent === 'curious' || snapshot.intent === 'alert';
      const nextColor = governorRef.current?.getIntentColor() || 'white';
      setIsVivid(vivid);
      setPulseColor((prev) => (prev === nextColor ? prev : nextColor));
    };

    const governor = new MotionGovernor({
      siteId: 'spruked',
      onState: updateFromGovernor,
    });
    governorRef.current = governor;
    governor.start();

    return () => {
      governor.destroy();
      governorRef.current = null;
    };
  }, []);

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
        setHeardText(interimTrimmed);
        setStatus('Listening...');
      }

      const finalTrimmed = finalText.trim();
      if (finalTrimmed && !isProcessingRef.current) {
        setHeardText(finalTrimmed);
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

  useEffect(() => {
    isOpenRef.current = isOpen;
    governorRef.current?.setPaused(isOpen);
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;

    OrbService.getStatus()
      .then((snapshot: any) => {
        if (cancelled) return;
        const instanceId = snapshot?.orb_status?.instance_id || 'web';
        const meshRoot = snapshot?.mesh?.mesh_root || snapshot?.orb_status?.shared_mesh_root || null;
        setStatus(`Website orb linked as ${String(instanceId).toUpperCase()}.`);
        setMeshState(meshRoot ? 'Mesh linked' : 'Mesh offline');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('Website orb online, mesh still resolving...');
        setMeshState('Mesh resolving');
        console.error(error);
      });

    return () => {
      cancelled = true;
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

  const appendSystemLog = (mind: string, conf: number, text: string) => {
    setLog((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        mind,
        conf,
        text,
      },
    ]);
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
    appendSystemLog('user', 1, trimmed);

    try {
      const response = await OrbService.sendMessage(trimmed, (color: string, mind: string) => {
        setPulseColor(getMindColor(mind) || color);
        setStatus('Processing...');
      }, { speak: voiceEnabled });

      const responseMind = String(response?.metadata?.leading_mind || response?.metadata?.provider || 'cali');
      const confidence = Number(response?.metadata?.confidence || 0);
      const msgText = String(response?.response || response?.text || 'No response text available.');

      appendSystemLog(responseMind, confidence, msgText);
      setBubbleMind(responseMind.toUpperCase());
      setBubbleConfidence(confidence);
      setBubbleText(msgText);
      setMeshState('Mesh linked');
      setStatus('Response ready.');
      setPulseColor(getMindColor(responseMind));
    } catch (err) {
      console.error(err);
      const failure = 'Connection failed. Provider unavailable or offline.';
      appendSystemLog('system', 0, failure);
      setBubbleMind('SYSTEM');
      setBubbleConfidence(0);
      setBubbleText(failure);
      setStatus('Connection failed');
      setMeshState('Mesh unavailable');
      setPulseColor('red');
    } finally {
      setIsProcessing(false);
    }
  };
  sendPromptRef.current = sendPrompt;

  const dockToTrayStation = async () => {
    if (typeof window === 'undefined') return;

    const electronApi = (window as any)?.electronAPI;
    if (!electronApi?.setOrbState) {
      setStatus('Tray docking is available in desktop shell mode.');
      appendSystemLog('system', 1, 'Browser runtime detected. Tray docking is delegated to desktop Orb shell.');
      return;
    }

    try {
      await electronApi.setOrbState('browser_access', false);
      await electronApi.setOrbState('desktop_access', true);
      if (electronApi.minimizeWindow) {
        await electronApi.minimizeWindow();
      }
      setStatus('Docking station linked through system tray.');
      appendSystemLog('system', 1, 'Tray dock connected. Orb-first mode remains active.');
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      setStatus('Tray docking command failed.');
      appendSystemLog('system', 1, 'Tray docking command failed. Check desktop shell bridge.');
    }
  };

  const openDockingStation = () => {
    if (typeof window === 'undefined') return;

    const electronApi = (window as any)?.electronAPI;
    if (electronApi?.openSettings) {
      electronApi.openSettings();
      setStatus('Docking station opened via desktop shell.');
      appendSystemLog('system', 1, 'Desktop docking station command sent.');
      return;
    }

    window.open('/orb', '_blank', 'noopener,noreferrer');
    setStatus('Opened docking station preview in new tab.');
    appendSystemLog('system', 1, 'Web preview opened. Full tray docking is available in desktop shell.');
  };

  const openAndStartVoice = () => {
    setIsOpen(true);
    setTimeout(() => {
      startListening();
    }, 80);
  };

  if (!isMounted) return null;

  return (
    <>
      {!isOpen && (
        <div
          ref={orbRef}
          className="fixed left-0 top-0 z-[9999] pointer-events-none will-change-transform"
        >
          <button
            onClick={openAndStartVoice}
            onMouseEnter={() => setIsVivid(true)}
            onMouseLeave={() => setIsVivid(!isIdle.current)}
            className="pointer-events-auto flex items-center justify-center relative cursor-crosshair group transition-all duration-[800ms] ease-out"
            style={{
              width: '128px',
              height: '128px',
              opacity: isVivid ? 1 : 0.35,
              transform: `scale(${isVivid ? 1.05 : 0.9})`,
              filter: `saturate(${isVivid ? 1.3 : 0.4})`,
            }}
          >
            <div
              className="w-full h-full rounded-full absolute mix-blend-screen transition-all duration-1000 will-change-transform"
              style={{
                boxShadow: `0 0 ${isVivid ? '50px' : '20px'} ${pulseColor}`,
                animation: isVivid ? 'pulse 1.5s infinite ease-in-out' : 'pulse 4s infinite ease-in-out',
                opacity: isIdle.current ? 0.3 : 0.8,
              }}
            ></div>

            <div className="w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full border border-white/20 bg-black/80 flex items-center justify-center z-10 relative overflow-hidden backdrop-blur-md transition-all duration-700">
              <div className="w-full h-full absolute transition-colors duration-700" style={{ background: `radial-gradient(ellipse at center, ${pulseColor}44 0%, transparent 70%)` }}></div>
              <div className={`w-[50px] h-[50px] rounded-full blur-[4px] absolute transition-all duration-700 ${!isIdle.current ? 'animate-ping opacity-60' : 'animate-spin-slow opacity-20'}`} style={{ backgroundColor: pulseColor }}></div>
              <div className="w-3 h-3 rounded-full bg-white absolute shadow-[0_0_20px_white] transition-transform duration-700" style={{ transform: isVivid ? 'scale(1.3)' : 'scale(1)' }}></div>
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[520px] max-w-[calc(100vw-24px)] animate-in fade-in slide-in-from-bottom-10 duration-200">
          <div
            className="w-full rounded-2xl border border-gray-800 bg-black/95 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden font-mono relative backdrop-blur-2xl transition-all duration-500"
            style={{ boxShadow: `0 0 44px ${pulseColor}1f`, borderColor: `${pulseColor}44` }}
          >
            <div className="bg-[#050505] px-4 py-3 border-b border-gray-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: pulseColor, color: pulseColor }}></div>
                <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: pulseColor }}>Orb Voice</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="border border-gray-800 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-gray-300 hover:text-white transition-colors"
                  onClick={() => setVoiceEnabled((current) => !current)}
                >
                  {voiceEnabled ? 'Voice On' : 'Voice Off'}
                </button>
                <button
                  type="button"
                  className="border border-gray-800 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-gray-300 hover:text-white transition-colors disabled:opacity-40"
                  disabled={!speechSupported || isProcessing}
                  onClick={toggleListening}
                >
                  {isListening ? 'Stop Mic' : 'Talk'}
                </button>
                <button
                  type="button"
                  className="text-[16px] text-gray-600 hover:text-white leading-none"
                  onClick={() => {
                    stopListening();
                    setIsOpen(false);
                  }}
                  aria-label="Close orb panel"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="px-3 py-3 border-b border-gray-900 flex flex-wrap items-center gap-2 bg-[#040404]">
              <button
                type="button"
                className="border border-gray-700 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-gray-300 hover:text-white transition-colors"
                onClick={() => setShowBackComms((current) => !current)}
              >
                {showBackComms ? 'Hide Back Comms' : 'Back Comms'}
              </button>
              <button
                type="button"
                className="border border-gray-700 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-gray-300 hover:text-white transition-colors"
                onClick={dockToTrayStation}
              >
                Dock To Tray
              </button>
              <button
                type="button"
                className="border border-gray-700 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-gray-300 hover:text-white transition-colors"
                onClick={openDockingStation}
              >
                Open Dock
              </button>
              <span className="text-[9px] uppercase tracking-[0.14em] text-gray-500">{meshState}</span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-gray-600">{isDesktopShell ? 'Desktop Link' : 'Web Link'}</span>
            </div>

            <div className="p-4 bg-[#030303]">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={!speechSupported || isProcessing}
                  className="shrink-0 w-[96px] h-[96px] rounded-full border border-white/20 bg-black/80 flex items-center justify-center relative overflow-hidden backdrop-blur-md transition-all duration-700 disabled:opacity-45"
                  title={isListening ? 'Stop listening' : 'Start listening'}
                >
                  <div className="w-full h-full absolute" style={{ background: `radial-gradient(ellipse at center, ${pulseColor}55 0%, transparent 72%)` }}></div>
                  <div
                    className={`w-[48px] h-[48px] rounded-full blur-[4px] absolute transition-all duration-700 ${isListening || isProcessing ? 'animate-pulse opacity-70' : 'opacity-30'}`}
                    style={{ backgroundColor: pulseColor }}
                  ></div>
                  <div className="relative z-10 text-[10px] uppercase tracking-[0.18em] text-gray-200">
                    {isProcessing ? 'Think' : isListening ? 'Live' : 'Talk'}
                  </div>
                </button>

                <div className="flex-1 min-h-[96px] border border-gray-800 rounded-2xl px-4 py-3 bg-black/70 relative overflow-hidden">
                  <div className="text-[9px] uppercase tracking-[0.14em] mb-2 flex items-center gap-3" style={{ color: pulseColor }}>
                    <span>{bubbleMind}</span>
                    <span className="opacity-65">CONF {bubbleConfidence.toFixed(2)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-100 whitespace-pre-wrap">{bubbleText}</p>
                </div>
              </div>

              <div className="mt-3 border border-gray-900 rounded-lg px-3 py-2 bg-black/40">
                <p className="text-[9px] uppercase tracking-[0.14em] text-gray-500 mb-1">Heard</p>
                <p className="text-xs text-gray-300 min-h-[18px]">{heardText || (isListening ? 'Listening for speech...' : 'Click orb and speak')}</p>
              </div>

              <p className="mt-3 text-[10px] uppercase tracking-[0.14em]" style={{ color: pulseColor }}>
                {status}
              </p>
            </div>

            {showBackComms && (
              <div className="border-t border-gray-900 bg-[#020202] px-4 py-3 max-h-[160px] overflow-y-auto space-y-2">
                {log.length === 0 ? (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-600">No back comms events yet.</p>
                ) : (
                  log.slice(-8).map((entry) => (
                    <div key={entry.id} className="text-[11px] leading-relaxed border-l pl-2" style={{ borderColor: getMindColor(entry.mind) }}>
                      <span className="uppercase tracking-[0.12em] text-[9px] mr-2" style={{ color: getMindColor(entry.mind) }}>
                        {entry.mind}
                      </span>
                      <span className="text-gray-300">{entry.text}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
