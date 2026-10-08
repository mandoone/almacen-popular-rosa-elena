import { NextResponse } from 'next/server';
import { listarFamiliasProductoAdmin, listarProductosAdmin, listarProductosPorAperturaAdmin } from '@/lib/appsScriptPedidos';
import { respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';
import { sesionTieneCapacidad } from '@/lib/session';
import { obtenerEntornoAplicacion } from '@/lib/env';
import { construirCatalogoFamiliasShadow, skuParaShadow } from '@/lib/familias/catalogoShadow';
import { auditarFaltantesIdentidad, esSkuFixtureConocido } from '@/lib/familias/auditoriaIdentidad';
import type { SkuFamilia } from '@/lib/familiasProducto';

export const dynamic = 'force-dynamic';
/** Solo lecturas administrativas existentes. Sin acciones HTTP nuevas en Apps Script. */
export async function GET(req: Request) {
  if (obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV) !== 'test' || !sesionTieneCapacidad(req, 'productos:gestionar')) {
    return NextResponse.json({ ok: false, error: 'Solo administración TEST.' }, { status: 403 });
  }
  const apertura_id = new URL(req.url).searchParams.get('apertura_id')?.trim() ?? '';
  if (apertura_id && !/^APE-\d{8}$/.test(apertura_id)) return NextResponse.json({ ok: false, error: 'ID de apertura inválido.' }, { status: 400 });
  try {
    const [f, p, habilitaciones] = await Promise.all([
      listarFamiliasProductoAdmin(), listarProductosAdmin(),
      apertura_id ? listarProductosPorAperturaAdmin(apertura_id) : Promise.resolve([]),
    ]);
    const skus = p.map(s => skuParaShadow({ ...s, activo: s.activo as SkuFamilia['activo'] }));
    const contexto = { apertura_id, sku_habilitados: habilitaciones.filter(h => h.habilitado === true).map(h => h.producto_id) };
    return NextResponse.json({ ok: true, data: {
      familias: f.familias, skus, contexto,
      catalogo: construirCatalogoFamiliasShadow(f.familias, skus, contexto),
      faltantes: auditarFaltantesIdentidad(skus.filter(s => !esSkuFixtureConocido(s)), f.familias),
      lectura_en: new Date().toISOString(), modelo: 'SHADOW_C6', solo_lectura: true,
    } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return respuestaErrorAdmin(error); }
}
