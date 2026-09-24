import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  readSessionToken,
  COOKIE_NAME,
  SESSION_ACTOR_HEADER,
  SESSION_NAME_HEADER,
  SESSION_ROLE_HEADER,
} from '@/lib/session';
import { esModoDemoAdmin } from '@/lib/fase3a/adminDemo';
import { capacidadParaRuta } from '@/lib/fase9/autorizacion';
import { rolTieneCapacidad } from '@/lib/fase9/roles';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';

  if (esModoDemoAdmin(process.env.NODE_ENV, pathname, request.nextUrl.searchParams.get('demo'))) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login' || pathname === '/api/admin/auth/login') {
    if (pathname === '/admin/login' && secret) {
      const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
      if (token && await readSessionToken(token, secret)) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const session = secret && token ? await readSessionToken(token, secret) : null;
  if (!session) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const capacidad = capacidadParaRuta(pathname, request.method);
  if (capacidad && !rolTieneCapacidad(session.rol, capacidad)) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ ok: false, error: 'Acceso denegado.' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/admin?acceso=denegado', request.url));
  }

  // El cliente no puede elegir estos valores: se reemplazan después de validar
  // la firma, la expiración y el rol del token.
  const headers = new Headers(request.headers);
  headers.delete(SESSION_ACTOR_HEADER);
  headers.delete(SESSION_NAME_HEADER);
  headers.delete(SESSION_ROLE_HEADER);
  headers.set(SESSION_ACTOR_HEADER, session.actor_id);
  headers.set(SESSION_ROLE_HEADER, session.rol);
  if (session.nombre) headers.set(SESSION_NAME_HEADER, session.nombre);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/admin', '/admin/:path+', '/api/admin/:path+'],
};
