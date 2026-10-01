# Conteo físico y corte — preparado, no aplicado

Plantilla privada CONTEO_FISICO_TEST.csv: 52 comerciales activos, stock contado/mínimos/prioridades vacíos; históricos/fixtures excluidos. Costos y precios son readback TEST, no aprobación de inventario. No se cargaron cantidades físicas ni saldos.

## Preparación humana

Operación y segundo revisor fijan un corte horario común, identifican ID/marca/formato y congelan movimientos durante conteo/importación. Segundo recuento de diferencias; no unir SKU por parecido.

| Campo CSV | Regla |
|---|---|
| ID, nombre, modo | Conservar maestro exacto |
| unidad_conteo | GRANEL kg; envasados unidad/pack del maestro |
| stock_contado | Cero/positivo; kg hasta tres decimales: 0,001 kg = 1 g; unidades enteras. Sin separadores de miles |
| costo_vigente/base_costo_gramos | Costo por base histórica de stock; debe coincidir con maestro acreditado |
| precio_venta/referencia_precio_gramos | Precio público por referencia; coincide con maestro. No calcular margen automático |
| minimo/prioridad | Mínimo en unidad de conteo; alta/media/baja. Aprobados por Operación |
| observacion | Diferencia, fuente y segundo recuento; sin datos sensibles |

Stock nativo = kg ×1000 / gramos_unidad_stock. Pimienta1,5kg con base100g =15 unidades nativas; Arroz1,5kg/base1000g =1,5. Costo/kg a base100g: dividir entre10; a250g: entre4. Cantidad de venta en gramos es independiente de la base heredada. No cambiar base/ID ni snapshots.

Los [22 pendientes comerciales](CATALOGO_PENDIENTES_REALES_2026-10-01.md) se resuelven con respaldo antes de aplicar. Importador no cambia costo/precio para hacer pasar un archivo: usar plan comercial separado y luego nuevo dry-run.

## TEST: plantilla, dry-run y aplicación futura

Wrapper exige TEST/backend confirmado y excluye variables productivas del proceso hijo. Archivos/planes/backups/acta privados ignorados. Salidas nuevas: no sobrescribir respaldo.

```powershell
node scripts/run-test-env.mjs scripts/conteo-fisico-test.mjs --template --output operativa.local/CONTEO_FISICO_TEST.csv
node scripts/run-test-env.mjs scripts/conteo-fisico-test.mjs --dry-run operativa.local/CONTEO_FISICO_TEST.csv --output operativa.local/conteo-plan-v1.json
```

Dry-run valida CSV/BOM/comillas/multilínea, cobertura, duplicados, inactivos/fixtures, negativos/NaN/ausentes, unidad/modo, precisión, base/referencia, costo/precio y mínimos/prioridad. Informe por códigos; cero escrituras en Sheet.

Aplicación futura: acta privada con entorno TEST, hash SHA256 del CSV del plan, fecha_corte ISO con offset Santiago, responsable activo Operación/Admin, segundo_revisor distinto, referencia_evidencia y conteo_revisado=true. Plantilla de acta local mantiene null/false hasta evidencia real.

```powershell
# SOLO después de acta revisada y cuentas TEST incorporadas; no ejecutado ahora:
node scripts/run-test-env.mjs scripts/conteo-fisico-test.mjs --apply-test operativa.local/CONTEO_FISICO_TEST.csv --plan operativa.local/conteo-plan-v1.json --approval operativa.local/conteo-aprobacion.json --confirm APLICAR_CONTEO_TEST
```

Recalcula plan desde CSV/baseline, rechaza alteraciones, compara maestro actual, respalda Sheet, aplica deltas auditables con stock_esperado bajo lock, actualiza mínimos/prioridad y verifica readback. Precio/costo/historia no se alteran. Replay conserva keys; si quedó parcial, consultar movimientos y continuar con mismo archivo/plan/acta. Otro conteo exige archivos nuevos.

Stock concurrente/divergente devuelve409. No sobrescribirlo. Rollback: congelar movimientos, preservar snapshots y conciliar por IDs; compensar solo filas aplicadas con nueva key/acta, delta baseline menos stock actual y expected actual. No restaurar toda la tabla, deshacer ventas posteriores ni borrar historia.

## Caja y banco

SALDOS_CORTE.csv local sin montos: corte común, efectivo contado, banco conciliado, gastos/transferencias/pendientes, diferencia explicada, responsable/revisor, respaldo y firma. Tesorería coteja extracto y efectivo real. Nunca crear gasto/venta ficticia para cuadrar. Caja de compra y caja por apertura tienen semánticas distintas; conservar actas fuera de Git.

## Evidencia técnica

18 pruebas nuevas y 44 focales con granel; suite 468 PASS. 1 g en tres bases, CSV, negativos/NaN, cobertura, unidad, costo/precio, duplicados/inactivos, stock esperado/replay, propuesta de abastecimiento de 1 g y UNIDAD histórica. Apps Script TEST v18 desplegado con backup privado de v17 y preflight remoto antes/después. Plantilla y dry-run de solo lectura detectan 178 casillas pendientes; no certifican conteo real. stock_fisico/costos/minimos_prioridades/saldos siguen HUMAN_GATE.
