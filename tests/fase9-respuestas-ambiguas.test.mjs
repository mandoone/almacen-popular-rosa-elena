import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { RESPUESTA_POST_MUTACION_AMBIGUA } from '../src/lib/appsScriptRespuesta.ts';
import {
  ejecutarMutacionDurableConReplay,
  ejecutarTransicionSimpleConReadback,
  esConfirmacionDurableReintentable,
  esRespuestaPostMutacionAmbigua,
  esTransicionSimpleReconciliable,
} from '../src/lib/fase9/resilienciaPedidos.ts';

function errorAmbiguo() {
  return Object.assign(new Error('mensaje seguro de resultado ambiguo'), {
    status: 502,
    tipoFallo: RESPUESTA_POST_MUTACION_AMBIGUA,
  });
}

test('F9 HTTP ambiguo: cancelación aplicada se recupera con un replay idéntico', async () => {
  const payload = {
    id_pedido: 'PED-1', actor: 'actor-1', idempotency_key: 'cancelar_12345678',
  };
  let intentos = 0;
  let reposiciones = 0;
  let movimientos = 0;
  const payloads = [];

  const resultado = await ejecutarMutacionDurableConReplay(async () => {
    intentos++;
    payloads.push(payload);
    if (intentos === 1) {
      reposiciones++;
      movimientos++;
      throw errorAmbiguo();
    }
    return { estado_pedido: 'cancelado', recuperado_del_diario: true };
  });

  assert.equal(resultado.estado_pedido, 'cancelado');
  assert.equal(intentos, 2);
  assert.equal(reposiciones, 1);
  assert.equal(movimientos, 1);
  assert.equal(payloads[0], payloads[1]);
});

test('F9 HTTP ambiguo: confirmación aplicada se recupera sin doble descuento', async () => {
  let intentos = 0;
  let descuentos = 0;
  let movimientos = 0;
  const resultado = await ejecutarMutacionDurableConReplay(async () => {
    intentos++;
    if (intentos === 1) {
      descuentos++;
      movimientos++;
      throw errorAmbiguo();
    }
    return { estado_pedido: 'pendiente', recuperado_del_diario: true };
  });
  assert.equal(resultado.estado_pedido, 'pendiente');
  assert.equal(intentos, 2);
  assert.equal(descuentos, 1);
  assert.equal(movimientos, 1);
});

test('F9 HTTP ambiguo: dos respuestas ambiguas permiten solo dos POST', async () => {
  let intentos = 0;
  await assert.rejects(
    ejecutarMutacionDurableConReplay(async () => {
      intentos++;
      throw errorAmbiguo();
    }),
    /resultado ambiguo/
  );
  assert.equal(intentos, 2);
});

test('F9 HTTP ambiguo: 403, timeout y errores genéricos no disparan replay', async () => {
  for (const error of [
    Object.assign(new Error('prohibido'), { status: 403 }),
    Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
    new TypeError('red'),
  ]) {
    let intentos = 0;
    await assert.rejects(ejecutarMutacionDurableConReplay(async () => {
      intentos++;
      throw error;
    }));
    assert.equal(intentos, 1);
  }
});

for (const estadoObjetivo of ['listo', 'entregado']) {
  test(`F9 HTTP ambiguo: ${estadoObjetivo} se reconcilia por readback sin segundo POST`, async () => {
    let posts = 0;
    let lecturas = 0;
    const resultado = await ejecutarTransicionSimpleConReadback({
      ejecutar: async () => {
        posts++;
        throw errorAmbiguo();
      },
      leerPedido: async () => {
        lecturas++;
        return {
          pedido: {
            id_pedido: 'PED-1',
            estado_pedido: estadoObjetivo,
            estado_pago: 'pendiente',
            vendedor_admin: 'actor-1',
          },
        };
      },
      idPedido: 'PED-1',
      estadoObjetivo,
      actor: 'actor-1',
    });
    assert.equal(posts, 1);
    assert.equal(lecturas, 1);
    assert.equal(resultado.reconciliado, true);
    assert.equal(resultado.estado_pedido, estadoObjetivo);
  });
}

test('F9 HTTP ambiguo: readback en origen, inesperado o con otro actor no afirma éxito', async () => {
  for (const pedido of [
    { id_pedido: 'PED-1', estado_pedido: 'pendiente', vendedor_admin: 'actor-1' },
    { id_pedido: 'PED-1', estado_pedido: 'entregado', vendedor_admin: 'actor-1' },
    { id_pedido: 'PED-1', estado_pedido: 'listo', vendedor_admin: 'otro-actor' },
  ]) {
    let posts = 0;
    await assert.rejects(
      ejecutarTransicionSimpleConReadback({
        ejecutar: async () => {
          posts++;
          throw errorAmbiguo();
        },
        leerPedido: async () => ({ pedido }),
        idPedido: 'PED-1',
        estadoObjetivo: 'listo',
        actor: 'actor-1',
      }),
      /resultado ambiguo/
    );
    assert.equal(posts, 1);
  }
});

test('F9 HTTP ambiguo: selección de confirmación y transiciones simples es acotada', () => {
  assert.equal(esConfirmacionDurableReintentable('recibido', 'pendiente', false), true);
  assert.equal(esConfirmacionDurableReintentable('recibido', 'pendiente', true), true);
  assert.equal(esConfirmacionDurableReintentable('pendiente', 'pendiente', false), true);
  assert.equal(esConfirmacionDurableReintentable('pendiente', 'pendiente', true), false);
  assert.equal(esTransicionSimpleReconciliable('pendiente', 'listo', false), true);
  assert.equal(esTransicionSimpleReconciliable('listo', 'entregado', false), true);
  assert.equal(esTransicionSimpleReconciliable('pendiente', 'entregado', false), false);
  assert.equal(esTransicionSimpleReconciliable('listo', 'cancelado', false), false);
});

test('F9 HTTP ambiguo: clasificación interna no acepta un error no marcado', () => {
  assert.equal(esRespuestaPostMutacionAmbigua(errorAmbiguo()), true);
  assert.equal(esRespuestaPostMutacionAmbigua(new Error('HTML inválido')), false);
  assert.equal(esRespuestaPostMutacionAmbigua({ status: 502 }), false);
});

test('F9 HTTP ambiguo: route conserva payload/key y UI rota la key solo tras éxito', async () => {
  const ruta = await readFile(
    new URL('../src/app/api/admin/pedidos/[id]/route.ts', import.meta.url),
    'utf8'
  );
  const ui = await readFile(new URL('../src/app/admin/page.tsx', import.meta.url), 'utf8');
  const helper = await readFile(new URL('../src/lib/appsScriptPedidos.ts', import.meta.url), 'utf8');

  assert.match(ruta, /const input = \{[\s\S]*?idempotency_key:[\s\S]*?const ejecutar = \(\) => actualizarEstadoPedido\(input\)/);
  assert.match(ruta, /estadoActual !== 'cancelado'[\s\S]*?ejecutarMutacionDurableConReplay/);
  assert.match(helper, /clasificarFalloRespuestaNoJson\(metodo, diagnostico\)/);
  assert.match(ui, /if \(!res\.ok \|\| !json\?\.ok\) throw[\s\S]*?delete clavesOperacion\.current\[claveOperacion\]/);
});
