import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prepararCierreApertura,
  resumirApertura,
} from '../src/lib/fase6/cajaPorApertura.ts';

const aperturaId = 'APE-20260919';

test('Fase 6: resume anticipados y ventas, separa cancelados y agrupa pagos', () => {
  const resumen = resumirApertura(aperturaId, [
    { apertura_id: aperturaId, origen: 'pedido_anticipado', total: 2000, estado: 'vigente', estado_pago: 'pagado', forma_pago: 'transferencia' },
    { apertura_id: aperturaId, origen: 'venta_presencial', total: 1500, estado: 'vigente', estado_pago: 'pagado', forma_pago: 'efectivo' },
    { apertura_id: aperturaId, origen: 'venta_presencial', total: 800, estado: 'vigente', estado_pago: 'pendiente_de_pago' },
    { apertura_id: aperturaId, origen: 'pedido_anticipado', total: 900, estado: 'cancelado', estado_pago: 'pagado', forma_pago: 'efectivo' },
  ]);

  assert.equal(resumen.total_pedidos_anticipados, 2000);
  assert.equal(resumen.total_ventas_presenciales, 2300);
  assert.equal(resumen.total_general, 4300);
  assert.equal(resumen.total_cancelado, 900);
  assert.equal(resumen.total_pendiente_pago, 800);
  assert.deepEqual(resumen.total_por_forma_pago, { efectivo: 1500, transferencia: 2000, efectivo_al_retirar: 0 });
});

test('Fase 6: no mezcla registros de otras aperturas', () => {
  const resumen = resumirApertura(aperturaId, [
    { apertura_id: 'APE-20261003', origen: 'venta_presencial', total: 1000, estado: 'vigente', estado_pago: 'pagado', forma_pago: 'efectivo' },
  ]);

  assert.equal(resumen.total_general, 0);
  assert.match(resumen.errores.join(' '), /otra apertura/);
});

test('Fase 6: prepara cierre de solo lectura y marca pendientes/diferencias', () => {
  const resumen = resumirApertura(aperturaId, [
    { apertura_id: aperturaId, origen: 'venta_presencial', total: 1500, estado: 'vigente', estado_pago: 'pagado', forma_pago: 'efectivo' },
    { apertura_id: aperturaId, origen: 'venta_presencial', total: 300, estado: 'vigente', estado_pago: 'pendiente_de_pago' },
  ]);
  const cierre = prepararCierreApertura(resumen, {
    apertura_id: aperturaId,
    efectivo_declarado: 1400,
    responsable: 'Carolina',
  });

  assert.equal(cierre.efectivo_esperado, 1500);
  assert.equal(cierre.diferencia_efectivo, -100);
  assert.equal(cierre.listo_para_revision, false);
  assert.match(cierre.alertas.join(' '), /pagos pendientes/);
  assert.match(cierre.alertas.join(' '), /diferencia de efectivo/);
});
