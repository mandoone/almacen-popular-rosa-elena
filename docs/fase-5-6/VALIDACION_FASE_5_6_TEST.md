# Validación manual TEST — Fase 5 + Fase 6

**Estado:** implementación preparada; despliegue y validación manual TEST
pendientes. Fase 5 y Fase 6 no están cerradas.

## Alcance implementado

- Venta presencial con cálculo de precio/total en Apps Script, validación de
  apertura, producto, decimales, paso de venta y stock.
- Escritura de cabecera, detalle, salida de stock y stock resultante bajo
  `LockService`, con idempotencia y reversión compensatoria ante error.
- Panel protegido `/admin/vendedor` y comanda imprimible.
- Resumen protegido `/admin/caja` por apertura, separado por origen, pago,
  pendientes y cancelados; solo lectura/borrador.
- Guardrails en Next.js y Apps Script que bloquean estas funciones fuera de TEST.

No se implementaron anulación de venta, gastos extra, rol vendedor separado ni
cierre persistente de apertura.

## Preparación manual por Omar

1. Confirmar que se trabaja únicamente con el proyecto Apps Script TEST y su
   Sheet TEST, sin copiar ni mostrar identificadores o tokens.
2. Reemplazar el contenido del proyecto Apps Script **TEST** con
   `scripts/apps-script-pedidos.gs`. No pegarlo en el proyecto productivo.
3. Confirmar en las propiedades del script TEST que `APP_ENV` sea exactamente
   `TEST` y que la configuración ya existente corresponda exclusivamente a TEST.
4. Ejecutar manualmente `prepararColumnasVentaPresencialTest` desde el editor.
   La función no crea hojas ni borra datos: verifica `VENTAS`,
   `DETALLE_VENTAS` y `MOVIMIENTOS_STOCK`, y agrega solo encabezados faltantes.
5. Revisar el resultado devuelto y confirmar en la Sheet TEST los encabezados
   agregados antes de desplegar.
6. Crear una nueva versión del despliegue Web App **TEST** con el script
   actualizado. No cambiar el despliegue productivo.
7. Mantener la aplicación local apuntando a la configuración TEST ya existente,
   sin editar, leer ni imprimir `.env.local` durante esta validación.

## Datos mínimos controlados

- Una apertura existente en estado `activa` y con
  `modo_presencial_estado = activo`.
- Un producto activo vendido por unidad, con precio y stock suficientes.
- Un producto activo decimal, con `permite_decimal = SI` y un `paso_venta`
  conocido (por ejemplo 0,25).
- Stock inicial anotado manualmente para comparar cada resultado.

## Checklist Fase 5

- [ ] Iniciar sesión admin y abrir `/admin/vendedor`; confirmar indicador TEST.
- [ ] Registrar una venta del producto por unidad y verificar `VENTAS`,
      `DETALLE_VENTAS`, `MOVIMIENTOS_STOCK` y descuento en `PRODUCTOS`.
- [ ] Registrar una venta decimal válida y verificar paso, subtotal y stock.
- [ ] Confirmar que precios, subtotales y total coincidan con el catálogo TEST.
- [ ] Confirmar que la comanda muestre ID, apertura, vendedor, detalle y total.
- [ ] Intentar fracción en producto entero, paso inválido, producto inactivo,
      stock insuficiente y apertura no habilitada; no debe quedar escritura.
- [ ] Repetir exactamente una solicitud con la misma clave idempotente y
      comprobar que no duplica venta ni descuento.
- [ ] Ejecutar dos ventas simultáneas que compitan por el mismo stock y confirmar
      que solo las compatibles con el stock final se registren.

## Checklist Fase 6

- [ ] Abrir `/admin/caja` y seleccionar la apertura controlada.
- [ ] Comparar cantidades y totales de ventas presenciales y pedidos anticipados.
- [ ] Confirmar pendientes por cobrar y agrupación de efectivo/transferencia.
- [ ] Confirmar que cancelados aparezcan separados y no sumen al total vigente.
- [ ] Confirmar que la vista diga cierre de lectura/borrador y que seleccionar o
      recargar no cambie `estado_apertura`.
- [ ] Confirmar que gastos extra y cierre definitivo no se ofrecen.

## Regresión y criterio de aceptación

- [ ] `/admin?demo=1` continúa con datos ficticios y sin llamadas a Apps Script.
- [ ] El flujo de pedidos anticipados y su cancelación continúa funcionando.
- [ ] `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` y
      `git diff --check` pasan.
- [ ] No hay escrituras parciales tras errores simulados ni doble descuento por
      reintento/concurrencia.
- [ ] La Sheet TEST coincide con ventas, detalle, movimientos y stock esperado.

Solo después de completar y registrar este checklist se puede considerar cerrar
Fase 5 y Fase 6. Producción requiere una decisión y plan separados.

## Resultado automático local

- `npm.cmd test`: 169/169 pruebas aprobadas.
- `npm.cmd run lint`: sin warnings ni errores.
- `npm.cmd run build`: compilación, tipos y generación de rutas aprobados.
- `git diff --check`: sin errores de whitespace.

La validación E2E con Apps Script/Sheet TEST no se ejecutó porque requiere el
pegado, preparación y despliegue manual descritos arriba.

## Riesgo conocido

Google Sheets no ofrece una transacción multitabla. El script minimiza el riesgo
con lock, orden de escritura y rollback compensatorio, pero un fallo extremo de
la plataforma durante la reversión puede requerir revisión manual en TEST. La
anulación segura y el cierre persistente quedan pendientes para no implementar
flujos incompletos.
