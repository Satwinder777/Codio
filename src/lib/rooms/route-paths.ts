const STATIC_ROOT_ROUTES = new Set([
  'dashboard',
  'login',
  'signup',
  'forgot-password',
  'settings',
  'privacy',
  'terms',
  'api',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

export function isRoomEditorPath(pathname: string | null): boolean {
  if (!pathname || pathname === '/') return false;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) return !STATIC_ROOT_ROUTES.has(segments[0].toLowerCase());
  return segments.length === 2 && segments[0] === 'room';
}
