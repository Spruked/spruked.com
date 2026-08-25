'use client';

import { useState, useRef, useEffect } from 'react';
import { Section } from '@/components/ui/Section';

interface LogEntry {
  actor: string;
  message: string;
  color: string;
}

export default function OrbDemoPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [orbColorClass, setOrbColorClass] = useState('bg-white');
  const [orbShadowClass, setOrbShadowClass] = useState('shadow-[0_0_80px_rgba(255,255,255,0.8)]');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finalResponse, setFinalResponse] = useState('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleVoiceDemo = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setFinalResponse('');
    setLogs([]);
    
    // Phase 1: Intake (Cali)
    setOrbColorClass('bg-white');
    setOrbShadowClass('shadow-[0_0_80px_rgba(255,255,255,0.8)]');
    setLogs([{ actor: 'Cali', message: 'Initializing epistemic intake and parsing intent...', color: 'text-white' }]);
    
    // Simulate API Stream delays for demonstration
    await new Promise(r => setTimeout(r, 1200));

    // Phase 2a: Adjudication (Spinoza)
    setOrbColorClass('bg-blue-400');
    setOrbShadowClass('shadow-[0_0_80px_rgba(96,165,250,0.8)]');
    setLogs(prev => [...prev, { actor: 'Spinoza', message: 'Applying deductive frameworks and structural substance...', color: 'text-blue-400' }]);
    
    await new Promise(r => setTimeout(r, 1500));

    // Phase 2b: Adjudication (Hume)
    setOrbColorClass('bg-green-400');
    setOrbShadowClass('shadow-[0_0_80px_rgba(74,222,128,0.8)]');
    setLogs(prev => [...prev, { actor: 'Hume', message: 'Validating empirical baselines and evidence matrices...', color: 'text-green-400' }]);

    await new Promise(r => setTimeout(r, 1800));

    // Phase 2c: Adjudication (Kant)
    setOrbColorClass('bg-purple-400');
    setOrbShadowClass('shadow-[0_0_80px_rgba(192,132,252,0.8)]');
    setLogs(prev => [...prev, { actor: 'Kant', message: 'Evaluating a priori principles and categorical compliance...', color: 'text-purple-400' }]);

    await new Promise(r => setTimeout(r, 1800));

    // Phase 3: Resolution (Cali / Truth)
    setOrbColorClass('bg-truth'); // Spruked branding Red
    setOrbShadowClass('shadow-[0_0_80px_hsla(0,100%,50%,0.8)]'); // specific red glow adjust as needed
    setLogs(prev => [...prev, { actor: 'Cali', message: 'Consensus stabilized. Generating final truth response.', color: 'text-truth' }]);

    await new Promise(r => setTimeout(r, 1000));

    // Final Output Output
    setFinalResponse("Based on epistemic consensus, the input data structure requires correction. The proposed theory violates observed empirical precedents (Hume) and contradicts categorical models of deployment (Kant). The Spruked System recommends a structural rewrite before registry induction.");
    setIsProcessing(false);
  };

  return (
    <>
      <Section className="mx-auto max-w-5xl py-24 text-center">
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          <span className="text-truth">ORB</span> Live Interface
        </h1>
        <p className="text-2xl font-bold text-white mb-6 uppercase tracking-widest">
          "If better is possible, Good is not enough."
        </p>
        <p className="text-xl text-gray-400 mb-12">
          Interactive companion interface for the Spruked System.
        </p>

        {/* ORB Demo Box */}
        <div className="bg-[#050505] border border-gray-800 rounded-2xl p-10 shadow-[0_0_50px_rgba(255,255,255,0.02)] max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden">
          
          {/* Animated ORB container */}
          <div className="flex-grow flex items-center justify-center w-full mb-8 pt-8">
            <div className={`w-32 h-32 rounded-full transition-all duration-700 ease-in-out ${orbColorClass} ${orbShadowClass} ${isProcessing ? 'animate-pulse' : ''} flex items-center justify-center`}>
              <div className="w-24 h-24 rounded-full bg-black/20 mix-blend-overlay animate-spin-slow"></div>
            </div>
          </div>

          {/* Tribunal Terminal (Visible when processing or done) */}
          <div className="w-full max-w-2xl text-left bg-black border border-gray-800 rounded-lg p-4 mb-8 h-48 overflow-y-auto font-mono text-sm relative">
            {!isProcessing && logs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 opacity-50 uppercase tracking-widest">
                Epistemic Engine Idle
              </div>
            )}
            
            {logs.map((log, index) => (
              <div key={index} className="mb-2 transition-opacity duration-300">
                <span className={`font-bold ${log.color}`}>[{log.actor}]: </span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
            
            {finalResponse && (
              <div className="mt-4 pt-4 border-t border-gray-800 transition-opacity duration-500">
                <span className="text-truth font-bold block mb-2">[SYSTEM RESPONSE]:</span>
                <span className="text-white leading-relaxed">{finalResponse}</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>

          <button
            type="button"
            onClick={handleVoiceDemo}
            disabled={isProcessing}
            className="rounded-full border border-white/20 bg-white px-8 py-4 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? 'Listening' : 'Click Orb To Speak'}
          </button>
        </div>
      </Section>

      <Section className="mx-auto max-w-4xl py-12 pb-24">
        <div className="border-t border-gray-900 pt-12 space-y-6 text-gray-300 md:flex flex-row gap-12 justify-between">
          <div className="flex-1 space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Demo Parameters</h3>
            <div className="flex flex-col sm:flex-row gap-4 border-b border-gray-900 pb-3">
              <span className="text-gray-500 w-32 uppercase tracking-widest font-sans text-xs">Model Base:</span>
              <span className="text-white font-mono">Qwen Logic Core</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 border-b border-gray-900 pb-3">
              <span className="text-gray-500 w-32 uppercase tracking-widest font-sans text-xs">Governance:</span>
              <span className="text-truth font-mono">UCM Wrapper</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 border-b border-gray-900 pb-3">
              <span className="text-gray-500 w-32 uppercase tracking-widest font-sans text-xs">Engine:</span>
              <span className="text-white font-mono">Bayesian / Deductive</span>
            </div>
          </div>
          
          <div className="flex-1 mt-8 md:mt-0 p-6 bg-[#050505] border border-gray-800 rounded-xl">
             <h4 className="text-sm font-bold text-truth uppercase tracking-widest mb-3">The Epistemic State</h4>
             <p className="text-sm text-gray-400 mb-4">Unlike standard LLMs, this interface exposes the deterministic evaluation of inputs.</p>
             <ul className="text-xs font-mono space-y-2 text-gray-500">
               <li><span className="inline-block w-3 h-3 rounded-full bg-white mr-2"></span>Cali (Intake & Consensus)</li>
               <li><span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2"></span>Spinoza (Monism/Deduction)</li>
               <li><span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>Hume (Empiricism)</li>
               <li><span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-2"></span>Kant (A Priori)</li>
             </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
