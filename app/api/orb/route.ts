import { NextRequest, NextResponse } from 'next/server';
import {
  getWebMeshStatus,
  importOtherOrbArtifact,
  listOtherOrbExports,
  publishWebArtifact,
  runWebOrbCommand,
  submitWebTask,
} from '@/lib/orb-server';
import { updateOrbState, type OrbReasoningMode } from '@/lib/orb-introspection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CognitionProvider = 'kaygee_hybrid';

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

function normalizeCompanionText(rawText: string, prompt: string): string {
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
    return '';
  }

  if (!/[.!?]$/.test(text)) {
    text = `${text}.`;
  }
  return text;
}

function cognitionProvider(): CognitionProvider {
  return 'kaygee_hybrid';
}

function kaygeeVoiceEnabled(): boolean {
  return String(process.env.KAYGEE_VOICE_ENABLED || '1').trim() === '1';
}

function kaygeeVoice(): string {
  return String(process.env.KAYGEE_VOICE || 'af_bella').trim() || 'af_bella';
}

function caliApiBase(): string {
  return trimTrailingSlash(process.env.CALI_API_URL || 'http://127.0.0.1:8022');
}

function kayGeeHybridRespondPath(): string {
  const raw = String(process.env.KAYGEE_HYBRID_RESPOND_PATH || '/cali/orb/respond').trim();
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (normalized === '/orb/respond') {
    return '/cali/orb/respond';
  }
  return normalized;
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

async function queryKayGeeHybrid(prompt: string, context: Record<string, unknown>, emotion: string) {
  const base = caliApiBase();
  const timeoutMs = Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000;

  const response = await fetch(`${base}${kayGeeHybridRespondPath()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      context,
      emotion,
    }),
    signal: AbortSignal.timeout(Math.max(2000, timeoutMs)),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `KayGee hybrid request failed (${response.status})`);
  }

  const text = String(data?.response || data?.response_text || data?.text || '').trim();
  return {
    status: 'success',
    response: text,
    metadata: {
      leading_mind: String(data?.metadata?.leading_mind || 'cali'),
      confidence: Number(data?.metadata?.confidence ?? 0.82),
      truth_likelihood: Number(data?.metadata?.truth_likelihood ?? 0.82),
      provider: String(data?.metadata?.provider || 'kaygee_hybrid'),
      cognition: String(data?.metadata?.cognition || 'llama.cpp-core + kaygee-governance + cali-skg-articulation'),
      llm_core: String(data?.metadata?.llm_core || 'llama.cpp:local'),
      doctrine_ddr: Number(data?.metadata?.doctrine_ddr ?? 0),
      doctrine_state: String(data?.metadata?.doctrine_state || ''),
      governance_wrapper: data?.metadata?.governance_wrapper || null,
      mcp_required: Boolean(data?.metadata?.mcp_required ?? false),
    },
    data: data?.data || null,
    intent: data?.intent || null,
    audio_url: normalizeAudioUrl(data?.audio_url, base),
    audio_engine: data?.audio_engine || null,
  };
}

async function synthesizeCaliVoice(text: string, voice?: string) {
  const base = caliApiBase();
  const timeoutMs = Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000;

  const response = await fetch(`${base}/cali/orb/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: voice || kaygeeVoice(),
    }),
    signal: AbortSignal.timeout(Math.max(5000, timeoutMs)),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.status === 'error') {
    throw new Error(data?.detail || data?.message || `CALI TTS request failed (${response.status})`);
  }

  return {
    status: 'success',
    response: text,
    text,
    audio_url: normalizeAudioUrl(data?.audio_url, base),
    audio_engine: data?.audio_engine || data?.metadata?.audio_engine || null,
    metadata: {
      ...(data?.metadata || {}),
      provider: 'cali-tts',
      leading_mind: 'cali',
      confidence: 0.9,
      truth_likelihood: 0.9,
      voice_ready: Boolean(data?.audio_url),
    },
  };
}

