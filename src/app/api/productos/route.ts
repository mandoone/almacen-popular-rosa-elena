import { NextResponse } from 'next/server';

// Hoja "WEB" — el almacén actualiza esta hoja cada apertura.
// Este link nunca cambia.
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-eg1lNUq0eIN-cTT9ZU_i-K10eXPCgaRiKKsnufSYehzP6ppLZuoKGRyXddBsOTaFwVdleDV-ngKH/pub?gid=1487705909&single=true&output=csv';

export const revalidate = 3600;

interface Producto {
  id: string;
  nombre: string;
  precio: number;
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseProductos(text: string): Producto[] {
  const lines = text.split('\n');

  // Encontrar la fila de encabezado: índice 1 contiene "RT" (cubre "ARTÍCULO" con cualquier encoding)
  let inicioIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const col1 = cells[1]?.replace(/"/g, '').trim().toUpperCase() ?? '';
    if (col1.includes('RT') && col1.includes('CUL')) {
      inicioIdx = i;
    }
  }

  if (inicioIdx === -1) return [];

  const productos: Producto[] = [];

  for (let i = inicioIdx + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const nombre = cells[1]?.replace(/"/g, '').trim() ?? '';
    const precioRaw = cells[2]?.replace(/"/g, '').trim() ?? '';

    if (!nombre || nombre.toUpperCase().includes('TOTAL')) break;

    const precio = parseInt(precioRaw.replace(/[^0-9]/g, ''), 10) || 0;
    if (!precio) continue;

    productos.push({ id: `${i}-${nombre}`, nombre, precio });
  }

  return productos;
}

export async function GET() {
  try {
    const res = await fetch(CSV_URL, {
      next: { revalidate: 3600 },
      headers: { 'Accept-Charset': 'utf-8' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener el catálogo' },
        { status: 502 }
      );
    }
    const text = await res.text();
    const productos = parseProductos(text);
    return NextResponse.json(productos);
  } catch {
    return NextResponse.json(
      { error: 'Error interno al cargar el catálogo' },
      { status: 500 }
    );
  }
}
