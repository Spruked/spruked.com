import { NextRequest, NextResponse } from 'next/server';
import type { PageSlug, PageContentMap } from '@/data/page-content';
import { getPageContent, isPageSlug, updatePageContent } from '@/lib/page-content';

export async function GET(request: NextRequest) {
  const slugParam = request.nextUrl.searchParams.get('slug');

  if (!isPageSlug(slugParam)) {
    return NextResponse.json({ error: 'Missing or invalid slug parameter.' }, { status: 400 });
  }

  const slug = slugParam;

  const content = await getPageContent(slug);

  return NextResponse.json({ slug, content });
}

export async function PUT(request: NextRequest) {
  const slugParam = request.nextUrl.searchParams.get('slug');

  if (!isPageSlug(slugParam)) {
    return NextResponse.json({ error: 'Missing or invalid slug parameter.' }, { status: 400 });
  }

  const slug = slugParam;

  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const authorization = request.headers.get('authorization');

  if (!adminToken) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_ACCESS_TOKEN. Configure the environment before editing content.' },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let payload: PageContentMap[typeof slug];

  try {
    payload = (await request.json()) as PageContentMap[typeof slug];
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    await updatePageContent(slug, payload);
    return NextResponse.json({ slug, status: 'updated' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
