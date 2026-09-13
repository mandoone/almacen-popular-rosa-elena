# Validación TEST — Fase 5 + Fase 6

**Fecha:** 2026-09-13
**Estado:** validación automatizada TEST aprobada; QA visual principal aprobado.
**Producción:** fuera de alcance y sin cambios.

## Infraestructura de validación

- Runner Node permanente: `scripts/e2e-fase56.mjs`.
- Pruebas locales con `node --test`; no se agregaron frameworks ni dependencias.
- Comandos separados para preflight read-only, idempotencia aislada y suite completa:
  - `npm run test:e2e:fase56:idempotencia:preflight`
  - `npm run test:e2e:fase56:idempotencia`
  - `npm run test:e2e:fase56`
- El despliegue Web App TEST existente contenía las acciones E2E y la corrección
  de serialización temporal antes de la ejecución final. No se creó ni modificó
  ningún despliegue productivo.

## Guardarraíles comprobados

- `NEXT_PUBLIC_APP_ENV` debe ser exactamente `test`.
- URL y token TEST son obligatorios, no admiten fallback y no pueden coincidir
  con variables productivas.
- Toda escritura requiere el opt-in efímero
  `E2E_FASE56_ENABLE_WRITES=HABILITAR_ESCRITURAS_TEST`.
- El preflight verifica `APP_ENV=TEST`, contrato, nombre exacto de la Sheet,
  apertura y fixtures antes de cualquier POST.
- No se lee ni modifica `.env.local` desde el runner y no se imprimen secretos,
  URLs privadas, cuerpos remotos ni el entorno completo.
- Los GET read-only y los POST idempotentes toleran como máximo un retry ante
  fallos transitorios de red/Google. Un POST solo se reintenta con el mismo cuerpo
  exacto y la misma `idempotency_key`.
- No existe cleanup automático; toda evidencia histórica TEST se conserva.

## Resultado Fase 5

- PASS: venta válida por unidad (`PROD-001`).
- PASS: venta decimal válida de 0,5 kg (`PROD-TEST-DECIMAL`).
- PASS: rechazo de 0,5 unidades sobre producto entero, sin efectos.
- PASS: rechazo por stock insuficiente, sin efectos.
- PASS: idempotencia con replay idéntico y conflicto lógico 409 para payload
  diferente.
- PASS: deltas de `VENTAS`, `DETALLE_VENTAS`, `MOVIMIENTOS_STOCK` y stock.
- PASS: `obtenerVentaPresencial` reconstruye la venta y la comanda con contrato
  temporal estable.

Evidencia de la corrida completa final:

- Marcador: `E2E-TEST-F56-cd70e3b1dbd74ba9903d28fe`.
- Venta unidad: `VEN-20260913-133611-1d6496ae`.
- Venta decimal: `VEN-20260913-133623-0aa21898`.
- Venta idempotencia: `VEN-20260913-133711-ee2a6a88`.
- Idempotencia aislada previamente aprobada:
  `VEN-20260913-124830-f3c58d82`.

Para la venta idempotente final se comprobó una sola cabecera, un solo detalle,
un solo movimiento y un único descuento de 0,1 kg. El replay devolvió la misma
venta; el payload diferente fue rechazado con código lógico 409 y sin efectos.

## Resultado Fase 6 y regresión

- PASS: pedido anticipado vigente y pedido posteriormente cancelado.
- PASS: la cancelación devolvió exactamente el stock comprometido.
- PASS: ventas/pedidos por apertura, totales, cobrado, pendientes, cancelados,
  efectivo, transferencia y efectivo al retirar mediante snapshots/deltas.
- PASS: el resumen no incorporó advertencias nuevas.
- PASS: consultar ventas y caja no cambió ningún campo persistente de la apertura;
  se comparó además la fila completa mediante `obtenerApertura`.

Evidencia:

- Pedido vigente: `PED-20260913-133744`.
- Pedido cancelado: `PED-20260913-133757`.

## Estado final de TEST

La apertura `APE-20260919` quedó restaurada y verificada por lectura posterior:

- `fecha_apertura = 2026-09-19`
- `hora_inicio = 11:00`
- `hora_termino = 15:00`

Los demás campos funcionales se preservaron desde la fila completa. Los campos
de auditoría reflejan naturalmente la actualización TEST; no se falsificaron
timestamps históricos.

El fixture permanente `PROD-TEST-DECIMAL` se conserva activo con:

- `unidad_medida = kg`
- `permite_decimal = SI`
- `paso_venta = 0.1`
- `precio_venta = 1000`
- stock final observado: `5.5`

El stock no se restableció artificialmente y los registros E2E permanecen en TEST.

## QA local final

- `npm test`: 198/198 PASS.
- `npm run lint`: PASS, sin warnings ni errores.
- `npm run build`: PASS, compilación y tipos correctos.
- `node --check` de runner y guardarraíles: PASS.
- `git diff --check`: PASS.

## QA visual humano

- PASS: `/admin/vendedor` mostró el badge TEST, la apertura, el catálogo y el
  stock esperados.
- PASS: el control decimal aceptó 0,5 kg y calculó correctamente el total visual.
- PASS: `/admin/caja` mostró de forma coherente totales, pagos pendientes,
  transferencias y cancelados.
- PENDIENTE no bloqueante: inspección visual de la comanda y su vista de
  impresión para una venta existente. La comanda se muestra después de registrar
  una venta y el botón ejecuta `window.print()`, pero actualmente no existe una
  ruta UI que permita reabrir por `venta_id` una venta ya registrada. Las ventas
  existentes sí pueden consultarse mediante la API autenticada.

Mejoras futuras registradas, fuera del alcance de este cierre:

- Permitir abrir y reimprimir una comanda existente por `venta_id`.
- Mostrar una fecha amigable en los selectores de apertura; actualmente pueden
  presentar el valor ISO completo, por ejemplo `2026-09-19T00:00:00.000...`.

## Riesgo conocido

Google Sheets no ofrece una transacción multitabla. El backend reduce el riesgo
con `LockService`, idempotencia, orden de escritura y compensación. Un fallo extremo
de la plataforma durante una reversión aún requeriría revisión manual en TEST.
La anulación de ventas y el cierre persistente continúan fuera del alcance de esta
validación.

Producción permaneció completamente fuera de alcance: no se modificaron la Sheet,
el Apps Script ni el despliegue Vercel productivos.
