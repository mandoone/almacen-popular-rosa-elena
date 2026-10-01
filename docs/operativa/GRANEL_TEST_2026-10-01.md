# Venta real a granel — TEST 01/10/2026

Evidencia humana directa Nadia, entregada por Omar el 01/10: los pesos estipulan el precio; se puede pedir cualquier cantidad a granel, incluido arroz 250 g. Supersede paquetes cerrados, SKU por peso y mínimos/pasos 250 g. Los accesos rápidos son opciones, nunca restricciones.

Contrato dueño: [DATA_MODEL](../DATA_MODEL.md). Código TEST v17. La solicitud pública/presencial lleva `cantidad` en gramos enteros positivos para GRANEL. Precio, modo y referencia se leen del maestro bajo lock. Cero, negativos, fracciones, valores no finitos y datos mal formados se rechazan. Los campos de precio/subtotal/modo/referencia enviados por browser no participan del cálculo ni del hash canónico.

| ID | Producto | Gramos referencia | Precio CLP | Costo TEST por referencia |
|---|---|---:|---:|---:|
| PROD-001 | Arroz | 1000 | 1350 | 1200 |
| PROD-002 | Arroz integral | 1000 | 1100 | 1500 |
| PROD-003 | Avena Integral | 1000 | 1100 | 1000 |
| PROD-004 | Carne vegetal | 1000 | 1800 | 1600 |
| PROD-005 | Garbanzos | 1000 | 2450 | 2200 |
| PROD-006 | Harina | 1000 | 900 | 785 |
| PROD-007 | Harina Integral | 1000 | 1100 | PENDING_HUMANO |
| PROD-008 | Lentejas | 1000 | 2100 | 1900 |
| PROD-009 | Poroto blanco | 1000 | 2000 | 1800 |
| PROD-011 | Quínoa | 1000 | 4800 | 4400 |
| PROD-012 | Sal de Cáhuil | 1000 | 500 | 360 |
| PROD-013 | Mote | 1000 | 1900 | PENDING_HUMANO |
| PROD-014 | Té | 250 | 2300 | 2100 |
| PROD-015 | Pimienta | 100 | 1350 | 1200 |
| PROD-016 | Ají de color | 100 | 700 | 600 |
| PROD-017 | Bicarbonato | 100 | 150 | 110 |
| PROD-018 | Orégano | 100 | 700 | 640 |
| PROD-019 | Aliño completo | 100 | 900 | 800 |

Precio: comanda preparada para 03/10; costo: Diseño de compra Octubre, bloque COMPRA 03/10. Once costos adicionales cerrados (001–006, 008, 009, 011, 012, 019). Cinco costos ya acreditados se conservan. No convertir el cero sin respaldo de Mote en costo real; Harina Integral no tiene fuente. No imponer margen: Arroz integral conserva precio 1100 aunque costo sea 1500.

Diez precios adicionales cambian: 001, 002, 003, 004, 005, 008, 009, 011, 012, 019. Cinco nombres dejan el paréntesis de peso: el peso vive en la referencia. IDs, actividad, oferta por apertura y saldos numéricos se conservan.

## Stock e historia

Inspección previa: los 18 maestros usan `unidad` con saldos técnicos heredados; el fixture decimal tiene 5.5 kg. No se presume conteo físico ni se convierten masivamente saldos. `gramos_unidad_stock` fija la equivalencia técnica de cada base histórica (1000, 250 o 100 g); la base kg usa 1000. No afirma cuántos kilos existen físicamente.

Los nuevos detalles guardan gramos solicitados y referencias; `cantidad` conserva la cantidad en base nativa de stock. Un pedido antiguo conserva su cantidad/unidad originales y el mismo movimiento al confirmar/cancelar. La base queda congelada una vez establecida y no se cambia mediante edición normal. Cambiar la referencia comercial no cambia la base de stock ni el costo por base. Conteo físico: registrar kg con tres decimales y convertir contra esta equivalencia; nunca editar detalles antiguos.

Saldos en milésimas de base nativa, suficientes para exactamente 1 g en las tres bases admitidas. Diario durable, replay y devolución única conservados; backend evita la suma de duplicados superior al saldo. Crear pedido no descuenta; confirmar descuenta y cancelar pendiente/listo devuelve una vez.

## Reproducir

```powershell
node scripts/run-test-env.mjs scripts/migrar-granel-test.mjs --dry-run
node scripts/run-test-env.mjs scripts/migrar-granel-test.mjs --apply-test
node scripts/run-test-env.mjs scripts/e2e-granel-test.mjs --write-test --fecha <fecha-sintetica-libre-futura>
node scripts/run-test-env.mjs scripts/e2e-granel-test.mjs --restore-test
```

Antes de aplicar: destino exacto TEST, snapshot completo privado y plan/diff; backup remoto completo y backup local Apps Script v16. Esquema aditivo en PRODUCTOS/DETALLE_PEDIDOS/DETALLE_VENTAS con backup previo y repetición sin cambios. Readback de maestros y comparación fila/campo de historia preexistente; auditoría/costos solo anexan registros. Evidencia privada en `operativa.local/granel-*`.

QA: cálculos obligatorios Arroz 250 g = 338; Harina 750 g = 675; Poroto blanco 250 g = 500; Pimienta 150 g = 2025; Té 500 g = 4600. Pruebas de cantidades libres, precio hostil, saldos de 1 g, replay, cancelación y venta presencial. Suites históricas conservan UNIT/decimal legado y POR_APERTURA. QA HTTP y visual se registran en el [cierre TEST](CIERRE_TEST_2026-10-01.md); no sustituyen ensayo humano.

Producción no modificada. Ninguna apertura real ni Empanadas se habilita para QA.
