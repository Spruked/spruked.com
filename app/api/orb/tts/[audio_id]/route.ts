import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getOrbPaths } from '@/lib/orb-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { audio_id: string } },
) {
  const audioId = String(params.audio_id || '').trim();
  if (!/^[a-z0-9_.-]+\.wav$/i.test(audioId)) {
    return NextResponse.json({ status: 'error', message: 'Invalid audio file' }, { status: 400 });
  }

  const { webSystemRoot } = getOrbPaths();
  const voiceCacheRoot = path.resolve(webSystemRoot, 'CALI_System', 'voice_cache');
  const audioPath = path.resolve(voiceCacheRoot, audioId);
  if (!audioPath.startsWith(`${voiceCacheRoot}${path.sep}`)) {
    return NextResponse.json({ status: 'error', message: 'Invalid audio path' }, { status: 400 });
  }

  try {
    const audio = await fs.readFile(audioPath);
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ status: 'error', message: 'Audio file not found' }, { status: 404 });
    }
    throw error;
  }
}
