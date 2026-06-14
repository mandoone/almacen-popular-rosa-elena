import { NextResponse } from 'next/server';
import { listarPedidos, AppsScriptError } from '@/lib/appsScriptPedidos';

// Proxy admin: lista pedidos reales. El token admin se agrega en el servidor.
//
// DEUDA TECNICA (ver docs/TASKS.md): esta ruta NO tiene autenticacion propia de
// servidor. El "login" del panel es solo del lado cliente, asi que el endpoint es
// alcanzable por cualquiera que conozca la ruta. Pendiente: proteger /api/admin/*.
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
