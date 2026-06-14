import { NextResponse } from 'next/server';
import {
  crearPedido,
  AppsScriptError,
  type CarritoItem,
} from '@/lib/appsScriptPedidos';

// Proxy publico: la tienda llama aqui; el servidor reenvia a Apps Script.
// No requiere token (crearPedido es publico). El token admin nunca toca esta ruta.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'Cuerpo de la solicitud invalido.' },
        { status: 400 }
      );
    }

    const carrito = Array.isArray(body.carrito) ? (body.carrito as CarritoItem[]) : [];
    if (!body.nombre_cliente || !body.telefono) {
      return NextResponse.json(
        { ok: false, error: 'Falta nombre o telefono.' },
        { status: 400 }
      );
    }
    if (!carrito.length) {
      return NextResponse.json(
        { ok: false, error: 'El carrito esta vacio.' },
        { status: 400 }
      );
    }

    const result = await crearPedido({
      nombre_cliente: String(body.nombre_cliente),
      telefono: String(body.telefono),
      forma_pago: String(body.forma_pago || 'efectivo_al_retirar'),
      observaciones: body.observaciones ? String(body.observaciones) : '',
      carrito: carrito.map((i) => ({
        id_producto: String(i.id_producto),
        cantidad: Number(i.cantidad),
        nombre: i.nombre,
      })),
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
