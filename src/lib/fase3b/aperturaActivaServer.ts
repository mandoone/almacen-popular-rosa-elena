import {
  AppsScriptError,
  listarAperturas,
  verificarContratoPedidosAnticipadosTest,
} from '../appsScriptPedidos';
import {
  fechaHoraSantiago,
  seleccionarAperturaActivaParaPedidos,
  type ResultadoAperturaActivaPedidos,
} from './pedidosAnticipados';

export async function obtenerAperturaActivaPedidosTest(
  fechaActual = fechaHoraSantiago()
): Promise<ResultadoAperturaActivaPedidos> {
  const aperturas = await listarAperturas();
  return seleccionarAperturaActivaParaPedidos(aperturas, fechaActual);
}

export async function exigirAperturaActivaParaCrearPedidoTest() {
  const resultado = await obtenerAperturaActivaPedidosTest();
  if (resultado.tipo === 'conflicto') {
    throw new AppsScriptError(resultado.error, 409);
  }
  if (resultado.tipo === 'no_disponible') {
    throw new AppsScriptError(
      'No hay una apertura activa con pedidos anticipados disponibles.',
      409
    );
  }

  // Una versión anterior del Apps Script no reconoce esta capacidad y falla
  // antes de que se intente crear un pedido sin apertura asociada.
  await verificarContratoPedidosAnticipadosTest();
  return resultado.apertura;
}
