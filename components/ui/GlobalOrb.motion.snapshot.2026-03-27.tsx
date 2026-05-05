'use client';

import { useState, useEffect, useRef } from 'react';
import { OrbService } from '@/Orb_Assistant/api/OrbService';

export default function GlobalOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pulseColor, setPulseColor] = useState('white');
  const [status, setStatus] = useState('Awaiting epistemic stimulus...');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserPath, setBrowserPath] = useState('/products');
  const [meshState, setMeshState] = useState('Mesh link pending');
  const [log, setLog] = useState<{ id: string; mind: string; conf: number; text: string }[]>([]);

  // Physics refs for autonomous floating mechanics
  const orbRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: -200, y: -200 }); // start offscreen
  const currentPos = useRef({ x: -200, y: -200 });
  const velocity = useRef({ x: 0, y: 0 });
  const isIdle = useRef(false);
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Ghost to Vivid Transition states
  const [isVivid, setIsVivid] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (typeof window !== 'undefined') {
      const startX = window.innerWidth - 150;
      const startY = window.innerHeight - 150;
      targetPos.current = { x: startX, y: startY };
      currentPos.current = { x: startX, y: startY };
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isOpen) return;

      // The Attraction: offset from cursor to stay out of the way
      let targetX = e.clientX + 140;
      let targetY = e.clientY + 140;

      // The Repulsion / Screen Bounds
      const maxX = window.innerWidth - 150;
      const maxY = window.innerHeight - 150;
      
      if (targetX > maxX) targetX = e.clientX - 160;
      if (targetY > maxY) targetY = e.clientY - 160;

      // Ensure it doesn't drift off the top or left edges
      if (targetX < 20) targetX = 20;
      if (targetY < 20) targetY = 20;

      targetPos.current = { x: targetX, y: targetY };
      
      // Wake up the system (Vivid mode) only if it was idle
      if (isIdle.current) {
        isIdle.current = false;
        setIsVivid(true);
      }

      // Timeout for entering idle drift/ghost mode
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      idleTimeout.current = setTimeout(() => { 
        if (!isIdle.current) {
          isIdle.current = true; 
          setIsVivid(false); // Drop to 30-40% opacity
        }
      }, 2500); 
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Independent high-frequency physics loop
    let animationFrameId: number;
    const updatePhysics = () => {
      if (!isOpen && orbRef.current) {
        // Distance to target
        const dx = targetPos.current.x - currentPos.current.x;
        const dy = targetPos.current.y - currentPos.current.y;
        
        // Spring Force (Attraction) - decreased for slower follow
        const ax = dx * 0.012;
        const ay = dy * 0.012;
        
        // Damping (Smooth decelleration) - increased for more sliding/lag
        velocity.current.x = (velocity.current.x + ax) * 0.88;
        velocity.current.y = (velocity.current.y + ay) * 0.88;
        
        // Independent Drift (Orbiting)
        let driftX = 0;
        let driftY = 0;
        const time = Date.now() * 0.0005;
        
        if (isIdle.current) {
          driftX = Math.sin(time) * 0.6;
          driftY = Math.cos(time * 0.8) * 0.6;
        } else {
          // Even when active, give it a slight wobble so it's not a rigid tracer
          driftX = Math.sin(time * 1.5) * 0.25;
          driftY = Math.cos(time * 1.2) * 0.25;
        }
        
        currentPos.current.x += velocity.current.x + driftX;
        currentPos.current.y += velocity.current.y + driftY;
        
        // Direct DOM manipulation guarantees butter-smooth 60+ fps performance
        orbRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(updatePhysics);
    };
    
    updatePhysics();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
    };
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

  const handlePulse = (color: string, mind: string) => {
    setPulseColor(color);
    setStatus(`Processing via ${mind.toUpperCase()}...`);
  };

  const getMindColor = (mind: string) => {
    switch (mind.toLowerCase()) {
      case 'kant': return '#b4ff00'; // truth green
      case 'spinoza': return '#00ffcc'; // cyanish
      case 'hume': return '#ff00aa'; // magenta
      case 'locke': return '#ffaa00'; // orange
      default: return '#b4ff00';
    }
  };

  const appendSystemLog = (mind: string, conf: number, text: string) => {
    setLog(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mind,
      conf,
      text
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setStatus('Transmitting...');
    setPulseColor('white');
    
    setLog(prev => [...prev, { id: Date.now().toString(), mind: 'user', conf: 1, text: userText }]);

    try {
      const trimmed = userText.trim();

      if (trimmed.toLowerCase() === '/status') {
        const snapshot = await OrbService.getStatus();
        const orbStatus = snapshot?.orb_status || {};
        const meshRoot = snapshot?.mesh?.mesh_root || orbStatus?.shared_mesh_root || 'not linked';
        appendSystemLog(
          'system',
          1,
          `Instance ${String(orbStatus?.instance_id || 'web').toUpperCase()} | device ${orbStatus?.device || 'cpu'} | mesh ${meshRoot}`
        );
        setStatus('Status snapshot loaded.');
        setMeshState(snapshot?.mesh?.mesh_root ? 'Mesh linked' : 'Mesh offline');
        return;
      }

      if (trimmed.toLowerCase().startsWith('/research ')) {
        const commandBody = trimmed.slice('/research '.length).trim();
        const [queryPart, domainPart] = commandBody.split('::');
        const domains = domainPart
          ? domainPart.split(',').map((item) => item.trim()).filter(Boolean)
          : [];

        const response = await OrbService.research(queryPart.trim(), domains, { speak: voiceEnabled });
        appendSystemLog(
          'research',
          Number(response?.metadata?.confidence_aggregate || 0.6),
          response?.response || 'Research returned no response.'
        );
        setStatus(`Research completed across ${(response?.metadata?.domains || []).join(', ') || 'inferred domains'}.`);
        setMeshState('Mesh linked');
        setPulseColor('#67c6ff');
        return;
      }

      if (trimmed.toLowerCase().startsWith('/speak ')) {
        const speakText = trimmed.slice('/speak '.length).trim();
        await OrbService.speak(speakText);
        appendSystemLog('voice', 1, `Spoken: ${speakText}`);
        setStatus('Voice output issued.');
        return;
      }

      const response = await OrbService.sendMessage(userText, handlePulse, { speak: voiceEnabled });
      
      if (response && response.metadata) {
        const { leading_mind, confidence } = response.metadata;
        const msgText = response.response;
        const mindColor = getMindColor(leading_mind);

        appendSystemLog(leading_mind, confidence, msgText);
        setStatus(`Adjudicated by ${leading_mind.toUpperCase()}`);
        setMeshState('Mesh linked');
        setPulseColor(mindColor); 
      } else {
        setStatus('Engine response generic/offline');
      }
    } catch (err) {
      console.error(err);
      setStatus('Connection Failed');
      setMeshState('Mesh unavailable');
      setPulseColor('red');
    }
  };

  // Prevent SSR hydration mismatch
  if (!isMounted) return null;

  return (
    <>
      {/* The Independent Floating Entity (Physics Engine Based) */}
      {!isOpen && (
        <div 
          ref={orbRef}
          className="fixed left-0 top-0 z-[9999] pointer-events-none will-change-transform"
        >
          <button 
            onClick={() => setIsOpen(true)}
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
            {/* Ambient Field / Vivacity */}
            <div 
              className="w-full h-full rounded-full absolute mix-blend-screen transition-all duration-1000 will-change-transform"
              style={{
                boxShadow: `0 0 ${isVivid ? '50px' : '20px'} ${pulseColor}`,
                animation: isVivid ? 'pulse 1.5s infinite ease-in-out' : 'pulse 4s infinite ease-in-out',
                opacity: isIdle.current ? 0.3 : 0.8
              }}
            ></div>
            
            {/* The Core Entity */}
            <div className="w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full border border-white/20 bg-black/80 flex items-center justify-center z-10 relative overflow-hidden backdrop-blur-md transition-all duration-700">
               {/* Internal Pulse gradient */}
               <div className="w-full h-full absolute transition-colors duration-700" style={{ background: `radial-gradient(ellipse at center, ${pulseColor}44 0%, transparent 70%)` }}></div>
               <div className={`w-[50px] h-[50px] rounded-full blur-[4px] absolute transition-all duration-700 ${!isIdle.current ? 'animate-ping opacity-60' : 'animate-spin-slow opacity-20'}`} style={{ backgroundColor: pulseColor }}></div>
               {/* Singular Point of Apperception */}
               <div className="w-3 h-3 rounded-full bg-white absolute shadow-[0_0_20px_white] transition-transform duration-700" style={{ transform: isVivid ? 'scale(1.3)' : 'scale(1)' }}></div>
            </div>
          </button>
        </div>
      )}

      {/* Docked Minimalist Command Line */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[400px] flex flex-col items-end animate-in fade-in slide-in-from-bottom-10 duration-200">
          <div 
            className="w-full rounded-none border border-gray-800 bg-black/95 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col font-mono relative backdrop-blur-2xl transition-all duration-500"
            style={{ boxShadow: `0 0 50px ${pulseColor}15`, borderColor: `${pulseColor}44` }}
          >
             {/* Header Bar */}
            <div className="bg-[#050505] px-4 py-3 border-b border-gray-900 flex justify-between items-center cursor-pointer hover:bg-[#0a0a0a] transition-colors" onClick={() => setIsOpen(false)}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: pulseColor, color: pulseColor }}></div>
                <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: pulseColor }}>Council Terminal</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="border border-gray-800 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-gray-300 hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    setVoiceEnabled((current) => !current);
                  }}
                >
                  {voiceEnabled ? 'Voice On' : 'Voice Off'}
                </button>
                <span className="text-[9px] uppercase tracking-[0.16em] text-gray-500">{meshState}</span>
                <span className="text-[16px] text-gray-600 hover:text-white leading-none">×</span>
              </div>
            </div>

            {/* Log Output Area */}
            <div className="h-[480px] overflow-y-auto p-5 pb-2 space-y-4 bg-transparent text-sm scrollbar-hide flex flex-col">
              {log.length === 0 ? (
                <div className="text-gray-500 text-xs mt-auto font-mono">
                  <p className="mb-2 uppercase tracking-widest">Observer Entity Initialized.</p>
                  <p className="mb-4 opacity-50 uppercase tracking-widest">Monitoring epistemic environment...</p>
                  <p className="mb-2 uppercase tracking-widest opacity-70">{meshState}</p>
                  <p className="mb-2 uppercase tracking-widest opacity-70">{voiceEnabled ? 'Voice synthesis armed' : 'Voice synthesis muted'}</p>
                  <p className="mb-4 uppercase tracking-widest opacity-40">Commands: /status, /research query :: domain1,domain2, /speak text</p>
                  <p className="animate-pulse" style={{ color: pulseColor }}>{status.toUpperCase()}</p>
                </div>
              ) : (
                log.map(entry => (
                  <div key={entry.id} className="flex flex-col mb-4">
                    {entry.mind === 'user' ? (
                      <div className="text-gray-400 opacity-80 pl-2">
                        <span className="text-white opacity-50 mr-3">&gt;</span>{entry.text}
                      </div>
                    ) : (
                      <div className="mt-3 pl-4 border-l-2 py-2 text-gray-200 bg-gradient-to-r from-white/5 to-transparent relative" style={{ borderColor: pulseColor }}>
                        {/* Connecting line dot */}
                        <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full" style={{ backgroundColor: pulseColor }}></div>
                        
                        <div className="text-[9px] uppercase tracking-[0.1em] mb-2 opacity-80 flex gap-4" style={{ color: pulseColor }}>
                          <span>MIND: {entry.mind}</span>
                          <span>CONF: {(entry.conf * 100).toFixed(1)}%</span>
                        </div>
                        <div className="leading-relaxed text-sm">
                          {entry.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Minimal Input Bar */}
            <div className="p-3 bg-[#030303]">
              <form onSubmit={handleSubmit} className="border border-gray-800 bg-[#000] flex relative rounded focus-within:border-gray-600 transition-colors" style={{ borderColor: pulseColor }}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold" style={{ color: pulseColor }}>
                  {status.includes('Processing') ? '⟳' : '⊛'}
                </span>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                  placeholder={status.includes('Processing') ? "Processing trace..." : "Invoke Council..."}
                  className="w-full bg-transparent py-3 pr-3 pl-10 text-xs text-white focus:outline-none placeholder-gray-700"
                  disabled={status.includes('Processing')}
                />
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
