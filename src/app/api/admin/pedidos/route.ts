import { NextResponse } from 'next/server';
import { listarPedidos, AppsScriptError } from '@/lib/appsScriptPedidos';

// Proxy admin: lista pedidos reales. El token admin se agrega en el servidor.
//
// Autenticacion: la cubre `src/middleware.ts` (matcher '/api/admin/:path+'), que
// valida la cookie de sesion firmada y responde 401 antes de llegar aqui.
// (La nota de deuda tecnica anterior quedo obsoleta al cerrarse FASE 2.)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pedidos = await listarPedidos();
    return NextResponse.json({ ok: true, data: pedidos });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
