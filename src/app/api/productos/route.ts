import { NextResponse } from 'next/server';
import { listarProductos, AppsScriptError } from '@/lib/appsScriptPedidos';

// Catalogo de la tienda: ahora se sirve desde la BASE OPERATIVA (hoja PRODUCTOS)
// via la Web App de Apps Script. El `id` expuesto es el `id_producto` real
// (PROD-001, ...), de modo que la tienda envia ese mismo id al crear el pedido y el
// backend lo valida correctamente.
//
// (Historico: antes este endpoint leia un CSV publicado de la planilla antigua.
// Esa fuente quedo retirada como catalogo operativo; ver docs/DATA_MODEL.md.)
export const dynamic = 'force-dynamic';

interface ProductoTienda {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  unidad_medida: string;
  permite_decimal: string;
  modo_venta?: 'UNIDAD' | 'GRANEL';
  gramos_referencia?: number;
  gramos_unidad_stock?: number;
  paso_venta: number;
  imagen_url: string;
  tipo_disponibilidad: string;
}

export async function GET(req: Request) {
  try {
    const aperturaId = new URL(req.url).searchParams.get('apertura_id') ?? '';
    if (aperturaId && !/^APE-\d{8}$/.test(aperturaId)) {
      return NextResponse.json({ error: 'Apertura inválida.' }, { status: 400 });
    }
    const productos = await listarProductos(aperturaId);
    const data: ProductoTienda[] = productos.map((p) => ({
      id: p.id_producto,
      nombre: p.nombre,
      precio: p.precio_venta,
      categoria: p.categoria,
      unidad_medida: p.unidad_medida,
      permite_decimal: p.permite_decimal,
      paso_venta: p.paso_venta,
      modo_venta: p.modo_venta, gramos_referencia: p.gramos_referencia, gramos_unidad_stock: p.gramos_unidad_stock,
      imagen_url: p.imagen_url,
      tipo_disponibilidad: p.tipo_disponibilidad ?? 'REGULAR',
    }));
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    return NextResponse.json(
      { error: 'No se pudo obtener el catálogo' },
      { status }
    );
  }
}
