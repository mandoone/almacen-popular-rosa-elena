# Estado de entrada — Fases 7 y 8 en TEST

> Preparado el 2026-09-15 después del cierre técnico de Fase 4. Este documento
> no autoriza producción ni modifica Apps Script. Toda persistencia nueva debe
> validarse primero contra TEST con backup, guardarraíles e idempotencia.

## Base ya disponible

- Catálogo TEST: 54 filas identificables, cuatro categorías canónicas y unidades
  `unidad`/`pack`/`kg` coherentes con las decisiones aprobadas.
- Reglas de venta: `PROD-001`–`019` enteros con paso 1; fixture decimal permanente
  en kg con paso 0.1.
- `COMPRAS`, `DETALLE_COMPRAS` y `MOVIMIENTOS_STOCK` ya existen en el modelo/Sheet.
- Dominio puro F7 listo en `src/lib/fase7/compras.ts`: valida y calcula compras,
  gasto extra, caja disponible y propuesta conservadora por mínimo/presupuesto.
- Dominio puro F8 listo en `src/lib/fase8/`: ranking de ventas, bajo stock,
  resumen de compras, evolución de costos, edición de producto y ajustes de
  stock auditables.
- Apps Script TEST y deploy seguro con clasp ya tienen guardarraíles propios.

## Qué queda desbloqueado

| Bloque | Entrada F4 disponible | Próximo trabajo técnico |
|---|---|---|
| Persistencia de compras | IDs, unidades y pasos estables | Contrato, columnas aditivas, lock, idempotencia, escritura de compra/detalle/movimiento |
| Gastos extra | Categorías de gasto cerradas en dominio | Definir persistencia separada o detalle asociado, CRUD mínimo e inclusión en caja |
| Historial de costos | Costo se captura desde cada compra | Persistir costo anterior/nuevo y fecha sin recalcular automáticamente precio público |
| Abastecimiento | Categorías, activos y unidades canónicas | Conectar stock/mínimo/costo/prioridad; en TEST usar fixtures controlados mientras sigan sintéticos |
| Ajustes de stock | Stock directo excluido del plan F4 | Endpoint admin con motivo, responsable, lock y movimiento `ajuste` |
| Reportes | Ventas/caja F5/F6 y agregaciones F8 | Lecturas por rango/fecha para compras, gastos, costos, movimientos y bajo stock |
| Administración avanzada | Validador de edición disponible | Rutas/UI para crear/editar/activar; stock solo mediante ajuste auditado |

## Datos TEST que no deben interpretarse como operación real

- Stock actual sintético y derivado parcialmente de E2E.
- `stock_minimo=0` en todo el catálogo.
- `prioridad=media` uniforme.
- `precio_costo` y `margen_pct` vacíos.
- Precios públicos sin cambios; cuatro extremos requieren reconfirmación futura.
- Imágenes pendientes y `imagen_url` vacío.

Estos datos permiten probar persistencia y contratos, pero una propuesta de
abastecimiento no debe presentarse como recomendación real.

## Clasificación configurable de prioridad

F7 debe calcular prioridad con tres señales independientes: rotación histórica,
esencialidad configurable y necesidad de reposición derivada de stock/mínimo.
Los pesos y umbrales deben vivir en configuración TEST auditable, no quedar
hardcodeados como una decisión comercial. Hasta disponer de esas señales se
conserva `media`; el motor debe admitir simulación y revisión de excepciones
antes de persistir una clasificación.

## Orden de implementación recomendado

1. Auditar columnas reales de `COMPRAS`, `DETALLE_COMPRAS` y
   `MOVIMIENTOS_STOCK`; diseñar solo migraciones aditivas TEST.
2. Implementar compra idempotente bajo `LockService`, con rollback compensatorio
   ante fallo parcial y evidencia por `compra_id`.
3. Persistir gasto extra e historial de costo sin modificar precio de venta.
4. Implementar ajuste de stock auditado; prohibir edición directa.
5. Exponer lecturas F8 y luego UI admin/reportes.
6. Ejecutar E2E TEST con snapshots/deltas, sin borrar evidencia histórica.

## Condiciones de salida

- Ninguna escritura puede usar configuración genérica/productiva.
- Todo POST exige autenticación admin e idempotencia cuando pueda repetirse.
- Compras, detalle, costo y movimiento deben quedar reconciliables por ID.
- Precio público cambia solo mediante acción separada y aprobación explícita.
- F7/F8 pueden cerrarse técnicamente en TEST; producción conserva un Go/No-Go
  separado con conteo físico, mínimos, costos y prioridades reales.
