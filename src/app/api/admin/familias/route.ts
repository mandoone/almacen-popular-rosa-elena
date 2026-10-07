import { NextResponse } from 'next/server';
import { listarFamiliasProductoAdmin, obtenerFamiliaProductoAdmin, guardarFamiliaProductoAdmin, auditarMapaFamiliasSkuAdmin } from '@/lib/appsScriptPedidos';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';
import { actorIdFromRequest, sesionTieneCapacidad } from '@/lib/session';
import { obtenerEntornoAplicacion } from '@/lib/env';
import { dtoFamiliaAdmin } from '@/lib/familiasAdmin';

export const dynamic = 'force-dynamic';
function denegada(req: Request) {
  return obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV) !== 'test' || !sesionTieneCapacidad(req, 'productos:gestionar')
    ? NextResponse.json({ ok: false, error: 'Solo administración TEST.' }, { status: 403 }) : null;
}
export async function GET(req: Request) {
  const rechazo = denegada(req); if (rechazo) return rechazo;
  try {
    const params = new URL(req.url).searchParams;
    const data = params.get('auditoria') === 'SI' ? await auditarMapaFamiliasSkuAdmin(params.get('apertura_id') ?? '')
      : params.has('familia_id') ? await obtenerFamiliaProductoAdmin(params.get('familia_id')!) : await listarFamiliasProductoAdmin();
    return NextResponse.json({ ok: true, data });
  } catch (error) { return respuestaErrorAdmin(error); }
}
async function guardar(req: Request, crear: boolean) {
  const rechazo = denegada(req); if (rechazo) return rechazo;
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) return NextResponse.json({ ok: false, error: 'Falta clave idempotente válida.' }, { status: 400 });
    let input;
    try { input = dtoFamiliaAdmin(body); } catch { return NextResponse.json({ ok: false, error: 'Contrato de familia inválido.' }, { status: 400 }); }
    return NextResponse.json({ ok: true, data: await guardarFamiliaProductoAdmin(input, actorIdFromRequest(req), crear) }, { status: crear ? 201 : 200 });
  } catch (error) { return respuestaErrorAdmin(error); }
}
export async function POST(req: Request) { return guardar(req, true); }
export async function PATCH(req: Request) { return guardar(req, false); }
