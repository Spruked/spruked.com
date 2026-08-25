const { useEffect, useMemo, useRef, useState } = React;

const ORB_MARGIN = 124;
const ORB_CURSOR_OFFSET = { x: 18, y: 16 };
const ORB_INTERACTION_RADIUS = 92;
const ORB_SMOOTHING = 0.52;
const ORB_SNAP_DISTANCE = 1.5;
const DEFAULT_SKIN_URL = new URL(
  '../.orb-assistant-wsl/skins/WORKORB21600_8eb49c628211c7d0.png',
  window.location.href
).href;

const LOGIC_VISUALS = {
  deductive: {
    label: 'Deductive',
    tone: 'Logic guard',
    color: '#67c6ff',
    aura: 'rgba(103, 198, 255, 0.32)',
    hueRotate: 0,
    brightness: 0.96,
  },
  inductive: {
    label: 'Inductive',
    tone: 'Learning drift',
    color: '#63e6a6',
    aura: 'rgba(99, 230, 166, 0.3)',
    hueRotate: 42,
    brightness: 1.02,
  },
  intuitive: {
    label: 'Intuitive',
    tone: 'Pattern lock',
    color: '#f5c96a',
    aura: 'rgba(245, 201, 106, 0.34)',
    hueRotate: -20,
    brightness: 1.08,
  },
};

function modeFromCognitiveMode(cognitiveMode) {
  const mode = String(cognitiveMode || '').toUpperCase();
  if (mode.includes('INTUITION')) return 'intuitive';
  if (mode.includes('HABIT')) return 'inductive';
  return 'deductive';
}

function makeSwarmNodes(count = 4) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
    const distance = 280 + Math.random() * 260;
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      progress: 0,
      phase: 'out',
    };
  });
}

function clampOrbPosition(x, y) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    x: Math.min(width - ORB_MARGIN, Math.max(ORB_MARGIN, x)),
    y: Math.min(height - ORB_MARGIN, Math.max(ORB_MARGIN, y)),
  };
}

function followCursorPosition(x, y) {
  return clampOrbPosition(x + ORB_CURSOR_OFFSET.x, y + ORB_CURSOR_OFFSET.y);
}

