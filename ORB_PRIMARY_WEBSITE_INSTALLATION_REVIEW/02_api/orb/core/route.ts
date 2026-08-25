import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import {
  getOrbPaths,
  getWebMeshStatus,
  importOtherOrbArtifact,
  listOtherOrbExports,
  publishWebArtifact,
  submitWebTask,
} from '@/lib/orb-server';
import { updateOrbState, type OrbReasoningMode } from '@/lib/orb-introspection';
import primitiveResponseCache from '@/orb_core_standard/primitive_response_cache.json';
import primitiveNormalizationAliases from '@/orb_core_standard/primitive_normalization_aliases.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CognitionProvider = 'cali_skg' | 'calixone';

const KOKORO_TTS_PROVIDER = 'kokoro';
const KOKORO_FALLBACK_MESSAGE = 'Voice is temporarily unavailable, but I can still help here in text.';

function badRequest(message: string) {
  return NextResponse.json({ status: 'error', message }, { status: 400 });
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function normalizeAudioUrl(audioUrl: unknown, baseUrl: string): string | null {
  const raw = typeof audioUrl === 'string' ? audioUrl.trim() : '';
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `${trimTrailingSlash(baseUrl)}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function kokoroSpeakUrl(): string {
  return trimTrailingSlash(process.env.ORB_TTS_KOKORO_URL || 'http://127.0.0.1:8880/speak');
}

function kokoroHealthUrl(): string {
  const configured = String(process.env.ORB_TTS_KOKORO_HEALTH_URL || '').trim();
  if (configured) return configured;
  try {
    const url = new URL(kokoroSpeakUrl());
    url.pathname = '/health';
    url.search = '';
    return url.toString();
  } catch {
    return 'http://127.0.0.1:8880/health';
  }
}

function kokoroVoice(): string {
  return String(process.env.ORB_TTS_KOKORO_VOICE || 'af_heart').trim() || 'af_heart';
}

function kokoroModel(): string {
  return String(process.env.ORB_TTS_KOKORO_MODEL || 'kokoro').trim() || 'kokoro';
}

function kokoroFormat(): string {
  return String(process.env.ORB_TTS_KOKORO_FORMAT || 'wav').trim() || 'wav';
}

function kokoroSpeed(): number {
  const value = Number(process.env.ORB_TTS_KOKORO_SPEED || '1.05');
  return Number.isFinite(value) ? value : 1.05;
}

function kokoroTimeoutMs(): number {
  const value = Number(process.env.ORB_TTS_KOKORO_TIMEOUT_MS || process.env.SPRUKED_ORB_TTS_TIMEOUT_MS || '45000');
  return Number.isFinite(value) ? Math.max(2000, value) : 45000;
}

async function checkKokoroHealth(): Promise<boolean> {
  const response = await fetch(kokoroHealthUrl(), {
    method: 'GET',
    signal: AbortSignal.timeout(Math.min(5000, kokoroTimeoutMs())),
  });
  if (!response.ok) return false;
  const data = await response.json().catch(() => ({}));
  return String(data?.engine || '').toLowerCase() === KOKORO_TTS_PROVIDER
    || String(data?.status || '').toLowerCase() === 'ok';
}

function isWavAudio(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return riff === 'RIFF' && wave === 'WAVE';
}

async function saveKokoroWav(bytes: Uint8Array, text: string): Promise<string> {
  const { webSystemRoot } = getOrbPaths();
  const voiceCacheRoot = path.resolve(webSystemRoot, 'CALI_System', 'voice_cache');
  await mkdir(voiceCacheRoot, { recursive: true });
  const digest = createHash('sha256')
    .update(text)
    .update(Buffer.from(bytes.slice(0, Math.min(bytes.length, 512))))
    .digest('hex')
    .slice(0, 20);
  const fileName = `kokoro-${Date.now()}-${digest}.wav`;
  await writeFile(path.join(voiceCacheRoot, fileName), bytes);
  return `/api/orb/audio?file=${encodeURIComponent(fileName)}`;
}

async function synthesizeKokoro(text: string): Promise<Record<string, any>> {
  const spokenText = String(text || '').trim();
  const startedAt = Date.now();
  if (!spokenText) {
    return {
      tts_provider: null,
      tts_error: KOKORO_FALLBACK_MESSAGE,
      voice_ready: false,
    };
  }

  try {
    const response = await fetch(kokoroSpeakUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: spokenText,
        text: spokenText,
        model: kokoroModel(),
        voice: kokoroVoice(),
        response_format: kokoroFormat(),
        speed: kokoroSpeed(),
      }),
      signal: AbortSignal.timeout(kokoroTimeoutMs()),
    });

    if (!response.ok) throw new Error('kokoro synthesis unavailable');
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!contentType.includes('audio/wav') || !isWavAudio(bytes)) {
      throw new Error('kokoro returned non-wav audio');
    }

    const audioUrl = await saveKokoroWav(bytes, spokenText);
    return {
      audio_url: audioUrl,
      tts_audio_url: audioUrl,
      tts_provider: KOKORO_TTS_PROVIDER,
      audio_engine: KOKORO_TTS_PROVIDER,
      voice_ready: true,
      voice: {
        engine: KOKORO_TTS_PROVIDER,
        provider: KOKORO_TTS_PROVIDER,
        profile: kokoroVoice(),
        voice: kokoroVoice(),
        audio_url: audioUrl,
        text: spokenText,
      },
      metadata: {
        audio_engine: KOKORO_TTS_PROVIDER,
        voice: kokoroVoice(),
        voice_ready: true,
        tts_ms: Date.now() - startedAt,
      },
    };
  } catch (error: any) {
    const message = error?.message || KOKORO_FALLBACK_MESSAGE;
    return {
      tts_provider: null,
      tts_audio_url: null,
      audio_url: null,
      audio_engine: KOKORO_TTS_PROVIDER,
      tts_error: message,
      voice_ready: false,
      voice: {
        engine: KOKORO_TTS_PROVIDER,
        provider: KOKORO_TTS_PROVIDER,
        profile: kokoroVoice(),
        voice: kokoroVoice(),
        text: spokenText,
        error: message,
      },
      metadata: {
        audio_engine: KOKORO_TTS_PROVIDER,
        voice: kokoroVoice(),
        voice_ready: false,
        tts_error: message,
        tts_ms: Date.now() - startedAt,
      },
    };
  }
}

async function withKokoroVoice(response: Record<string, any>, textOverride?: string): Promise<Record<string, any>> {
  const spokenText = String(textOverride || response?.response || response?.text || response?.voice?.text || '').trim();
  const voiceResult = await synthesizeKokoro(spokenText);
  return {
    ...response,
    ...voiceResult,
    text: response?.text || response?.response || spokenText,
    metadata: {
      ...(response?.metadata || {}),
      ...(voiceResult?.metadata || {}),
      tts_provider: voiceResult.tts_provider,
      tts_error: voiceResult.tts_error || null,
    },
  };
}


type PrimitiveCacheEntry = {
  intent: string;
  patterns: string[];
  response_template: string;
  bypass_provider: boolean;
  bypass_governance: boolean;
};

type LocalPrimitiveRoute = {
  intent: string;
  trigger: string;
  response: string;
  provider: 'primitive_response_cache';
  bypassed_provider: true;
  bypassed_governance: true;
  bypass_heavy_reasoning: true;
  log_event: true;
};

const TASK_INTENT_BLOCKERS = /\b(weather|check|use|find|search|look up|noaa|substrate|explain|build|fix|create|write|show|tell me|what is|why|where|when|how do)\b/i;
const PRIMITIVE_CACHE_ENTRIES = (primitiveResponseCache as { entries?: PrimitiveCacheEntry[] }).entries || [];
const PRIMITIVE_NORMALIZATION_ALIASES = (primitiveNormalizationAliases as { aliases?: Record<string, string> }).aliases || {};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeLocalPrimitivePrompt(prompt: string): string {
  const compacted = String(prompt || '')
    .toLowerCase()
    .trim()
    .replace(/[?!.,]+$/g, '')
    .replace(/\s+/g, ' ');

  const compactedNoSpaces = compacted.replace(/\s+/g, '');
  const wholeAlias = PRIMITIVE_NORMALIZATION_ALIASES[compacted] || PRIMITIVE_NORMALIZATION_ALIASES[compactedNoSpaces];
  if (wholeAlias) return String(wholeAlias).replace(/\s+/g, ' ').trim();

  let normalized = compacted;
  const aliases = Object.entries(PRIMITIVE_NORMALIZATION_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of aliases) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g'), to);
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function routeLocalPrimitive(prompt: string): LocalPrimitiveRoute | null {
  const normalized = normalizeLocalPrimitivePrompt(prompt);
  if (!normalized) return null;

  for (const entry of PRIMITIVE_CACHE_ENTRIES) {
    const patterns = Array.isArray(entry.patterns) ? entry.patterns : [];
    if (!patterns.includes(normalized)) continue;

    return {
      intent: String(entry.intent || 'primitive'),
      trigger: normalized,
      response: String(entry.response_template || ''),
      provider: 'primitive_response_cache',
      bypassed_provider: true,
      bypassed_governance: true,
      bypass_heavy_reasoning: true,
      log_event: true,
    };
  }

  return null;
}

function deterministicIdentityResponse(prompt: string): Record<string, any> | null {
  const normalized = normalizeLocalPrimitivePrompt(prompt);
  if (/\b(who are you|what are you|what'?s your name|tell me about yourself)\b/i.test(normalized)) {
    const response = "I'm the Spruked ORB. I help visitors understand Spruked, TrueMark, CertSig, GOAT, and the systems behind verified digital knowledge.";
    return {
      status: 'success',
      response,
      text: response,
      provider: 'deterministic_identity',
      llm_source: 'deterministic-identity',
      metadata: {
        provider: 'deterministic_identity',
        leading_mind: 'cali',
        confidence: 1,
        truth_likelihood: 1,
        cognition_mode: 'identity',
      },
    };
  }
  if (/\b(what is your purpose|what'?s your purpose|your purpose|what do you do|what can you do|primary function|primary role)\b/i.test(normalized)) {
    const response = 'My purpose is to give visitors clear answers about Spruked, route useful questions, and speak with corrective precision without pretending to know what I do not know.';
    return {
      status: 'success',
      response,
      text: response,
      provider: 'deterministic_identity',
      llm_source: 'deterministic-identity',
      metadata: {
        provider: 'deterministic_identity',
        leading_mind: 'cali',
        confidence: 1,
        truth_likelihood: 1,
        cognition_mode: 'identity',
      },
    };
  }
  return null;
}

function normalizeCompanionText(rawText: string, prompt: string): string {
  const promptLower = String(prompt || '').toLowerCase();
  let text = String(rawText || '').trim();
  if (!text) return text;

  // Remove diagnostic leakage from lower-level reasoning traces.
  const filteredLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(MIND|CONF)\s*:/i.test(line));
  if (filteredLines.length > 0) {
    text = filteredLines.join(' ');
  }
  if (/offers the strongest frame for/i.test(text)) {
    text = '';
  }

  if (/\b(what(?:'s| is)? your name|who are you)\b/.test(promptLower)) {
    return "I'm Cali. I'm here with you.";
  }
  if (/\b(primary function|primary role|your role|your purpose|what do you do)\b/.test(promptLower)) {
    return 'My primary function is to assist you as Cali with clear guidance, onboarding, mint support, and execution help.';
  }
  if (/\b(can you hear me|do you hear me)\b/.test(promptLower)) {
    return 'I hear you clearly.';
  }
  if (/^(hi|hello|hey)\b/.test(promptLower)) {
    return "Hey. I'm here.";
  }

  text = text.replace(/\bask clarifying question\b/gi, 'clarify this');
  text = text.replace(/\bprovide information\b/gi, 'work through this');
  text = text.replace(/\brequest advice\b/gi, 'next step');
  text = text.replace(/\bemotional support\b/gi, 'support');
  text = text.replace(/\bfactual query\b/gi, 'question');
  text = text.replace(/\bethical dilemma\b/gi, 'situation');
  text = text.replace(/\bcasual conversation\b/gi, 'conversation');
  text = text.replace(/^i understand you're stressed\.?\s*/i, 'I hear you. ');
  text = text.replace(/^it sounds like you're feeling stressed\.?\s*/i, 'I hear you. ');
  text = text.replace(/let'?s explore clarify this together\.?/gi, "Let's work through this together.");
  text = text.replace(/let'?s explore work through this together\.?/gi, "Let's work through this together.");
  text = text.replace(/work through this might help\.?/gi, 'talking it through might help.');
  text = text.replace(/\s{2,}/g, ' ').trim();
  if (!text) {
    return "I'm here with you.";
  }

  if (!/[.!?]$/.test(text)) {
    text = `${text}.`;
  }
  return text;
}

function cognitionProvider(): CognitionProvider {
  const raw = String(process.env.SPRUKED_ORB_COGNITION_PROVIDER || 'cali_skg').trim().toLowerCase();
  if (raw === 'calixone') return 'calixone';
  return 'cali_skg';
}

function primitiveCacheEnabled(): boolean {
  return String(process.env.SPRUKED_ORB_PRIMITIVE_CACHE_ENABLED || '0').trim() === '1';
}

function providerFallbackEnabled(): boolean {
  return String(process.env.SPRUKED_ORB_PROVIDER_FALLBACK || '1').trim() !== '0';
}

function caliOllamaModel(): string {
  return String(process.env.CALI_OLLAMA_MODEL_NAME || process.env.OLLAMA_MODEL || 'llama3.2:1b').trim() || 'llama3.2:1b';
}

function ollamaBase(): string {
  return trimTrailingSlash(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
}

function caliXOneBase(): string {
  return trimTrailingSlash(process.env.CALIXONE_API_BASE || 'http://127.0.0.1:8021');
}

function caliXOneInteractPath(): string {
  const raw = String(process.env.CALIXONE_INTERACT_PATH || '/api/interact').trim();
  return raw.startsWith('/') ? raw : `/${raw}`;
}

async function queryCaliXOne(prompt: string, context: Record<string, unknown>, emotion: string) {
  const base = caliXOneBase();
  const path = caliXOneInteractPath();
  const timeoutMs = Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000;

  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: prompt,
      context,
      emotion,
    }),
    signal: AbortSignal.timeout(Math.max(2000, timeoutMs)),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `Cali X One request failed (${response.status})`);
  }

  const text = String(data?.response || data?.text || '').trim();
  return {
    status: 'success',
    response: text,
    metadata: {
      leading_mind: 'cali',
      confidence: Number(data?.confidence ?? data?.stats?.confidence ?? 0.75),
      truth_likelihood: Number(data?.truth_likelihood ?? 0.75),
      provider: 'calixone',
    },
    audio_url: null,
    audio_engine: KOKORO_TTS_PROVIDER,
  };
}

function caliApiBase(): string {
  return trimTrailingSlash(process.env.CALI_API_URL || 'http://127.0.0.1:8022');
}

function caliAutoStartEnabled(): boolean {
  return String(process.env.SPRUKED_ORB_AUTO_START_CALI || '1').trim() !== '0';
}

function caliApiPort(): string {
  try {
    return new URL(caliApiBase()).port || '8022';
  } catch {
    return '8022';
  }
}

async function caliHealthOk(): Promise<boolean> {
  try {
    const response = await fetch(`${caliApiBase()}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureCaliSkgStarted(): Promise<void> {
  if (!caliAutoStartEnabled() || await caliHealthOk()) return;

  const { siteRoot } = getOrbPaths();
  const starter = path.join(siteRoot, 'scripts', 'start-cp3.sh');
  if (!existsSync(starter)) return;

  const child = spawn(starter, {
    cwd: siteRoot,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      CALI_API_PORT: caliApiPort(),
    },
  });
  child.unref();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await caliHealthOk()) return;
  }
}