async function warmCaliVoice(voice?: string) {
  const base = caliApiBase();
  const startedAt = Date.now();
  const timeoutMs = Number(process.env.SPRUKED_ORB_PROVIDER_TIMEOUT_MS || '18000') || 18000;

  const response = await fetch(`${base}/cali/orb/tts/warmup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice: voice || kaygeeVoice() }),
    signal: AbortSignal.timeout(Math.max(5000, timeoutMs)),
  });

  const data = await response.json().catch(() => ({}));
  const latencyMs = Number(data?.latency_ms ?? Date.now() - startedAt);
  const ready = Boolean(data?.voice_ready || data?.metadata?.voice_ready);

  return {
    status: response.ok && data?.status !== 'error' ? 'success' : 'error',
    response: 'CALI voice warm-up recorded.',
    audio_engine: data?.audio_engine || data?.metadata?.audio_engine || 'kokoro_local',
    metadata: {
      ...(data?.metadata || {}),
      provider: 'cali-tts-warmup',
      voice_ready: ready,
      warmup_state: data?.warmup_state || data?.status || 'unknown',
      warmup_latency_ms: latencyMs,
      warmup_non_blocking: true,
    },
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
  const responseText = String(data?.response || '').trim();
  if (!responseText) {
    return null;
  }

  return {
    status: 'success',
    response: responseText,
    data: data?.data || null,
    intent: data?.intent || null,
    metadata: {
      leading_mind: 'kaygee',
      confidence: 0.9,
      truth_likelihood: 0.9,
      provider: 'cali-personal',
      cognition: 'kaygee-1.0',
    },
  };
}


function providerReasoningMode(providerValue: string): OrbReasoningMode {
  if (providerValue.includes('fallback')) return 'shared';
  if (providerValue === 'cali-personal') return 'local';
  if (providerValue === 'kaygee_hybrid') return 'hybrid';
  return 'shared';
}

function providerFallbackState(providerValue: string, response: Record<string, any> | null, error?: string): string {
  if (error) return error;
  if (providerValue.includes('fallback')) {
    return String(response?.metadata?.provider_error || 'provider fallback reported');
  }
  return 'none';
}

function providerReasoningProfile(providerValue: string, response: Record<string, any> | null): string {
  const metadata = response?.metadata || {};
  if (metadata.cognition) return String(metadata.cognition);
  if (metadata.llm_core) return String(metadata.llm_core);
  if (providerValue === 'cali-personal') return 'kaygee-1.0 admin CALI personal query';
  if (providerValue === 'kaygee_hybrid') return 'llama.cpp-core + kaygee-governance + cali-skg-articulation';
  return providerValue || 'unknown';
}

function responseProvider(provider: CognitionProvider, response: Record<string, any> | null): string {
  return String(response?.metadata?.provider || provider || 'native');
}

function responseVoiceEngine(response: Record<string, any> | null, action: string): string {
  const engine = response?.audio_engine || response?.voice?.engine || response?.metadata?.audio_engine;
  if (engine) return String(engine);
  if (action === 'speak') return 'Kokoro local TTS via CALI';
  return kaygeeVoiceEnabled() ? 'Kokoro local TTS via CALI; Qwen3-TTS backup' : 'server TTS disabled';
}

function responseVoiceProfile(response: Record<string, any> | null): string {
  const voice = response?.voice?.profile || response?.voice?.voice || response?.voice || response?.metadata?.voice;
  if (voice && typeof voice !== 'object') return String(voice);
  return `${kaygeeVoice()} via Kokoro local voice pack`;
}

function contextSourceForRequest(request: NextRequest, body: any): string {
  if (isAdminContext(request, body)) {
    return 'Spruked admin dashboard context + x-cali-context=admin + CALI_API_URL when available';
  }
  return 'Spruked public website context + Orb_Assistant web runtime + /mnt/r/orb_mesh';
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
  const synthesisAction = action === 'query' || action === 'speak' || action === 'voice_warmup';

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
    voice_state: ttsReady ? 'server-tts-ready' : 'server-tts-unavailable',
  });
}

async function queryByProvider(prompt: string, context: Record<string, unknown>, emotion: string) {
  const provider = cognitionProvider();
  const websiteContext = {
    site_world: {
      site: 'spruked.com',
      role: 'public Website ORB',
      navigation_contract: 'CALI cognition first, then verified site pointer/navigation action',
      key_routes: '/, /products, /cart, /checkout',
    },
    ...context,
  };
  return annotateProviderResponse(await queryKayGeeHybrid(prompt, websiteContext, emotion), {
    provider_selected: provider,
    provider_used: 'kaygee_hybrid',
    fallback_reason: null,
    bridge_used: `${caliApiBase()}${kayGeeHybridRespondPath()}`,
    cognition_mode: 'hybrid_provider',
  });
}

export async function GET() {
  try {
    const [orb, mesh] = await Promise.all([
      runWebOrbCommand({ action: 'status' }),
      getWebMeshStatus(),
    ]);

    await updateOrbState({
      site_id: 'spruked.com',
      orb_id: 'spruked-global-orb',
      display_name: 'Spruked Global ORB',
      frontend_component: '/home/bryan/spruked.com/components/ui/GlobalOrb.tsx',
      endpoint: '/api/orb',
      handler: '/home/bryan/spruked.com/app/api/orb/route.ts:GET',
      reasoning_profile: providerReasoningProfile(cognitionProvider(), null),
      context_source: 'Spruked public website context + Orb_Assistant web runtime + /mnt/r/orb_mesh',
      reasoning_mode: providerReasoningMode(cognitionProvider()),
      fallback_state: 'none',
      voice_engine: kaygeeVoiceEnabled() ? 'Kokoro local TTS via CALI; Qwen3-TTS backup' : 'server TTS disabled',
      voice_profile: `${kaygeeVoice()} via Kokoro local voice pack`,
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
      metadata: { instance_id: 'web' },
      provider: cognitionProvider(),
      orb_status: orb.orb_status,
      mesh,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to load website ORB status' },
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

        await reportSprukedOrbState(request, body, action, caliPersonal);
        return NextResponse.json(caliPersonal);
      }

      const response =
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
      return NextResponse.json(response);
    }

    if (action === 'research') {
      const query = String(body?.query || body?.prompt || '').trim();
      if (!query) {
        return badRequest('Missing research query');
      }

      const domains = Array.isArray(body?.domains) ? body.domains.filter(Boolean) : [];
      const response = await runWebOrbCommand({
        action: 'research',
        query,
        domains,
        emotion: body?.emotion || 'analytical',
      });

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
      return NextResponse.json(response);
    }

    if (action === 'speak') {
      const text = String(body?.text || body?.prompt || '').trim();
      if (!text) {
        return badRequest('Missing server TTS text');
      }

      const response = await synthesizeCaliVoice(text, body?.voice);
      await reportSprukedOrbState(request, body, action, response);
      return NextResponse.json(response);
    }

    if (action === 'voice_warmup') {
      const response = await warmCaliVoice(body?.voice);
      await reportSprukedOrbState(request, body, action, response);
      return NextResponse.json(response, { status: response.status === 'success' ? 200 : 503 });
    }

    if (action === 'status') {
      const [orb, mesh] = await Promise.all([
        runWebOrbCommand({ action: 'status' }),
        getWebMeshStatus(),
      ]);
      await reportSprukedOrbState(request, body, action, { status: 'success', metadata: { provider: cognitionProvider() } });
      return NextResponse.json({
        status: 'success',
        response: 'Website ORB status available.',
        metadata: { instance_id: 'web' },
        orb_status: orb.orb_status,
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
    const message = error?.message || 'Website ORB request failed';
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
