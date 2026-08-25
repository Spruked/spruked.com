import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  if (host === 'localhost:21010' || host === '127.0.0.1:21010') {
    if (request.nextUrl.pathname === '/') {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = '/admin';
      return NextResponse.redirect(nextUrl);
    }
  }

  return NextResponse.next();
}