function caliSkgRespondPath(): string {
  const raw = String(process.env.CALI_SKG_RESPOND_PATH || '/cali/orb/respond').trim();
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (normalized === '/orb/respond') {
    return '/cali/orb/respond';
  }
  return normalized;
}

function classifyCognitionMode(prompt: string): 'tool_required' | 'normal_chat' | 'deep_reasoning' {
  const normalized = normalizeLocalPrimitivePrompt(prompt);
  if (/\b(weather|forecast|temperature|noaa|current|today|latest|now|search|look up|check)\b/i.test(normalized)) {
    return 'tool_required';
  }
  if (/\b(kant|hume|locke|spinoza|categorical imperative|philosopher|philosophy|governance|doctrine|advisory|deep reason|reasoning stack)\b/i.test(normalized)) {
    return 'deep_reasoning';
  }
  return 'normal_chat';
}

function localToolRequiredResponse(prompt: string, provider: CognitionProvider): Record<string, any> {
  const response = 'That needs a live tool route. I did not send it into philosopher mode or generate a guessed current-info answer.';
  return {
    status: 'success',
    response,
    text: response,
    provider: 'local_tool_router',
    metadata: {
      provider_selected: provider,
      provider_used: 'local_tool_router',
      fallback_reason: 'live tool route unavailable',
      bridge_used: 'none',
      cognition_mode: 'tool_required',
      primitive_bypassed: false,
      provider: 'local_tool_router',
      confidence: 0.2,
      leading_mind: 'tool_router',
      prompt,
    },
  };
}

