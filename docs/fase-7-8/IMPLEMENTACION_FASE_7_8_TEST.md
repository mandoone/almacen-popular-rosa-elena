# Implementación Fase 7 + Fase 8 — TEST

Estado al 2026-09-16: implementación local y remota TEST completa. Se actualizó
el deployment TEST existente mediante el flujo clasp protegido, se creó el
backup TEST, se aplicó la migración aditiva y el segundo preflight confirmó el
esquema completo. El E2E F7/F8 y el QA visual desktop/móvil terminaron verdes.
No se usó configuración productiva ni se tocó producción.

## Seguridad y alcance

- Todas las acciones F7/F8 de Apps Script exigen `ADMIN_TOKEN` y
  `APP_ENV=TEST`.
- Next exige `NEXT_PUBLIC_APP_ENV=test` antes de invocarlas y selecciona
  exclusivamente las variables `_TEST`.
- El E2E F78 bloquea si detecta cualquier variable genérica productiva.
- La migración estructural y las escrituras E2E tienen opt-ins distintos.
- Los POST no se repiten desde el cliente Next. El runner E2E solo repite una
  operación cuando conserva exactamente la misma clave y el mismo payload
  idempotente.
- No existe limpieza destructiva automática ni acceso a producción.

## Esquema aditivo propuesto

Se preservan hojas, columnas y filas existentes. `prepararEsquemaFase78Test`
crea un backup TEST antes del primer cambio y luego crea/extiende únicamente:

| Hoja | Propósito |
|---|---|
| `COMPRAS` | Cabecera, estado, total calculado, idempotencia y auditoría temporal |
| `DETALLE_COMPRAS` | Snapshot de producto, cantidad/costo y stock/costo anterior/nuevo |
| `GASTOS_EXTRA` | Gastos vigentes en categorías cerradas, con idempotencia |
| `HISTORIAL_COSTOS` | Todo costo derivado de compra o ajuste admin explícito |
| `CAJA_COMPRA` | Saldo, efectivo, pendientes de referencia y presupuesto confirmado |
| `AUDITORIA_PRODUCTOS` | Altas y ediciones de catálogo con cambios y responsable |
| `MOVIMIENTOS_STOCK` | Extensión aditiva para saldo, responsable e idempotencia persistente |
| `PRODUCTOS` | Validación de las columnas admin necesarias, sin editar stock directamente |

Las hojas operativas anteriores nunca se eliminan ni reordenan.

## Contratos Fase 7

### Compra

`crearCompra` valida fecha, proveedor, responsable, productos activos,
cantidad/paso y costo entero CLP positivo. Calcula subtotales y total en el
backend bajo `LockService`; actualiza stock y costo, agrega detalle, movimiento
e historial, y escribe la cabecera al final. Ante error restaura stock/costo y
retira exclusivamente las filas agregadas por esa transacción.

La idempotencia queda persistida en `COMPRAS` mediante
`idempotency_key + payload_hash`: replay idéntico devuelve la compra existente;
payload distinto produce conflicto lógico 409.

### Gastos y caja

Los gastos aceptan `bencina`, `bolsas`, `propina`, `transporte`, `materiales` u
`otros`, siempre con descripción, monto positivo y responsable. Caja separa
los pendientes por cobrar como referencia y nunca los suma al dinero
disponible. El presupuesto final es confirmado/editable y deja trazabilidad.

### Abastecimiento

La propuesta repone solo productos activos bajo mínimo, ordena por prioridad,
respeta paso y presupuesto, y excluye productos sin costo. La UI muestra de
forma permanente:

> PROPUESTA DE ABASTECIMIENTO TEST — NO USAR COMO RECOMENDACIÓN OPERATIVA REAL

Rotación, esencialidad y necesidad de reposición se combinan mediante pesos y
umbrales configurables; no se inventan señales comerciales.

## Contratos Fase 8

- Historiales: pedidos, ventas, compras, stock, costos, gastos y auditoría de
  productos, con filtros básicos de fecha/producto/apertura.
- Reportes: ventas/productos más vendidos, caja por apertura existente,
  productos bajo stock, compras, gastos, costos y movimientos.
- Productos: alta inicial inactiva con stock cero, edición/activar/desactivar y
  auditoría. Cambiar costo explícitamente también registra historial.
