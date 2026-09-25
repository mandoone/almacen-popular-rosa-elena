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
import { ejecutarEtapaPedido, type ObservarEtapaPedido } from './observabilidadPedido';

export async function obtenerAperturaActivaPedidosTest(
  fechaActual = fechaHoraSantiago(),
  observar?: ObservarEtapaPedido
): Promise<ResultadoAperturaActivaPedidos> {
  const aperturas = await ejecutarEtapaPedido('PRECONDICION_APERTURA', listarAperturas, observar);
  return seleccionarAperturaActivaParaPedidos(aperturas, fechaActual);
}

export async function exigirAperturaActivaParaCrearPedidoTest(observar?: ObservarEtapaPedido) {
  let resultado: ResultadoAperturaActivaPedidos;
  try {
    resultado = await obtenerAperturaActivaPedidosTest(fechaHoraSantiago(), observar);
  } catch (error) {
    if (error instanceof AppsScriptError && error.transitorioLectura) {
      throw new AppsScriptError('No se pudo consultar la apertura TEST.', 503, false, undefined, error.diagnostico);
    }
    throw error;
  }
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
  await ejecutarEtapaPedido('PRECONDICION_CAPACIDAD', verificarContratoPedidosAnticipadosTest, observar);
  return resultado.apertura;
}