function localFallbackResponse(
  prompt: string,
  provider: CognitionProvider,
  providerError: string,
): Record<string, any> | null {
  const cognitionMode = classifyCognitionMode(prompt);
  if (cognitionMode === 'deep_reasoning') return null;

  const response = cognitionMode === 'tool_required'
    ? 'That needs a live tool route. The selected cognition provider is unavailable, so I did not send it into philosopher mode.'
    : 'I can help with that, but the selected cognition provider is unavailable. I did not send this into philosopher mode.';

  return {
    status: 'success',
    response,
    text: response,
    provider: `${provider}:fallback-local`,
    metadata: {
      provider_selected: provider,
      provider_used: 'local_fallback',
      fallback_reason: providerError,
      bridge_used: 'none',
      cognition_mode: cognitionMode,
      primitive_bypassed: false,
      provider: `${provider}:fallback-local`,
      provider_error: providerError,
      confidence: 0.2,
      leading_mind: 'local_router',
    },
  };
}

function annotateProviderResponse(
  response: Record<string, any>,
  metadata: Record<string, unknown>,
): Record<string, any> {
  return {
    ...response,
    metadata: {
      ...(response?.metadata || {}),
      ...metadata,
    },
  };
}

function visitorSafeResponse(response: Record<string, any>): Record<string, any> {
  const metadata = response?.metadata && typeof response.metadata === 'object'
    ? { ...response.metadata }
    : {};
  for (const key of [
    'bridge_used',
    'provider_error',
    'llm_core',
    'cognition',
    'governance_wrapper',
    'fallback_reason',
    'provider_selected',
    'provider_used',
    'instance_id',
    'shared_mesh_root',
    'weights',
  ]) {
    delete metadata[key];
  }
  if (metadata.provider && !['primitive_response_cache', 'local_tool_router'].includes(String(metadata.provider))) {
    metadata.provider = 'orb';
  }
  return {
    ...response,
    provider: response?.provider && String(response.provider).includes('fallback') ? 'orb' : response?.provider,
    metadata,
  };
}

