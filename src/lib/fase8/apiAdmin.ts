import { NextResponse } from 'next/server';
import { AppsScriptError } from '@/lib/appsScriptPedidos';

export function respuestaErrorAdmin(error: unknown) {
  const status = error instanceof AppsScriptError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Error inesperado.';
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function idempotencyKeyValida(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(valor);
}

export function filtrosLectura(url: string) {
  const params = new URL(url).searchParams;
  return {
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
    apertura_id: params.get('apertura_id') ?? '',
    producto_id: params.get('producto_id') ?? '',
  };
}
