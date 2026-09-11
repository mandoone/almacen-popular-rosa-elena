# Próximo bloque — implementación real TEST de Fase 5 + Fase 6

**Estado:** implementación ejecutada en el repositorio. Esta guía queda
reemplazada para la operación inmediata por `VALIDACION_FASE_5_6_TEST.md`.
No autoriza producción ni despliegue productivo.

## Objetivo

Implementar y validar exclusivamente en TEST la venta presencial asistida,
comandas, resumen por apertura y preparación de cierre. La primera entrega debe
ser trazable, atómica frente a stock y segura frente a concurrencia. El cierre
persistente de una apertura queda fuera de la primera escritura salvo
autorización y contrato específico posteriores.

## Base ya disponible y coherencia revisada

- `src/lib/fase5/ventaPresencial.ts` ya define entrada de venta, validación de
  `apertura_id`, vendedor, productos, cantidades, precio calculado y comanda
  preparada sin persistencia.
- `src/lib/fase6/cajaPorApertura.ts` resume una única apertura, separa
  cancelados y pendientes, agrupa formas de pago y prepara un cierre de solo
  lectura con alertas.
- Los tests de ambas fases cubren granel/unidades, stock, total calculado,
  apertura inválida, comanda, cancelados, agrupación de pagos y diferencias de
  efectivo. La implementación backend debe conservar esos contratos, no confiar
  en valores del navegador y ampliar pruebas de integración.

## Archivos probablemente involucrados

- `scripts/apps-script-pedidos.gs`: nuevas acciones TEST y validación del
  entorno; no modificar producción ni usar el mismo despliegue productivo.
- `src/lib/appsScriptPedidos.ts`: helpers de servidor para las acciones TEST,
  sin entregar token al cliente.
- Rutas protegidas bajo `src/app/api/admin/` para venta, lectura de resumen y
  comanda, solo si siguen el patrón de sesión existente.
- Componentes/rutas de administración o vendedor, después de que el backend
  TEST esté validado. Preservar `/admin?demo=1` aislado.
- `src/lib/fase5/ventaPresencial.ts`, `src/lib/fase6/cajaPorApertura.ts` y sus
  tests: mantenerlos como contrato de lógica compartida, sin sustituir la
  validación de servidor.

## Schema TEST que se debe verificar antes de escribir

No asumir que estos encabezados existen: inspeccionarlos directamente en la
Sheet TEST y documentar cualquier migración aditiva antes de aplicarla.

| Hoja | Verificación mínima |
| --- | --- |
| `APERTURAS` | `apertura_id`, estado general, horario y estado de modo presencial; una sola apertura habilitada para venta. |
| `PRODUCTOS` | id, estado activo, precio de venta, stock, permite decimal y paso de venta. |
| `VENTAS` | id de venta, fecha/hora, apertura, origen, total, estado, pago, vendedor, observaciones y auditoría. |
| `DETALLE_VENTAS` | id de detalle, venta, producto, cantidad, precio unitario y subtotal. |
| `MOVIMIENTOS_STOCK` | referencia de venta, salida y regla de reversión/anulación. |
| `PEDIDOS` | `apertura_id`, `origen_pedido`, estado, pago y total para el resumen por apertura. |
| `CONFIG` | solo claves operativas necesarias; no copiar ni registrar secretos. |

## Acciones Apps Script futuras en TEST

1. Leer catálogo presencial vendible y apertura presencial habilitada desde
   datos confiables del servidor.
2. Crear venta presencial dentro de `LockService`: revalidar sesión/autorización,
   apertura, productos, cantidades, precio y stock; calcular total en servidor;
   escribir cabecera, detalle y movimiento de stock de forma coherente.
3. Implementar anulación/reversión únicamente después de definir su política y
   de evitar doble devolución de stock.
4. Leer resumen filtrado estrictamente por `apertura_id`, sin mezclar otras
   aperturas y sin sumar cancelados a caja.
5. Preparar borrador de cierre de lectura. No modificar
   `APERTURAS.estado_apertura` ni registrar un cierre definitivo en el primer
   bloque.

## Pruebas manuales TEST necesarias

1. Confirmar guardrails y que la configuración local apunta a TEST sin imprimir
   valores ni modificar variables.
2. Crear una venta presencial de unidades y una de granel; comprobar total,
   detalle y movimiento de stock.
3. Intentar cantidad inválida, producto inactivo, stock insuficiente, apertura
   cerrada/no habilitada y repetición concurrente; comprobar que no queden
   escrituras parciales.
4. Generar comanda y confirmar que no expone observaciones internas ni secretos.
5. Comparar resumen de una apertura con anticipados, presenciales, pendientes y
   cancelados; verificar efectivo, transferencia y diferencia declarada.
6. Confirmar que `/admin` exige sesión y que `/admin?demo=1` continúa sin
   llamadas de escritura.
7. Ejecutar `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` y revisar
   `git diff --check` antes de cada commit.

## Riesgos y decisiones que deben resolverse antes

- Roles autorizados para vender, corregir/anular ventas y revisar diferencias.
- Regla de estado inicial de la venta y política de anulación/devolución.
- Tratamiento de pedidos pagados en efectivo al retirar para no duplicar caja.
- Encabezados reales, IDs y orden de migración aditiva de las hojas TEST.
- Formato, numeración y contenido final de la comanda.
- Criterio humano para aprobar una diferencia de caja y para habilitar un cierre
  persistente.

## Guardrails obligatorios

- Todo endpoint y toda escritura nueva deben bloquearse fuera de TEST; no
  habilitar producción por ausencia de configuración.
- Conservar la separación de configuración TEST/productiva y los checks de
  entorno existentes; no editar ni imprimir `.env.local`.
- Apps Script debe exigir `APP_ENV=TEST` para estas acciones y mantener token
  administrativo solo en servidor.
- No incluir URLs, tokens, IDs de Sheet/Script ni datos de auditoría internos en
  DTO públicos, logs, pruebas o documentación.
- No desplegar ni migrar nada sin una instrucción explícita y una revisión del
  diff de Apps Script destinada a TEST.

## Propuesta de commits separados

1. `feat(fase-5): implementar venta presencial test` — Apps Script TEST,
   helpers/rutas protegidas, contrato y pruebas de venta/stock.
2. `feat(fase-6): agregar resumen de caja por apertura test` — lectura de
   resumen, helpers/rutas y pruebas de cancelados, pendientes y pagos.
3. `docs(fase-5-6): registrar validacion venta y caja test` — resultados
   manuales, migraciones realmente ejecutadas y pendientes, solo tras validar.

Si el cierre persistente se autoriza más adelante, debe ser un cuarto bloque
separado, con revisión operativa y pruebas de reversión.

## Checklist de aceptación final

- [ ] Schema TEST y decisiones operativas revisados antes de modificar código.
- [ ] Apps Script TEST separado y guardado con guardrail de entorno.
- [ ] Precios, totales, stock y apertura se revalidan dentro del servidor y lock.
- [ ] Cabecera, detalle y movimiento no dejan estados parciales ante error.
- [ ] Cancelados y pendientes no se mezclan en la caja vigente.
- [ ] Rutas nuevas requieren sesión/rol; no filtran campos internos.
- [ ] Demo admin, flujo anticipado TEST y comportamiento productivo existentes
      permanecen sin cambios.
- [ ] Pruebas automatizadas, prueba manual TEST, lint, build y diff-check OK.
- [ ] Commit selectivo sin archivos de `design-system/`, `reports/` ni
      `docs/TEST_PLAN.md`.
