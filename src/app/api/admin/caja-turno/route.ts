import { NextResponse } from 'next/server';
import { obtenerCajaTurnoAdmin, registrarCierreCajaTurnoAdmin } from '@/lib/appsScriptPedidos';
import { actorIdFromRequest } from '@/lib/session';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export const dynamic = 'force-dynamic';
const respuesta = (data: unknown) => NextResponse.json({ ok: true, data }, { headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('apertura_id') || '';
    if (!/^APE-[0-9]{8}$/.test(id)) return NextResponse.json({ok:false,error:'Selecciona una apertura válida.'},{status:400});
    return respuesta(await obtenerCajaTurnoAdmin(id));
  } catch (error) { return respuestaErrorAdmin(error); }
}
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (!b || !idempotencyKeyValida(b.idempotency_key) || !/^APE-[0-9]{8}$/.test(b.apertura_id) ||
      !Number.isSafeInteger(b.saldo_inicial) || b.saldo_inicial < 0 || !Number.isSafeInteger(b.efectivo_contado) || b.efectivo_contado < 0 ||
      typeof b.observaciones !== 'string' || !b.observaciones.trim() || b.observaciones.length > 500 ||
      !/^[a-f0-9]{64}$/.test(b.fuente_hash) || b.revision_confirmada !== true) {
      return NextResponse.json({ ok:false,error:'Faltan montos explícitos, observación o revisión del arqueo.' },{status:400});
    }
    // Lista cerrada: importes calculados, actor, token y estado del navegador no se copian.
    return respuesta(await registrarCierreCajaTurnoAdmin({apertura_id:b.apertura_id,saldo_inicial:b.saldo_inicial,
      efectivo_contado:b.efectivo_contado,observaciones:b.observaciones.trim(),fuente_hash:b.fuente_hash,
      revision_confirmada:true,idempotency_key:b.idempotency_key},actorIdFromRequest(req)));
  } catch (error) { return respuestaErrorAdmin(error); }
}