async function queryCaliSkg(prompt: string, context: Record<string, unknown>, emotion: string) {
  await ensureCaliSkgStarted();

  const base = caliApiBase();
  const timeoutMs = Number(context?.providerTimeoutMs || process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000;

  const response = await fetch(`${base}${caliSkgRespondPath()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      context,
      emotion,
      model: caliOllamaModel(),
      ollama_model: caliOllamaModel(),
      ollama_base_url: ollamaBase(),
      voice_enabled: false,
      voice_response: false,
      voice: '',
      tts_engine: '',
      tts_base_url: '',
    }),
    signal: AbortSignal.timeout(Math.max(2000, timeoutMs)),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'CALI SKG request failed');
  }

  const text = String(data?.response || data?.response_text || data?.text || '').trim();
  return {
    status: 'success',
    response: text,
    metadata: {
      leading_mind: String(data?.metadata?.leading_mind || 'cali'),
      confidence: Number(data?.metadata?.confidence ?? 0.82),
      truth_likelihood: Number(data?.metadata?.truth_likelihood ?? 0.82),
      provider: String(data?.metadata?.provider || 'cali_skg'),
      cognition: String(data?.metadata?.cognition || 'llama3.2:1b + cali-skg-articulation'),
      llm_core: String(data?.metadata?.llm_core || `ollama:${caliOllamaModel()}`),
      audio_engine: KOKORO_TTS_PROVIDER,
      voice: kokoroVoice(),
      doctrine_ddr: Number(data?.metadata?.doctrine_ddr ?? 0),
      doctrine_state: String(data?.metadata?.doctrine_state || ''),
      governance_wrapper: data?.metadata?.governance_wrapper || null,
      mcp_required: Boolean(data?.metadata?.mcp_required ?? false),
    },
    data: data?.data || null,
    intent: data?.intent || null,
    memory: data?.memory || null,
    audio_url: null,
    audio_engine: KOKORO_TTS_PROVIDER,
  };
}

function caliAdminToken(): string {
  return String(process.env.CALI_ADMIN_TOKEN || process.env.ADMIN_ACCESS_TOKEN || '').trim();
}

function isAdminContext(request: NextRequest, body: any): boolean {
  const headerContext = String(request.headers.get('x-cali-context') || '').toLowerCase();
  const source = String(body?.context?.source || '').toLowerCase();
  return headerContext === 'admin' || source === 'admin';
}

async function queryCaliPersonal(
  request: NextRequest,
  prompt: string,
  body: any,
): Promise<Record<string, any> | null> {
  if (!isAdminContext(request, body)) {
    return null;
  }

  const token = caliAdminToken();
  if (!token) {
    return null;
  }

  await ensureCaliSkgStarted();

  const response = await fetch(`${caliApiBase()}/cali/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: prompt,
      current_path: String(body?.context?.currentPath || body?.context?.current_path || '/admin'),
      context: body?.context || {},
    }),
    signal: AbortSignal.timeout(Math.max(2000, Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000)),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    return null;
  }

  return {
    status: 'success',
    response: String(data?.response || '').trim() || 'Cali is online.',
    data: data?.data || null,
    intent: data?.intent || null,
    metadata: {
      leading_mind: 'cali',
      confidence: 0.9,
      truth_likelihood: 0.9,
      provider: 'cali-personal',
      cognition: 'cali-skg-personal',
    },
  };
}


