import { NextResponse } from 'next/server';
import { obtenerCompraAdmin } from '@/lib/appsScriptPedidos';
import { respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json({ ok: true, data: await obtenerCompraAdmin((await params).id) });
  } catch (error) { return respuestaErrorAdmin(error); }
}
