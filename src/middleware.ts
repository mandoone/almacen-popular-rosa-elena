import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/session';

/**
 * Middleware de autenticación admin.
 *
 * Rutas protegidas (definidas en `config.matcher`):
 *   /admin          → redirect a /admin/login si sin sesión
 *   /admin/*        → ídem
 *   /api/admin/*    → 401 JSON si sin sesión
 *
 * Rutas públicas (pasan sin verificar):
 *   /admin/login
 *   /api/admin/auth/*
 *
 * Caso especial:
 *   /admin/login con sesión válida → redirect a /admin (evita loop)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';

  // ── Rutas de autenticación: siempre permitidas ────────────────────────────
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/auth/')
  ) {
    // Si ya tiene sesión válida y va al login → redirigir al panel
    if (pathname === '/admin/login' && secret) {
      const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
      if (token && (await verifySessionToken(token, secret))) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  // ── Verificar sesión ──────────────────────────────────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const valid = secret && token ? await verifySessionToken(token, secret) : false;

  if (!valid) {
    // Rutas API → 401 JSON (no redirect)
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json(
        { ok: false, error: 'No autorizado.' },
        { status: 401 }
      );
    }
    // Páginas → redirect al login
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path+', '/api/admin/:path+'],
};
