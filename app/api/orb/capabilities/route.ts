import { NextResponse } from 'next/server';
import { ORB_CAPABILITIES } from '@/lib/orb-capability-registry';
import { publicSiteWorld } from '@/lib/orb-site-world';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    voice_runtime: 'website-orb-v1',
    input: {
      browser_speech_recognition: false,
      media_recorder: true,
      automatic_silence_stop: true,
      endpoint: '/api/orb/website-voice',
    },
    output: {
      browser_speech_synthesis: false,
      server_tts: true,
      provider: 'kokoro',
      fallback_provider: 'qwen',
      priority: ['kokoro', 'qwen'],
      tts_endpoint: '/api/orb/tts',
      wav_endpoint: '/api/orb/tts/{audio_id}',
    },
    turn_contract: {
      one_click_start: true,
      second_click_cancels_recording: true,
      click_interrupts_playback: true,
      single_flight_guard: true,
      abort_controller_per_turn: true,
    },
    capability_registry: ORB_CAPABILITIES,
    site_world: publicSiteWorld(),
    execution_contract: {
      authorization_required: true,
      browser_dom_is_position_authority: true,
      pending_is_not_success: true,
      success_requires_tool_result: true,
    },
  });
}
