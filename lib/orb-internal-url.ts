export function orbInternalUrl(pathname = '/api/orb'): URL {
  const configured = String(process.env.ORB_INTERNAL_BASE_URL || '').trim();
  const port = String(process.env.PORT || '3001').trim() || '3001';
  const base = configured || `http://127.0.0.1:${port}`;
  return new URL(pathname, base.endsWith('/') ? base : `${base}/`);
}
