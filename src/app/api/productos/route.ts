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
}

export async function GET() {
  try {
    const productos = await listarProductos();
    const data: ProductoTienda[] = productos.map((p) => ({
      id: p.id_producto,
      nombre: p.nombre,
      precio: p.precio_venta,
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
