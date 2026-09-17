import { NextResponse } from 'next/server';
import { obtenerReportesFase78 } from '@/lib/appsScriptPedidos';
import { filtrosLectura, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try { return NextResponse.json({ ok: true, data: await obtenerReportesFase78(filtrosLectura(req.url)) }); }
  catch (error) { return respuestaErrorAdmin(error); }
}