function providerReasoningMode(providerValue: string): OrbReasoningMode {
  if (providerValue.includes('fallback')) return 'shared';
  if (providerValue === 'native' || providerValue === 'cali-personal') return 'local';
  if (providerValue === 'cali_skg') return 'hybrid';
  return 'shared';
}

function providerFallbackState(providerValue: string, response: Record<string, any> | null, error?: string): string {
  if (error) return error;
  if (providerValue.includes('fallback')) {
    return String(response?.metadata?.provider_error || 'provider fallback to native web ORB');
  }
  return 'none';
}

function providerReasoningProfile(providerValue: string, response: Record<string, any> | null): string {
  const metadata = response?.metadata || {};
  if (metadata.cognition) return String(metadata.cognition);
  if (metadata.llm_core) return String(metadata.llm_core);
  if (providerValue === 'native') return 'CALI SKG website runtime';
  if (providerValue === 'cali-personal') return 'CALI personal query';
  if (providerValue === 'calixone') return 'Cali X One /api/interact';
  if (providerValue === 'cali_skg') return `ollama:${caliOllamaModel()} + cali-skg-articulation`;
  return providerValue || 'unknown';
}

function responseProvider(provider: CognitionProvider, response: Record<string, any> | null): string {
  return String(response?.metadata?.provider || provider || 'cali_skg');
}

function responseVoiceEngine(response: Record<string, any> | null, action: string): string {
  const engine = response?.audio_engine || response?.voice?.engine || response?.metadata?.audio_engine;
  if (engine) return String(engine);
  if (action === 'query' || action === 'speak') return KOKORO_TTS_PROVIDER;
  return KOKORO_TTS_PROVIDER;
}

function responseVoiceProfile(response: Record<string, any> | null): string {
  const voice = response?.voice?.profile || response?.voice?.voice || response?.voice || response?.metadata?.voice;
  if (voice && typeof voice !== 'object') return String(voice);
  return kokoroVoice();
}

function contextSourceForRequest(request: NextRequest, body: any): string {
  if (isAdminContext(request, body)) {
    return 'Spruked admin dashboard context + x-cali-context=admin + CALI_API_URL when available';
  }
  return 'Spruked public website context + CALI SKG website runtime + /mnt/r/orb_mesh';
}

