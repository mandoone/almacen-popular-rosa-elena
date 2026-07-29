/**
 * Tests del modelo de pago separado (FASE 3A, §4 del levantamiento).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ESTADOS_PAGO,
  METODOS_PAGO,
  puedeMarcarsePagado,
  validarRegistroPago,
  validarEntrega,
  migrarEstadoPagoHeredado,
} from '../src/lib/fase3a/pagos.ts';

import {
  validarResponsable,
  ALERTA_RESPONSABLE_NO_AUTORIZADO,
  esResponsableAutorizado,
} from '../src/lib/fase3a/responsables.ts';

import { validarCancelacion } from '../src/lib/fase3a/cancelacion.ts';

test('estado de pago y método de pago son vocabularios separados', () => {
  assert.deepEqual([...ESTADOS_PAGO], ['pendiente_de_pago', 'pagado']);
  assert.deepEqual([...METODOS_PAGO], ['efectivo', 'transferencia']);
  // Ningún estado de pago mezcla el método (prohibido por §4.1).
  for (const e of ESTADOS_PAGO) {
    assert.ok(!e.includes('efectivo'), `${e} no debe mezclar el método`);
    assert.ok(!e.includes('transferencia'), `${e} no debe mezclar el método`);
  }
});

test('solo los pedidos confirmados admiten pago', () => {
  assert.equal(puedeMarcarsePagado('recibido'), false);
  assert.equal(puedeMarcarsePagado('cancelado'), false);
  assert.equal(puedeMarcarsePagado('pendiente'), true);
  assert.equal(puedeMarcarsePagado('listo'), true);
  assert.equal(puedeMarcarsePagado('entregado'), true);
});

test('marcar pagado exige método y responsable', () => {
  const sinMetodo = validarRegistroPago('listo', {
    estado_pago: 'pagado',
    responsable: 'Carolina',
  });
  assert.equal(sinMetodo.valido, false);
  assert.ok(sinMetodo.errores.some((e) => e.includes('método')));

  const sinResponsable = validarRegistroPago('listo', {
    estado_pago: 'pagado',
    metodo_pago: 'efectivo',
  });
  assert.equal(sinResponsable.valido, false);
  assert.ok(sinResponsable.errores.some((e) => e.includes('responsable')));

  const completo = validarRegistroPago('listo', {
    estado_pago: 'pagado',
    metodo_pago: 'efectivo',
    responsable: 'Nadia',
  });
  assert.equal(completo.valido, true);
  assert.deepEqual(completo.errores, []);
});

test('no se puede pagar un pedido recibido ni uno cancelado', () => {
  for (const estado of ['recibido', 'cancelado']) {
    const r = validarRegistroPago(estado, {
      estado_pago: 'pagado',
      metodo_pago: 'efectivo',
      responsable: 'Carolina',
    });
    assert.equal(r.valido, false, `${estado} no debe admitir pago`);
  }
});

test('entregar exige pago completo', () => {
  assert.equal(
    validarEntrega({ estado_pago: 'pendiente_de_pago' }).valido,
    false
  );
  assert.equal(
    validarEntrega({ estado_pago: 'pagado', metodo_pago: 'efectivo' }).valido,
    false,
    'falta responsable'
  );
  assert.equal(
    validarEntrega({
      estado_pago: 'pagado',
      metodo_pago: 'transferencia',
      responsable: 'Lucía',
    }).valido,
    true
  );
});

test('migración de los valores mezclados que hoy están en la hoja', () => {
  const efectivo = migrarEstadoPagoHeredado('pagado_efectivo');
  assert.equal(efectivo.estado_pago, 'pagado');
  assert.equal(efectivo.metodo_pago, 'efectivo');
  assert.equal(efectivo.requiere_revision, false);

  const transf = migrarEstadoPagoHeredado('pagado_transferencia');
  assert.equal(transf.estado_pago, 'pagado');
  assert.equal(transf.metodo_pago, 'transferencia');
  assert.equal(transf.requiere_revision, false);

  const pendiente = migrarEstadoPagoHeredado('pendiente');
  assert.equal(pendiente.estado_pago, 'pendiente_de_pago');
  assert.equal(pendiente.metodo_pago, null);
  assert.equal(pendiente.requiere_revision, false);

  // 'anulado' no tiene equivalente: no se inventa, se marca para revisión.
  const anulado = migrarEstadoPagoHeredado('anulado');
  assert.equal(anulado.requiere_revision, true);
  assert.equal(anulado.valor_original, 'anulado');

  const vacio = migrarEstadoPagoHeredado('');
  assert.equal(vacio.estado_pago, 'pendiente_de_pago');
  assert.equal(vacio.requiere_revision, false);

  const raro = migrarEstadoPagoHeredado('lo pagó la Cris el sábado');
  assert.equal(raro.requiere_revision, true);
});

test('responsables autorizados y excepción "Otro"', () => {
  assert.equal(esResponsableAutorizado('Carolina'), true);
  assert.equal(esResponsableAutorizado('Juan Py'), true);
  assert.equal(esResponsableAutorizado('Otro'), false);

  const ok = validarResponsable('Mati');
  assert.equal(ok.valido, true);
  assert.equal(ok.requiere_alerta, false);

  const otroSinObs = validarResponsable('Otro');
  assert.equal(otroSinObs.valido, false);
  assert.equal(otroSinObs.requiere_alerta, true);
  assert.equal(otroSinObs.alerta, ALERTA_RESPONSABLE_NO_AUTORIZADO);

  const otroConObs = validarResponsable('Otro', 'Vecina que ayudó el sábado');
  assert.equal(otroConObs.valido, true);
  assert.equal(otroConObs.requiere_alerta, true);

  const desconocido = validarResponsable('Fulano');
  assert.equal(desconocido.valido, false);
  assert.equal(desconocido.requiere_alerta, true);

  assert.equal(validarResponsable('').valido, false);
});

test('cancelar exige motivo, y "Otro" exige observación', () => {
  assert.equal(validarCancelacion({}).valido, false);
  assert.equal(validarCancelacion({ motivo: 'inventado' }).valido, false);

  const normal = validarCancelacion({ motivo: 'cliente_no_retira' });
  assert.equal(normal.valido, true);
  assert.equal(normal.requiere_alerta, false);

  const otroSinObs = validarCancelacion({ motivo: 'otro' });
  assert.equal(otroSinObs.valido, false);

  const otroConObs = validarCancelacion({
    motivo: 'otro',
    observacion: 'Se traspapeló el pedido',
  });
  assert.equal(otroConObs.valido, true);
  assert.equal(otroConObs.requiere_alerta, true);
});
