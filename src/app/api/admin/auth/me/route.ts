import { NextResponse } from 'next/server';
import {
  SESSION_ACTOR_HEADER,
  SESSION_NAME_HEADER,
  SESSION_ROLE_HEADER,
} from '@/lib/session';
import { CAPACIDADES_POR_ROL, esRolOperativo } from '@/lib/fase9/roles';

export async function GET(request: Request) {
  const actorId = request.headers.get(SESSION_ACTOR_HEADER) ?? '';
  const nombre = request.headers.get(SESSION_NAME_HEADER) || undefined;
  const rol = request.headers.get(SESSION_ROLE_HEADER);
  if (!actorId || !esRolOperativo(rol)) {
    return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
  }
  const response = NextResponse.json({
    ok: true,
    data: {
      actor_id: actorId,
      ...(nombre ? { nombre } : {}),
      rol,
      capacidades: CAPACIDADES_POR_ROL[rol],
    },
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