function FloatingOrb() {
  const [logicMode, setLogicMode] = useState('deductive');
  const [bridgeStatus, setBridgeStatus] = useState('Bridge booting');
  const [tone, setTone] = useState('Observing');
  const [bloomLevel, setBloomLevel] = useState(0.22);
  const [orbScale, setOrbScale] = useState(1);
  const [skinUrl, setSkinUrl] = useState(DEFAULT_SKIN_URL);
  const [socketHint, setSocketHint] = useState('WORKORB skin active');
  const [orbVisible, setOrbVisible] = useState(true);
  const [displayActive, setDisplayActive] = useState(false);
  const [swarmNodes, setSwarmNodes] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({
    x: Math.round(window.innerWidth * 0.5),
    y: Math.round(window.innerHeight * 0.46),
  });
  const swarmPhaseTimerRef = useRef(null);
  const cursorPositionRef = useRef(cursorPosition);
  const displayActiveRef = useRef(displayActive);
  const targetCursorPositionRef = useRef(cursorPosition);
  const animationFrameRef = useRef(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const mousePassthroughRef = useRef(true);
  const lastPointerRef = useRef({
    x: Math.round(window.innerWidth * 0.5),
    y: Math.round(window.innerHeight * 0.46),
  });

  const visual = useMemo(() => LOGIC_VISUALS[logicMode], [logicMode]);

  useEffect(() => {
    const decay = setInterval(() => {
      setBloomLevel((current) => Math.max(0.16, current - 0.045));
    }, 130);
    return () => clearInterval(decay);
  }, []);

  useEffect(() => {
    if (!swarmNodes.length) {
      return undefined;
    }

    const interval = setInterval(() => {
      let absorbed = 0;

      setSwarmNodes((current) =>
        current
          .map((node) => {
            const nextProgress = Math.min(1, node.progress + (node.phase === 'out' ? 0.18 : 0.16));
            if (node.phase === 'in' && nextProgress >= 1) {
              absorbed += 1;
              return null;
            }
            return { ...node, progress: nextProgress };
          })
          .filter(Boolean)
      );

      if (absorbed > 0) {
        setBloomLevel((current) => Math.max(current, 0.88));
        setOrbScale(1.09);
        setTimeout(() => setOrbScale(1), 220);
      }
    }, 33);

    return () => clearInterval(interval);
  }, [swarmNodes.length]);

  useEffect(() => () => {
    if (swarmPhaseTimerRef.current) {
      clearTimeout(swarmPhaseTimerRef.current);
    }
  }, []);

  useEffect(() => {
    cursorPositionRef.current = cursorPosition;
  }, [cursorPosition]);

  useEffect(() => {
    displayActiveRef.current = displayActive;
  }, [displayActive]);

  useEffect(() => {
    const animateOrb = () => {
      if (!draggingRef.current) {
        const current = cursorPositionRef.current;
        const target = targetCursorPositionRef.current;
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
          const nextPosition = distance <= ORB_SNAP_DISTANCE
            ? target
            : {
                x: current.x + dx * ORB_SMOOTHING,
                y: current.y + dy * ORB_SMOOTHING,
              };

          cursorPositionRef.current = nextPosition;
          setCursorPosition(nextPosition);
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(animateOrb);
    };

    animationFrameRef.current = window.requestAnimationFrame(animateOrb);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const setMousePassthrough = (ignore) => {
      if (mousePassthroughRef.current === ignore) {
        return;
      }
      mousePassthroughRef.current = ignore;
      window.electronAPI?.setIgnoreMouseEvents(ignore, ignore ? { forward: true } : undefined);
    };

    const isPointerOverOrb = (x, y) => {
      const dx = x - cursorPositionRef.current.x;
      const dy = y - cursorPositionRef.current.y;
      return Math.hypot(dx, dy) <= ORB_INTERACTION_RADIUS;
    };

    const handleMouseMove = (event) => {
      const pointer = { x: event.clientX, y: event.clientY };
      lastPointerRef.current = pointer;

      if (draggingRef.current) {
        const nextPosition = clampOrbPosition(
          pointer.x - dragOffsetRef.current.x,
          pointer.y - dragOffsetRef.current.y
        );
        targetCursorPositionRef.current = nextPosition;
        cursorPositionRef.current = nextPosition;
        setCursorPosition(nextPosition);
        setMousePassthrough(false);
        return;
      }

      const hoveringOrb = isPointerOverOrb(pointer.x, pointer.y);
      setMousePassthrough(!hoveringOrb);
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) {
        return;
      }

      draggingRef.current = false;
      const hoveringOrb = isPointerOverOrb(lastPointerRef.current.x, lastPointerRef.current.y);
      setMousePassthrough(!hoveringOrb);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) {
      return undefined;
    }

    const applyPulse = (pulse) => {
      const payload = pulse?.data?.predicate || pulse;
      const nextMode = modeFromCognitiveMode(payload?.cognitive_mode);
      setLogicMode(nextMode);
      const recalledFromPosteriori = pulse?.source === 'POSTERIORI';
      const recalledFromApriori = pulse?.source === 'APRIORI';
      setTone(
        recalledFromPosteriori
          ? 'Remembering'
          : recalledFromApriori
            ? 'Law recall'
            : LOGIC_VISUALS[nextMode].tone
      );
      setBridgeStatus(
        recalledFromPosteriori
          ? 'Posteriori recall'
          : recalledFromApriori
            ? 'Apriori recall'
            : `${LOGIC_VISUALS[nextMode].label} channel live`
      );
      setBloomLevel(
        Math.max(
          recalledFromPosteriori || recalledFromApriori ? 0.62 : 0.45,
          Math.min(1, payload?.glow_intensity ?? 0.5)
        )
      );
      setSwarmNodes((current) =>
        current.map((node) => (node.phase === 'out' ? { ...node, phase: 'in', progress: 0 } : node))
      );
    };

    const unsubscribers = [
      window.electronAPI.onOrbPositionUpdate((_event, payload) => {
        if (draggingRef.current) {
          return;
        }

        const isActiveDisplay = payload?.active !== false;
        if (!isActiveDisplay) {
          draggingRef.current = false;
          displayActiveRef.current = false;
          setDisplayActive(false);
          return;
        }

        const nextPosition = followCursorPosition(
          payload?.x ?? window.innerWidth / 2,
          payload?.y ?? window.innerHeight / 2
        );
        if (!displayActiveRef.current) {
          cursorPositionRef.current = nextPosition;
          setCursorPosition(nextPosition);
        }
        displayActiveRef.current = true;
        setDisplayActive(true);
        targetCursorPositionRef.current = nextPosition;
      }),
      window.electronAPI.onCognitivePulse((_event, pulse) => applyPulse(pulse)),
      window.electronAPI.onSpeechPulse((_event, message) => {
        applyPulse(message?.data || {});
        setTone('Listening');
        setBridgeStatus(message?.transcription || 'Voice captured');
        setBloomLevel(0.82);
      }),
      window.electronAPI.onHysteresis((_event, data) => {
        setTone('Bloom threshold');
        setBridgeStatus(`Hysteresis ${data.triggerThreshold} -> ${data.releaseThreshold}`);
        setBloomLevel(1);
        setOrbScale(1.06);
        setTimeout(() => setOrbScale(1), 260);
      }),
      window.electronAPI.onOrbSkinUpdated((_event, payload) => {
        const nextSkinUrl = payload?.imageUrl || DEFAULT_SKIN_URL;
        setSkinUrl(nextSkinUrl);
        setSocketHint(payload?.imageUrl ? 'Socket engaged' : 'WORKORB skin active');
      }),
      window.electronAPI.onOrbBridgeMessage((_event, message) => {
        if (message?.type === 'ready') {
          setBridgeStatus('Python bridge ready');
          setTone('Present');
          setBloomLevel(0.72);
        }
        if (message?.type === 'bridge_exit') {
          setBridgeStatus('Bridge offline');
          setTone('Sleeping');
        }
        if (message?.type === 'listening_state') {
          const active = Boolean(message?.data?.listening);
          const mode = message?.data?.mode === 'oneshot' ? 'Voice capture' : 'Listening';
          setTone(active ? mode : 'Present');
          setBridgeStatus(active ? `${mode} armed` : 'Awaiting gesture');
          setBloomLevel(active ? 0.95 : 0.42);
          setOrbScale(active ? 1.08 : 1);
        }
        if (message?.type === 'listen_once_ack' && !message?.data?.accepted) {
          setTone('Voice busy');
          setBridgeStatus('Voice capture unavailable');
          setBloomLevel(0.68);
        }
        if (message?.type === 'query_result') {
          setTone('Responding');
          setBridgeStatus(message?.data?.response_text || 'Response ready');
          setBloomLevel(1);
          setOrbScale(1.1);
          setTimeout(() => setOrbScale(1), 260);
          triggerSwarmDeployment(5);
        }
      }),
      window.electronAPI.onOrbStatusChange((_event, status) => {
        if (status?.controller_status) {
          setBridgeStatus(`Brain ${status.controller_status}`);
        }
      }),
      window.electronAPI.onOrbVisibilityChanged((_event, payload) => {
        const visible = payload?.visible !== false;
        setOrbVisible(visible);
        setTone(visible ? 'Present' : 'Docked');
        setBridgeStatus(visible ? 'Orb deployed' : 'Tray docked');
        if (visible) {
          setBloomLevel(0.9);
          setOrbScale(1.08);
          setTimeout(() => setOrbScale(1), 260);
        }
      }),
    ];

    window.electronAPI.getOrbStatus?.().catch(() => {});

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
    };
  }, []);

  const orbStyle = {
    position: 'absolute',
    left: `${cursorPosition.x}px`,
    top: `${cursorPosition.y}px`,
    width: '160px',
    height: '160px',
    pointerEvents: 'auto',
    cursor: draggingRef.current ? 'grabbing' : 'grab',
    transform: `translate(-50%, -50%) scale(${orbScale + bloomLevel * 0.08})`,
    transition: 'transform 180ms ease',
    willChange: 'left, top, transform',
    WebkitAppRegion: 'no-drag',
  };

  const auraStyle = {
    position: 'absolute',
    inset: '-18px',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${visual.aura} 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0) 72%)`,
    opacity: 0.34 + bloomLevel * 0.56,
    filter: `blur(${10 + bloomLevel * 12}px)`,
    transform: `scale(${1 + bloomLevel * 0.18})`,
    transition: 'all 160ms ease',
  };

  const coreStyle = {
    position: 'absolute',
    inset: '18px',
    borderRadius: '50%',
    background: skinUrl
      ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.34), rgba(12,18,31,0.12) 52%, rgba(12,18,31,0.56) 100%)`
      : `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.92), ${visual.color} 24%, rgba(12,18,31,0.96) 72%)`,
    boxShadow: `0 0 ${36 + bloomLevel * 62}px ${visual.color}, inset 0 0 ${26 + bloomLevel * 16}px rgba(255,255,255,0.22)`,
    border: `1px solid ${visual.color}55`,
    opacity: 0.76 + bloomLevel * 0.18,
    overflow: 'hidden',
  };

  const skinStyle = {
    position: 'absolute',
    inset: '6%',
    borderRadius: '50%',
    backgroundImage: `url("${skinUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: `hue-rotate(${visual.hueRotate}deg) saturate(${1.02 + bloomLevel * 0.18}) contrast(1.04) brightness(${visual.brightness + bloomLevel * 0.08})`,
    transform: `scale(${1 + bloomLevel * 0.035})`,
    opacity: 0.9,
  };

  const pulseOrb = (nextBloom = 0.74, nextScale = 1.05, settleMs = 180) => {
    setBloomLevel(nextBloom);
    setOrbScale(nextScale);
    setTimeout(() => setOrbScale(1), settleMs);
  };

  const triggerSwarmDeployment = (count = 4) => {
    if (swarmPhaseTimerRef.current) {
      clearTimeout(swarmPhaseTimerRef.current);
    }

    setTone('Swarm deployed');
    setBridgeStatus(`Dispatching ${count} nodes`);
    setSwarmNodes(makeSwarmNodes(count));
    setBloomLevel(0.7);

    swarmPhaseTimerRef.current = setTimeout(() => {
      setTone('Digesting return');
      setBridgeStatus('Swarm returning');
      setSwarmNodes((current) =>
        current.map((node) => ({ ...node, phase: 'in', progress: 0 }))
      );
    }, 460);
  };

  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none',
        opacity: orbVisible && displayActive ? 1 : 0,
        transition: 'opacity 220ms ease',
      },
    },
    React.createElement(
      'div',
      {
        style: orbStyle,
        onMouseEnter: () => window.electronAPI?.setIgnoreMouseEvents(false),
        onMouseLeave: () => {
          if (!draggingRef.current) {
            window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
          }
        },
        onMouseDown: (event) => {
          if (event.button !== 0) {
            return;
          }

          event.preventDefault();
          draggingRef.current = true;
          dragOffsetRef.current = {
            x: event.clientX - cursorPositionRef.current.x,
            y: event.clientY - cursorPositionRef.current.y,
          };
          window.electronAPI?.setIgnoreMouseEvents(false);
        },
        onClick: () => {
          if (!draggingRef.current) {
            pulseOrb();
          }
        },
        onContextMenu: async (event) => {
          event.preventDefault();
          window.electronAPI?.setIgnoreMouseEvents(false);
          setTone('Listening');
          setBridgeStatus('Voice capture requested');
          pulseOrb(0.92, 1.08, 240);
          triggerSwarmDeployment(4);
          await window.electronAPI?.listenOnce?.();
        },
        onDragOver: (event) => {
          event.preventDefault();
          setSocketHint('Release to socket');
          setBloomLevel(0.92);
        },
        onDragLeave: () => {
          setSocketHint(skinUrl ? 'Socket engaged' : 'Base frame');
        },
        onDrop: async (event) => {
          event.preventDefault();
          const droppedFilePath = event.dataTransfer?.files?.[0]?.path || '';
          const droppedUrl = event.dataTransfer?.getData('text/uri-list')
            || event.dataTransfer?.getData('text/plain')
            || '';

          if (droppedFilePath && window.electronAPI?.ingestOrbSkin) {
            const result = await window.electronAPI.ingestOrbSkin(droppedFilePath);
            setSkinUrl(result?.imageUrl || null);
            setSocketHint(result?.imageUrl ? 'Vaulted locally' : 'Base frame');
            triggerSwarmDeployment(5);
            return;
          }

          if (!droppedUrl || !window.electronAPI?.setOrbSkin) {
            setSocketHint(skinUrl ? 'Socket engaged' : 'Base frame');
            return;
          }
          const result = await window.electronAPI.setOrbSkin(droppedUrl);
          setSkinUrl(result?.imageUrl || null);
          setSocketHint(result?.imageUrl ? 'Socket engaged' : 'Base frame');
          triggerSwarmDeployment(5);
        },
        onDoubleClick: async (event) => {
          event.preventDefault();

          if (event.altKey) {
            if (!window.electronAPI?.setOrbSkin || !window.electronAPI?.ingestOrbSkin) {
              return;
            }
            const source = window.prompt('Set Orb skin source: local file path or direct image URL', skinUrl || '');
            if (source === null) {
              return;
            }
            const trimmed = source.trim();
            const isLocalPath = trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed);
            const result = isLocalPath
              ? await window.electronAPI.ingestOrbSkin(trimmed)
              : await window.electronAPI.setOrbSkin(trimmed);
            setSkinUrl(result?.imageUrl || null);
            setSocketHint(result?.imageUrl ? (isLocalPath ? 'Vaulted locally' : 'Socket engaged') : 'Base frame');
            triggerSwarmDeployment(5);
            return;
          }

          setTone('Voice capture');
          setBridgeStatus('Listening for speech');
          pulseOrb(1, 1.1, 300);
          const accepted = await window.electronAPI?.listenOnce?.();
          if (!accepted) {
            setTone('Voice busy');
            setBridgeStatus('Try again in a moment');
            setBloomLevel(0.62);
          }
        },
      },
      swarmNodes.map((node) => {
        const direction = node.phase === 'out' ? 1 : -1;
        const translateX = node.dx * node.progress * direction;
        const translateY = node.dy * node.progress * direction;
        const opacity = node.phase === 'out'
          ? Math.max(0, 1 - node.progress * 1.1)
          : Math.min(1, node.progress * 1.3);

        return React.createElement('div', {
          key: node.id,
          style: {
            position: 'absolute',
            left: '50%',
            top: '46%',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: visual.color,
            boxShadow: `0 0 22px ${visual.color}`,
            transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))`,
            opacity,
            transition: 'transform 33ms linear, opacity 33ms linear',
            pointerEvents: 'none',
          },
        });
      }),
      React.createElement('div', { style: auraStyle }),
      React.createElement(
        'div',
        { style: coreStyle },
        skinUrl && React.createElement('div', { style: skinStyle }),
        React.createElement('div', {
          style: {
            position: 'absolute',
            inset: '10%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 34% 24%, rgba(255,255,255,0.72), transparent 26%)',
            mixBlendMode: 'screen',
          },
        })
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(FloatingOrb));