- Stock: solo mediante delta, motivo, responsable e idempotencia persistida en
  el movimiento. Un replay idéntico no vuelve a mutar; payload distinto da 409.
- Roles: las rutas nuevas quedan bajo el middleware y sesión admin. El modelo
  actual no tiene identidades separadas por persona; el vendedor conserva solo
  las pantallas operativas existentes y las nuevas capacidades se exponen en
  `/admin/*`.

## Rutas incorporadas

- `/admin/compras`
- `/admin/gastos`
- `/admin/abastecimiento`
- `/admin/historiales`
- `/admin/productos`
- `/api/admin/compras` y `/api/admin/compras/[id]`
- `/api/admin/gastos`
- `/api/admin/caja-compra`
- `/api/admin/abastecimiento`
- `/api/admin/reportes`
- `/api/admin/productos`
- `/api/admin/stock/ajustes`

## Activación y evidencia TEST

El flujo ejecutado, siempre con variables TEST solo en memoria y sin variables
productivas genéricas, fue:

1. `npm run apps-script:test:dry-run`
2. `npm run apps-script:test:deploy`
3. preflight F78 read-only
4. migración aditiva con opt-in independiente
5. segundo preflight read-only
6. E2E con opt-in de escritura y reanudación idempotente

La migración creó el backup antes de modificar headers. El E2E conservó la
evidencia TEST y no borró historia. No alteró productos comerciales para probar
compra entera o ajuste.

Evidencia principal:

- marcador: `E2E-TEST-F78-64c8be2c22e0472ba5748d07`;
- producto aislado: `PROD-TEST-F78-64C8BE2C22E0`;
- compra unitaria: `COM-20260916-214837-cdf285a4`;
- compra decimal: `COM-20260916-214900-7f93fe10`;
- gasto: `GAS-20260916-221553-e532e57b`;
- caja: `CAJ-20260916-221605-a7303da2`.

La lectura final confirmó dos compras, un gasto, dos movimientos del producto
aislado (entrada + ajuste) y dos eventos de auditoría (alta + edición). El
producto aislado quedó inactivo, con stock `2` y costo fixture `1000`;
`PROD-TEST-DECIMAL` permanece activo, con stock `5.6` y costo fixture `1000`.
Estos costos y existencias son datos controlados TEST, no valores comerciales.

La primera corrida persistió ambas compras antes de interrumpirse por una
comparación binaria `0.099999...` contra `0.1`. La reanudación conservó el mismo
marcador, fecha, claves y payloads, leyó evidencia antes de cada POST y recuperó
las operaciones sin duplicarlas. Se validaron replay idéntico, conflicto 409,
rechazo de cantidad decimal en producto entero sin efectos, gasto, caja,
abastecimiento, edición/activación, ajuste auditable, historiales y reportes.

## QA visual y robustez HTTP

Se revisaron sin enviar formularios las cinco interfaces nuevas en escritorio y
móvil: compras, gastos, abastecimiento, historiales/reportes y productos/stock.
No hubo desbordes visibles ni errores actuales de hydration/runtime. Durante el
QA se corrigieron dos defectos objetivos:

- un 404 HTML final de `googleusercontent` puede llegar con `redirected=false`;
  ahora solo los GET seguros lo reintentan una vez y los 4xx JSON funcionales no
  se ocultan;
- las tablas históricas usan claves compuestas únicas y formatean cantidades
  decimales sin exponer residuos binarios.

Las lecturas remotas pueden tardar varios segundos por latencia de Apps Script,
pero los retries son acotados y ningún POST de la aplicación se repite
automáticamente.

QA final: `npm ci` reproducible, 265/265 tests, lint PASS, build PASS (22
páginas), dry-run clasp TEST PASS y `git diff --check` PASS. `npm audit`
mantiene 5 hallazgos conocidos (0 críticos, 3 altos, 1 moderado y 1 bajo); no se
aplicó `audit fix` ni una migración mayor a Next 16.

## Decisiones humanas no bloqueantes

- Definir identidades/roles separados si se requiere trazabilidad individual
  más fuerte que la sesión admin compartida actual.
- Definir fuente y periodicidad del saldo bancario/efectivo antes de operación
  real.
- Sustituir mínimos, prioridades, costos y stock sintéticos por datos aprobados
  antes de tratar abastecimiento como recomendación real.

Estas decisiones no bloquean la validación técnica en TEST, pero sí el Go/No-Go
operativo/productivo.