async function reportSprukedOrbState(
  request: NextRequest,
  body: any,
  action: string,
  response: Record<string, any> | null,
  error?: string,
) {
  const admin = isAdminContext(request, body);
  const provider = cognitionProvider();
  const providerValue = responseProvider(provider, response);
  const ttsReady = Boolean(response?.audio_url || response?.audio_wav_base64 || response?.voice_ready || response?.metadata?.voice_ready);
  const reasoningAction = action === 'query' || action === 'research';
  const synthesisAction = action === 'query' || action === 'speak';

  await updateOrbState({
    site_id: 'spruked.com',
    orb_id: admin ? 'spruked-admin-orb' : 'spruked-global-orb',
    display_name: admin ? 'Spruked Admin ORB' : 'Spruked Global ORB',
    frontend_component: admin ? '/home/bryan/spruked.com/components/admin/CaliOperationsHub.tsx' : '/home/bryan/spruked.com/components/ui/GlobalOrb.tsx',
    endpoint: '/api/orb',
    handler: admin ? '/home/bryan/spruked.com/app/api/orb/route.ts:queryCaliPersonal/queryByProvider' : '/home/bryan/spruked.com/app/api/orb/route.ts:queryByProvider',
    reasoning_profile: providerReasoningProfile(providerValue, response),
    context_source: contextSourceForRequest(request, body),
    reasoning_mode: providerReasoningMode(providerValue),
    fallback_state: providerFallbackState(providerValue, response, error),
    last_reasoning_timestamp: reasoningAction ? new Date().toISOString() : undefined,
    voice_engine: responseVoiceEngine(response, action),
    voice_profile: responseVoiceProfile(response),
    tts_ready: ttsReady,
    last_synthesis_timestamp: synthesisAction && ttsReady ? new Date().toISOString() : undefined,
    last_error: error || null,
    service_health: error ? 'degraded' : 'online',
    orb_health: response?.status === 'error' || error ? 'degraded' : 'ready',
    reasoning_state: error ? 'error' : providerValue,
    voice_state: ttsReady ? 'server-tts-ready' : 'text-only-voice-unavailable',
  });
}

async function queryByProvider(prompt: string, context: Record<string, unknown>, emotion: string) {
  const provider = cognitionProvider();
  const cognitionMode = classifyCognitionMode(prompt);

  try {
    if (provider === 'calixone') {
      return annotateProviderResponse(await queryCaliXOne(prompt, context, emotion), {
        provider_selected: provider,
        provider_used: 'calixone',
        fallback_reason: null,
        bridge_used: `${caliXOneBase()}${caliXOneInteractPath()}`,
        cognition_mode: 'provider_chat',
        primitive_bypassed: false,
      });
    }
    if (provider === 'cali_skg') {
      return annotateProviderResponse(await queryCaliSkg(prompt, context, emotion), {
        provider_selected: provider,
        provider_used: 'cali_skg',
        fallback_reason: null,
        bridge_used: `${caliApiBase()}${caliSkgRespondPath()}`,
        cognition_mode: 'hybrid_provider',
        primitive_bypassed: false,
      });
    }
  } catch (error: any) {
    if (!providerFallbackEnabled()) {
      throw error;
    }
    const providerError = String(error?.message || error || 'Unknown provider failure');
    const toolLocal = cognitionMode === 'tool_required'
      ? localFallbackResponse(prompt, provider, providerError)
      : null;
    if (toolLocal) return toolLocal;

    const local = localFallbackResponse(prompt, provider, providerError);
    if (local) return local;
    throw error;
  }

  const local = localFallbackResponse(prompt, provider, 'unknown provider selection');
  if (local) return local;
  throw new Error('CALI SKG provider unavailable');
}

