'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminFase78Nav from '@/components/admin/AdminFase78Nav';
import type { ReportesFase78 } from '@/lib/appsScriptPedidos';
import { pesos, solicitarAdmin, valorOperativo } from '@/lib/fase8/clienteAdmin';

export default function HistorialesPage() {
  const [datos, setDatos] = useState<ReportesFase78 | null>(null);
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('Cargando reportes TEST...');
  const cargar = useCallback(async () => {
    setEstado('Cargando reportes TEST...');
    try {
      const query = new URLSearchParams({ desde, hasta }).toString();
      setDatos(await solicitarAdmin<ReportesFase78>(`/api/admin/reportes?${query}`)); setEstado('');
    } catch (error) { setEstado(error instanceof Error ? error.message : 'No se pudieron cargar reportes.'); }
  }, [desde, hasta]);
  useEffect(() => { void cargar(); }, [cargar]);
  return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-7xl"><AdminFase78Nav />
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-serif text-3xl font-bold text-primary-dark">Historiales y reportes</h1><p className="text-sm text-gray-600">Datos reales del entorno TEST, sin agregados persistidos.</p></div><div className="flex flex-wrap gap-2"><label className="text-xs">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="block rounded border p-2 text-sm" /></label><label className="text-xs">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="block rounded border p-2 text-sm" /></label><button onClick={() => void cargar()} className="self-end rounded bg-primary px-4 py-2 text-sm font-semibold text-white">Filtrar</button></div></div>
    {estado && <p role="status" className="mb-4 rounded bg-blue-50 p-3 text-sm">{estado}</p>}
    {datos && <><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">Compras</p><strong>{datos.resumen.cantidad_compras} · {pesos(datos.resumen.total_compras)}</strong></article><article className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">Gastos</p><strong>{datos.resumen.cantidad_gastos} · {pesos(datos.resumen.total_gastos)}</strong></article><article className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">Bajo stock</p><strong>{datos.productos_bajo_stock.length}</strong></article><article className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">Movimientos</p><strong>{datos.movimientos_stock.length}</strong></article></section>
      <p className="my-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{datos.advertencia_abastecimiento}</p>
      <div className="grid gap-5 lg:grid-cols-2"><Tabla titulo="Productos más vendidos" filas={datos.productos_mas_vendidos} campos={['producto_id','nombre_producto','cantidad','total']} /><Tabla titulo="Productos bajo stock" filas={datos.productos_bajo_stock} campos={['id_producto','nombre','stock_actual','stock_minimo']} /><Tabla titulo="Ventas presenciales" filas={datos.ventas} campos={['venta_id','fecha_hora','apertura_id','total']} /><Tabla titulo="Pedidos online" filas={datos.pedidos} campos={['id_pedido','fecha_hora','estado_pedido','total']} /><Tabla titulo="Compras" filas={datos.compras} campos={['compra_id','fecha_hora','proveedor','total']} /><Tabla titulo="Gastos extra" filas={datos.gastos} campos={['gasto_id','fecha_hora','categoria','monto']} /><Tabla titulo="Historial de costos" filas={datos.historial_costos} campos={['producto_id','fecha_hora','costo_anterior','costo_nuevo']} /><Tabla titulo="Movimientos de stock" filas={datos.movimientos_stock} campos={['producto_id','fecha_hora','tipo_movimiento','cantidad']} /><Tabla titulo="Auditoría de productos" filas={datos.auditoria_productos} campos={['producto_id','fecha_hora','accion','responsable']} /></div>
    </>}
  </div></main>;
}

function Tabla({ titulo, filas, campos }: { titulo: string; filas: object[]; campos: string[] }) {
  return <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold text-primary-dark">{titulo}</h2><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{campos.map((campo) => <th key={campo} className="p-2">{campo}</th>)}</tr></thead><tbody>{filas.slice(0, 50).map((filaCruda, indice) => { const fila = filaCruda as Record<string, unknown>; const clave = `${campos.map((campo) => valorOperativo(fila[campo])).join('|')}|${indice}`; return <tr key={clave} className="border-t">{campos.map((campo) => <td key={campo} className="whitespace-nowrap p-2">{valorOperativo(fila[campo])}</td>)}</tr>; })}</tbody></table>{filas.length === 0 && <p className="p-3 text-sm text-gray-500">Sin registros para el filtro.</p>}</div></section>;
}
