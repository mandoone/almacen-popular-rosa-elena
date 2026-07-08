import { NextResponse } from 'next/server';
import { makeSessionToken, COOKIE_NAME, cookieOptions, SESSION_MAX_AGE_S } from '@/lib/session';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    return NextResponse.json(
      { ok: false, error: 'El servidor no está configurado correctamente.' },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo inválido.' }, { status: 400 });
  }

  if (!timingSafeEqual(body.password ?? '', adminPassword)) {
    return NextResponse.json(
      { ok: false, error: 'Contraseña incorrecta.' },
      { status: 401 }
    );
  }

  const token = await makeSessionToken(sessionSecret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, cookieOptions(SESSION_MAX_AGE_S));
  return res;
}
