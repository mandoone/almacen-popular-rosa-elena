import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  crearSessionKeyring,
  readSessionTokenConRotacion,
  COOKIE_NAME,
  SESSION_ACTOR_HEADER,
  SESSION_NAME_HEADER,
  SESSION_ROLE_HEADER,
} from '@/lib/session';
import { esModoDemoAdmin } from '@/lib/fase3a/adminDemo';
import { capacidadParaRuta } from '@/lib/fase9/autorizacion';
import { rolTieneCapacidad } from '@/lib/fase9/roles';
import { sesionCorrespondeAUsuario } from '@/lib/fase9/identidades';
import { leerAccesoAdmin } from '@/lib/fase9/accesoAdmin';
import { solicitudAdminMismoOrigen } from '@/lib/fase9/seguridadHttp';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin/') && !solicitudAdminMismoOrigen(request)) {
    return NextResponse.json({ ok: false, error: 'Origen no permitido.' }, { status: 403 });
  }

  if (esModoDemoAdmin(process.env.NODE_ENV, pathname, request.nextUrl.searchParams.get('demo'))) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login' || pathname === '/api/admin/auth/login') {
    const keyring = crearSessionKeyring({
      currentSecret: process.env.ADMIN_SESSION_SECRET,
      currentVersion: process.env.ADMIN_SESSION_SECRET_VERSION,
      previousSecret: process.env.ADMIN_SESSION_SECRET_PREVIOUS,
      previousVersion: process.env.ADMIN_SESSION_SECRET_PREVIOUS_VERSION,
    });
    if (pathname === '/admin/login' && keyring.ok) {
      const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
      const session = token
        ? await readSessionTokenConRotacion(token, keyring.keyring)
        : null;
      if (session) {
        const { usuarios, legacyPermitido } = leerAccesoAdmin();
        const legacyVigente = legacyPermitido && session.actor_id === 'legacy-admin';
        if (legacyVigente || sesionCorrespondeAUsuario(usuarios, session)) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const keyring = crearSessionKeyring({
    currentSecret: process.env.ADMIN_SESSION_SECRET,
    currentVersion: process.env.ADMIN_SESSION_SECRET_VERSION,
    previousSecret: process.env.ADMIN_SESSION_SECRET_PREVIOUS,
    previousVersion: process.env.ADMIN_SESSION_SECRET_PREVIOUS_VERSION,
  });
  const session = keyring.ok && token
    ? await readSessionTokenConRotacion(token, keyring.keyring)
    : null;
  if (!session) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const { usuarios, legacyPermitido } = leerAccesoAdmin();
  const esSesionLegacy = legacyPermitido && session.actor_id === 'legacy-admin';
  const identidadVigente = esSesionLegacy || sesionCorrespondeAUsuario(usuarios, session);
  if (!identidadVigente) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ ok: false, error: 'Sesión revocada o no autorizada.' }, { status: 401 });
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
