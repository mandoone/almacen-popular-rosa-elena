# F10 — Guion del ensayo final en TEST (no ejecutado)

Este guion solo prepara la puesta en marcha. Requiere identidades humanas,
datos aprobados y responsable designado antes de ejecutarse. No autoriza
Producción ni repetir los E2E técnicos ya cerrados de F4–F9-A. Cada paso de
escritura se hará **solo en TEST**, con IDs de ensayo, readback y restauración
trazable; no se borran operaciones históricas `REQUIERE_REVISION`.

## Preparación y registro

- Responsable funcional y suplente: `PENDIENTE_ALMACEN`. Técnico y segundo
  revisor: por designar. Ventana, enlace de acta y canal de incidente: pendientes.
- Confirmar inequívocamente `NEXT_PUBLIC_APP_ENV=test`, backend Apps Script TEST,
  Sheet TEST, rama/commit y URL de Preview. Si alguno no coincide, **NO-GO**.
- Congelar fixtures de ensayo y guardar conteos, saldos e IDs iniciales en el
  repositorio operativo autorizado, nunca aquí. Separar datos sintéticos de
  datos reales. Preparar IDs/idempotency keys únicos y plan de conciliación.
- En el acta por escenario registrar: fecha/hora, actor/rol, precondición,
  referencia de evidencia no sensible, resultado PASS/FAIL, variación esperada
  y observada, readback, restauración y segundo revisor.
- Cualquier escritura ambigua se busca primero por ID/key en operaciones y
  movimientos antes de reintentar. Detener el ensayo ante escalada de privilegios,
  duplicación, stock/caja inconsistente, error de entorno o secreto expuesto.

## Escenarios de extremo a extremo

La matriz es un orden operativo, no una afirmación de PASS. Cada escenario
se marca pendiente hasta que su evidencia esté revisada. El ensayo completo
alimenta `ensayo_test` del manifiesto F10 v2.

| Paso | Precondición y acción TEST | Evidencia/PASS | FAIL y recuperación |
|---|---|---|---|
| 1. Acceso | Cuentas humanas de cada rol aprobadas; iniciar y cerrar sesión | `/me` y capacidad coherentes, sesión inválida tras logout | Bloquear acceso, revocar sesión y revisar configuración |
| 2. Catálogo | Datos de staging aprobados; consultar producto y precio | ID, unidad, precio y disponibilidad coinciden con corte | No abrir pedidos; corregir staging y repetir lectura |
| 3. Venta web | Crear pedido sintético con key única | Un pedido durable, actor y total correctos | Buscar por key antes de reintentar |
| 4. Pedido | Pasar `RECIBIDO → PENDIENTE → LISTO → ENTREGADO` | Historial exacto y sin transición terminal indebida | Detener, preservar operación y conciliar estado |
| 5. Confirmación/stock | Confirmar pedido una vez y reintentar misma key | Un descuento exacto y un movimiento correlacionado | Conciliar stock/movimiento; no duplicar confirmación |
| 6. Cancelación | Pedido separado en estado cancelable; cancelar y reintentar | Una reposición exacta, cancelado terminal | Conciliar por ID/key; compensar solo con aprobación |
| 7. Venta presencial | Registrar venta sintética en apertura TEST | Venta, comprobante, descuento y caja coherentes | Detener turno y conciliar venta/stock/caja |
| 8. Compra/ajuste | Compra sintética y, si está autorizada, corrección acotada | Entrada/movimiento y stock readback exactos | Buscar operación; compensar con trazabilidad |
| 9. Gastos/caja | Registrar gasto y consultar caja del turno TEST | Saldo calculado coincide; lectura no muta aperturas | Detener cierre y revisar operaciones/corte |
| 10. Reportes/cierre | Consultar reportes y cerrar turno sintético | Totales conciliados con pedidos, ventas, compras y gastos | No declarar cierre; documentar diferencias |
| 11. Recuperación | Simular error reversible sin tocar Production | Responsable encuentra versión, backup y ruta de recuperación | NO-GO hasta tener procedimiento y respaldo verificables |

## Cierre del ensayo

Comparar IDs, movimientos, stock y caja con el baseline TEST; restaurar solo
mediante operaciones auditables y readback. No ocultar fallos ni eliminar las
dos operaciones históricas `REQUIERE_REVISION`. El responsable funcional y el
segundo revisor firman el acta; un PASS del ensayo no sustituye los otros 19
checks, el preflight productivo, ni la autorización de Producción.
