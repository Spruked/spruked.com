import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKORB_SKIN_PATH = path.join(
  process.cwd(),
  'public',
  'orb',
  'blueeyeorb1600.png',
);

export async function GET() {
  try {
    const skin = await fs.readFile(WORKORB_SKIN_PATH);
    return new NextResponse(new Uint8Array(skin), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return NextResponse.json(
        { status: 'error', message: 'WORKORB skin not found' },
        { status: 404 },
      );
    }
    throw error;
  }
}