export async function GET() {
  try {
    const mesh = await getWebMeshStatus();

    await updateOrbState({
      site_id: 'spruked.com',
      orb_id: 'spruked-global-orb',
      display_name: 'Spruked Global ORB',
      frontend_component: '/home/bryan/spruked.com/components/ui/GlobalOrb.tsx',
      endpoint: '/api/orb',
      handler: '/home/bryan/spruked.com/app/api/orb/route.ts:GET',
      reasoning_profile: providerReasoningProfile(cognitionProvider(), null),
      context_source: 'Spruked public website context + CALI SKG website runtime + /mnt/r/orb_mesh',
      reasoning_mode: providerReasoningMode(cognitionProvider()),
      fallback_state: 'none',
      voice_engine: KOKORO_TTS_PROVIDER,
      voice_profile: kokoroVoice(),
      tts_ready: false,
      service_health: 'online',
      orb_health: 'ready',
      reasoning_state: cognitionProvider(),
      voice_state: 'not-synthesized',
      last_error: null,
    });

    return NextResponse.json({
      status: 'success',
      response: 'Website ORB ready.',
      metadata: { instance_id: 'web', cognition: 'cali_skg' },
      provider: cognitionProvider(),
      orb_status: {
        source: 'cali_skg_website_runtime',
        electron_adapter: 'Orb_Assistant/electron_dock_adapter',
        electron_cognition: 'adapter_only',
        voice_engine: KOKORO_TTS_PROVIDER,
        llm_core: `ollama:${caliOllamaModel()}`,
      },
      mesh,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to load website ORB status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'query').trim().toLowerCase();

    if (action === 'query') {
      const prompt = String(body?.prompt || body?.message || body?.text || '').trim();
      if (!prompt) {
        return badRequest('Missing prompt');
      }

      const identityResponse = deterministicIdentityResponse(prompt);
      if (identityResponse) {
        const response = await withKokoroVoice(identityResponse);
        await reportSprukedOrbState(request, body, action, response);
        return NextResponse.json(visitorSafeResponse(response));
      }

      const localPrimitive = primitiveCacheEnabled() ? routeLocalPrimitive(prompt) : null;
      if (localPrimitive) {
        const response = {
          status: 'success',
          intent: localPrimitive.intent,
          response: localPrimitive.response,
          text: localPrimitive.response,
          provider: localPrimitive.provider,
          bypassed_provider: localPrimitive.bypassed_provider,
          bypassed_governance: localPrimitive.bypassed_governance,
          debug_marker: 'spruked_local_pre_router_v1',
          metadata: {
            provider_selected: cognitionProvider(),
            provider_used: localPrimitive.provider,
            fallback_reason: null,
            bridge_used: 'none',
            cognition_mode: localPrimitive.intent,
            primitive_bypassed: true,
            provider: localPrimitive.provider,
            intent: localPrimitive.intent,
            trigger: localPrimitive.trigger,
            bypass_heavy_reasoning: localPrimitive.bypass_heavy_reasoning,
            bypassed_provider: localPrimitive.bypassed_provider,
            bypassed_governance: localPrimitive.bypassed_governance,
            log_event: localPrimitive.log_event,
            confidence: 1,
            leading_mind: localPrimitive.intent,
            debug_marker: 'spruked_local_pre_router_v1',
          },
        };

        await publishWebArtifact(
          'insight',
          {
            kind: localPrimitive.intent,
            prompt,
            response: localPrimitive.response,
            trigger: localPrimitive.trigger,
            bypass_heavy_reasoning: true,
            bypassed_provider: true,
            bypassed_governance: true,
            debug_marker: 'spruked_local_pre_router_v1',
          },
          {
            target_orb: 'shared',
            confidence: 1,
            tags: ['website_orb', localPrimitive.intent],
          }
        );

        const voicedResponse = await withKokoroVoice(response);
        await reportSprukedOrbState(request, body, action, voicedResponse);
        return NextResponse.json(visitorSafeResponse(voicedResponse));
      }

      const provider = cognitionProvider();
      const caliPersonal = await queryCaliPersonal(request, prompt, body).catch(() => null);
      if (caliPersonal) {
        const normalizedResponseText = normalizeCompanionText(String(caliPersonal?.response || ''), prompt);
        if (normalizedResponseText) {
          caliPersonal.response = normalizedResponseText;
          if (typeof caliPersonal?.text === 'string') {
            caliPersonal.text = normalizedResponseText;
          }
        }

        await publishWebArtifact(
          'insight',
          {
            kind: 'query_response',
            prompt,
            response: caliPersonal.response,
            leading_mind: caliPersonal.metadata?.leading_mind || 'cali',
            confidence: caliPersonal.metadata?.confidence || 0,
          },
          {
            target_orb: 'shared',
            confidence: caliPersonal.metadata?.confidence || 0.5,
            tags: ['website_orb', 'query'],
          }
        );

        const voicedResponse = await withKokoroVoice(caliPersonal);
        await reportSprukedOrbState(request, body, action, voicedResponse);
        return NextResponse.json(visitorSafeResponse(voicedResponse));
      }

      if (classifyCognitionMode(prompt) === 'tool_required') {
        const response = await withKokoroVoice(localToolRequiredResponse(prompt, provider));
        await reportSprukedOrbState(request, body, action, response);
        return NextResponse.json(visitorSafeResponse(response));
      }

      let response =
        await queryByProvider(prompt, body?.context || {}, body?.emotion || 'thoughtful_warm');
      if (response?.metadata?.cognition_mode !== 'deep_reasoning') {
        const normalizedResponseText = normalizeCompanionText(String(response?.response || ''), prompt);
        if (normalizedResponseText) {
          response.response = normalizedResponseText;
          if (typeof response?.text === 'string') {
            response.text = normalizedResponseText;
          }
        }
      }
      response = await withKokoroVoice(response);

      await publishWebArtifact(
        'insight',
        {
          kind: 'query_response',
          prompt,
          response: response.response,
          leading_mind: response.metadata?.leading_mind || 'cali',
          confidence: response.metadata?.confidence || 0,
        },
        {
          target_orb: 'shared',
          confidence: response.metadata?.confidence || 0.5,
          tags: ['website_orb', 'query'],
        }
      );

      await reportSprukedOrbState(request, body, action, response);
      return NextResponse.json(visitorSafeResponse(response));
    }

    if (action === 'research') {
      const query = String(body?.query || body?.prompt || '').trim();
      if (!query) {
        return badRequest('Missing research query');
      }

      const domains = Array.isArray(body?.domains) ? body.domains.filter(Boolean) : [];
      const response = {
        status: 'success',
        response: 'Research is routed through CALI SKG website tools. The old Electron research bridge is archived.',
        text: 'Research is routed through CALI SKG website tools. The old Electron research bridge is archived.',
        metadata: {
          provider: 'cali_skg',
          leading_mind: 'cali',
          confidence: 0.5,
          confidence_aggregate: 0.5,
          truth_likelihood: 0.5,
          domains,
          successful_returns: 0,
        },
      };

      await publishWebArtifact(
        'insight',
        {
          kind: 'research_summary',
          query,
          domains: response.metadata?.domains || domains,
          response: response.response,
          successful_returns: response.metadata?.successful_returns || 0,
        },
        {
          target_orb: 'shared',
          confidence: response.metadata?.confidence_aggregate || 0.5,
          tags: ['website_orb', 'research'],
        }
      );

      await reportSprukedOrbState(request, body, action, response);
      return NextResponse.json(visitorSafeResponse(response));
    }

    if (action === 'speak') {
      const text = String(body?.text || body?.prompt || '').trim();
      if (!text) {
        return badRequest('Missing speech text');
      }

      const response = await withKokoroVoice({
        status: 'success',
        response: text,
        text,
        metadata: {
          provider: 'local_speak',
          leading_mind: 'cali',
          confidence: 1,
          truth_likelihood: 1,
        },
      }, text);
      await reportSprukedOrbState(request, body, action, response);
      return NextResponse.json(visitorSafeResponse(response));
    }

    if (action === 'status') {
      const mesh = await getWebMeshStatus();
      await reportSprukedOrbState(request, body, action, { status: 'success', metadata: { provider: cognitionProvider() } });
      return NextResponse.json({
        status: 'success',
        response: 'Website ORB status available.',
        metadata: { instance_id: 'web', cognition: 'cali_skg' },
        orb_status: {
        source: 'cali_skg_website_runtime',
          electron_adapter: 'Orb_Assistant/electron_dock_adapter',
          electron_cognition: 'adapter_only',
          voice_engine: KOKORO_TTS_PROVIDER,
          llm_core: `ollama:${caliOllamaModel()}`,
      },
      mesh,
      });
    }

    if (action === 'mesh_status') {
      return NextResponse.json({
        status: 'success',
        mesh: await getWebMeshStatus(),
      });
    }

    if (action === 'mesh_publish') {
      const type = String(body?.type || 'insight') as any;
      const payload = body?.payload || {};
      const metadata = body?.metadata || {};
      const artifact = await publishWebArtifact(type, payload, metadata);
      return NextResponse.json({ status: 'success', artifact });
    }

    if (action === 'mesh_submit_task') {
      const targetOrb = String(body?.targetOrb || body?.target_orb || 'broadcast').trim();
      const taskType = String(body?.taskType || body?.task_type || 'generic').trim();
      const payload = body?.payload || {};
      const priority = String(body?.priority || 'normal').trim();
      const task = await submitWebTask(targetOrb, taskType, payload, priority);
      return NextResponse.json({ status: 'success', task });
    }

    if (action === 'mesh_list_exports') {
      const otherOrbId = String(body?.otherOrbId || body?.other_orb_id || '').trim();
      if (!otherOrbId) {
        return badRequest('Missing otherOrbId');
      }
      const files = await listOtherOrbExports(otherOrbId);
      return NextResponse.json({ status: 'success', files });
    }

    if (action === 'mesh_import_artifact') {
      const otherOrbId = String(body?.otherOrbId || body?.other_orb_id || '').trim();
      const artifactPath = String(body?.artifactRelativePath || body?.artifact_path || '').trim();
      if (!otherOrbId || !artifactPath) {
        return badRequest('Missing otherOrbId or artifactRelativePath');
      }
      const checkpoint = await importOtherOrbArtifact(otherOrbId, artifactPath);
      return NextResponse.json({ status: 'success', checkpoint });
    }

    return badRequest(`Unsupported action: ${action}`);
  } catch (error: any) {
    const message = 'Website ORB request failed';
    try {
      await updateOrbState({
        site_id: 'spruked.com',
        orb_id: 'spruked-global-orb',
        display_name: 'Spruked Global ORB',
        frontend_component: '/home/bryan/spruked.com/components/ui/GlobalOrb.tsx',
        endpoint: '/api/orb',
        handler: '/home/bryan/spruked.com/app/api/orb/route.ts:POST',
        reasoning_profile: providerReasoningProfile(cognitionProvider(), null),
        context_source: 'Spruked public website context + Orb_Assistant web runtime + /mnt/r/orb_mesh',
        reasoning_mode: providerReasoningMode(cognitionProvider()),
        fallback_state: message,
        voice_engine: 'unknown',
        voice_profile: 'unknown',
        tts_ready: false,
        service_health: 'degraded',
        orb_health: 'degraded',
        reasoning_state: 'error',
        voice_state: 'unknown',
        last_error: message,
      });
    } catch {}
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}
