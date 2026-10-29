import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
export function proxy(req: NextRequest) {
  const password = process.env.ASSISTANT_PASSWORD;
  if (!password && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Set ASSISTANT_PASSWORD before hosting this private assistant.' }, { status: 503 });
  }
  if (password) {
    const expected = Buffer.from(`owner:${password}`);
    const header = req.headers.get('authorization') || '';
    const actual = Buffer.from(header.startsWith('Basic ') ? header.slice(6) : '', 'base64');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return new NextResponse('Owner authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="SovereignClaw", charset="UTF-8"' } });
    }
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (origin) {
      try { if (new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ error: 'Cross-origin action refused' }, { status: 403 }); }
      catch { return NextResponse.json({ error: 'Invalid origin' }, { status: 400 }); }
    }
    if (!req.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'JSON content type required' }, { status: 415 });
    if (Number(req.headers.get('content-length') || 0) > 65536) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export const config = { matcher: ['/', '/api/:path*'] };
