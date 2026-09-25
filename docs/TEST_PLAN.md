# TEST_PLAN.md — Plan de pruebas manuales

> Pruebas manuales del sistema. Cada caso: **pasos → resultado esperado**. Se amplía
> al avanzar cada fase. Funcionalidades actuales en `docs/PROJECT_STATE.md`.

---

## F9 global — activación sintética en Next TEST local (2026-09-25)

`node scripts/qa-identidad-test.mjs` genera tres claves aleatorias solo en
memoria, guarda hashes/secret TEST en `.env.development.local` ignorado y
restaura al final `test-admin=administracion`, `test-operacion=operacion`,
`test-venta=venta`, todos activos y con `session_version=1`.

Resultado observado: login y `/me` de los tres, cookies HTTP local, accesos
positivos/negativos, no enumeración, payload extra rechazado, actor/rol y token
falsificados rechazados, revocación y cambio temporal de rol con invalidación
de sesión, legacy apagado, rate limit local por IP/actor, rotación actual+
anterior, CSP/headers y origen cross-site: PASS. No hubo mutaciones de datos
de Apps Script ni Sheet. Navegador: formulario y error de credenciales visibles
sin overlay ni errores de consola; sesión autenticada y logout solo por HTTP.
Las claves no se conservan; para reingresar interactivamente se regeneran.

Pendiente: rate limit distribuido, dominio/CSP finales, QA visual autenticada,
asignación humana de roles y Go/No-Go. F9 global y F10 no están cerradas.
La batería posterior pasó: 392/392 tests, lint, build, secrets scan (261
archivos), preflight técnico y `check:go-no-go` en estado PENDING esperado.
`npm audit` conserva dos alertas conocidas (una moderada, una alta; ninguna
crítica) en Next/PostCSS; no se forzó una actualización mayor en este bloque.


## F9 global/F10 — identidad y hardening local (2026-09-25)

1. Configuración de cuentas: JSON ausente/inválido/duplicado, actor canónico,
   roles cerrados, PBKDF2 y credenciales incorrectas/desconocidas.
2. Revocación: `active=false`, cambio de rol o aumento de `session_version`
   invalidan una sesión ya firmada.
3. Rotación: solo versión actual/anterior válida; secreto corto, par incompleto o
   versión desconocida fallan cerrados.
4. Legacy: bloqueado en Producción y al existir usuarios, salvo recuperación
   explícita en TEST/local.
5. Login: quinto fallo por IP o actor activa 429/`Retry-After`; respuestas no
   enumeran usuarios. Mutaciones cross-site se rechazan.
6. Headers: CSP limitada a orígenes inventariados, cookies estrictas, HSTS y
   configuración productiva obligatoria.
7. F10: el manifiesto exige los 20 checks y evidencia; el modo estricto no puede
   dar READY mientras existan pendientes.

Resultado local final: **391/391 PASS**, `git diff --check`, lint, build,
secrets scan y preflight técnico PASS. No se ejecutaron E2E remotos ni
escrituras; F9-A no fue reabierta.

## F9-A — precondiciones F3B read-only (2026-09-25)

1. Simular fallo transitorio del GET de aperturas/capacidad seguido de éxito:
   máximo dos GET y creación posterior una sola vez.
2. Dos fallos transitorios: 503 de precondición, sin POST de creación.
   403, JSON lógico y contrato inválido no disparan retry.
3. Revisar logs saneados: etapa `PRECONDICION_APERTURA`,
   `PRECONDICION_CAPACIDAD` o `CREAR_PEDIDO`, sin token, URL efímera, HTML,
   cookies ni datos personales.
4. Retest remoto único: apertura sintética TEST, un pedido con teléfono textual,
   retry de creación con la misma key, conflicto de payload, confirmación,
   LISTO, cancelación y retry. Stock final igual al baseline y apertura cerrada.

Resultado: 382/382 tests locales PASS y retest remoto focalizado PASS con
`PED-20260925-091712-debc0442`. El GET de aperturas se recuperó de un 404
HTML transitorio; LISTO respondió 200 reconciliado. Tres operaciones durables
`COMPLETADA`, dos movimientos, stock final igual a 5.5 kg y apertura cerrada.
El 503 histórico ocurrió antes de `doPost` sin escrituras; su causa upstream
exacta continúa indeterminada. No se repitieron E2E F4–F8.

## F9-A — contrato de estados en Sheet TEST (2026-09-25)

1. Preflight read-only: `PEDIDOS.estado_pedido` debe tener en cada fila de datos
   una validación estricta con exactamente `recibido`, `pendiente`, `listo`,
   `entregado`, `cancelado`; también deben existir `OPERACIONES_PEDIDOS` y
   `MOVIMIENTOS_STOCK.operacion_id`.
2. Con la regla antigua de cuatro estados, el preflight y una creación nueva
   fallan antes de escribir cabecera, detalle o diario.
3. Migrar solo Sheet TEST; repetir la migración debe ser un no-op. Comparar
   encabezados, filas y las dos operaciones `REQUIERE_REVISION` antes/después.
4. Retest único con teléfono `000000000`: crear `RECIBIDO`, retry con misma key,
   conflicto con payload distinto, confirmar, pasar a LISTO y cancelar. Verificar
   diario, movimientos y stock final igual al baseline; cerrar la apertura TEST.

Deploy v15, migración TEST idempotente y retest remoto: PASS. F9 global sigue
abierta; Producción no autorizada.

## F9-A — creación durable e idempotente (2026-09-24)

Pruebas locales automatizadas:

1. `CREAR_PEDIDO` recorre `PREPARADA → APLICANDO → COMPLETADA`, crea una sola
   cabecera `recibido` y sus detalles, sin stock ni movimientos.
2. Misma key/payload devuelve el mismo pedido; payload distinto falla 409.
3. Fallo tras cabecera o durante detalles reanuda solo líneas faltantes; una fila
   incompatible queda `REQUIERE_REVISION`.
4. Dos solicitudes serializadas con la misma key no duplican el pedido.
5. La UI conserva la key ante resultado incierto, la rota al cambiar datos y la
   elimina tras éxito; una respuesta ambigua permite solo un replay idéntico.
6. Snapshot y resultado no contienen tokens, cookies ni secretos.

Pendiente remoto: desplegar Apps Script TEST v13 y ejecutar un único retest F9-A.
Producción permanece fuera de alcance.

## F9-A — respuesta HTTP ambigua e idempotencia end-to-end (2026-09-24)

Pruebas locales automatizadas:

1. Solo un POST con redirect, 404, HTML y destino `googleusercontent` recibe la
   categoría `RESPUESTA_POST_MUTACION_AMBIGUA`; 403, 500 JSON, otro origen,
   JSON inválido genérico y fallos de red no la reciben.
2. Confirmación y cancelación hacen como máximo un replay con la misma clausura
   (pedido, actor, payload y key); dos respuestas ambiguas no producen un tercer
   POST.
3. Un pedido ya cancelado llega al diario: la misma key recupera el resultado y
   una key nueva falla; ENTREGADO continúa sin poder cancelarse.
4. PENDIENTE → LISTO y LISTO → ENTREGADO nunca repiten POST. Tras la firma
   ambigua solo reconcilian si el readback confirma ID, estado y actor; cualquier
   divergencia conserva el error.
5. Los errores no incluyen URL efímera, query, HTML, token ni cookies; la UI
   mantiene la key hasta un éxito confirmado o reconciliado.

La corrección HTTP está desplegada en TEST v12. El E2E permanece FAIL hasta
desplegar y validar la creación durable; no se valida Producción.

## F9-A.1 — seguridad, sesión, autorización e IDs (2026-09-22)

Pruebas locales automatizadas:

1. Matriz completa: Venta opera pedidos pero no ajusta stock; Operación hereda
   Venta, ajusta stock y no gestiona configuración; Administración tiene todas.
2. Sesión: token válido, expirado, firma inválida, payload malformado, rol
   desconocido y compatibilidad provisoria `legacy-admin`.
3. Autorización: Venta puede pedidos, Operación puede stock y Administración
   puede productos; una sesión válida sin capacidad recibe `403`.
4. Stock: crear queda `recibido` sin movimiento; confirmar descuenta una vez;
   insuficiencia no escribe parcialmente; cancelaciones devuelven según origen;
   entregado/cancelado son terminales y entregar no toca stock.
5. Seguridad: payload hostil no sustituye acción/token/actor/rol; DTOs no
   propagan campos desconocidos; rutas distinguen prefijos por frontera.
6. Pedidos: dos altas en el mismo segundo tienen IDs distintos; movimientos
   multilínea usan IDs únicos; `listo → pendiente` falla; errores en primera,
   intermedia o última línea compensan la creación parcial.
7. Sesión UI: invalidar caché fuerza a leer la identidad nueva; login legacy
   falla en producción salvo TEST/local explícito.
8. QA requerido: `npm test`, `npm run lint`, `npm run build`,
   `npm run scan:secrets` y `npm run preflight:tecnico`.

Validación remota pendiente: desplegar solo en Apps Script TEST tras aprobar el
diff y ejecutar un plan específico de F9-A. Este lote prohíbe escrituras remotas,
deploys y la repetición de los E2E F4–F8.

## F9-A.2 — diario durable e idempotencia multitabla (2026-09-22)

Pruebas locales automatizadas con inyección de fallos:

1. Confirmación completa: `PREPARADA → APLICANDO → COMPLETADA`, stock esperado,
   movimientos únicos ligados a `operacion_id` y pedido `pendiente`.
2. Retry completado devuelve el mismo resultado sin escrituras; misma key con
   payload/actor distinto falla con `IDEMPOTENCY_CONFLICT`.
3. Fallos en primer/intermedio producto, movimiento, pedido o `flush` no afirman
   éxito; el mismo retry continúa sin duplicar efectos.
4. Readback divergente marca `REQUIERE_REVISION`; si también falla ese registro,
   se conserva el error original y se informa `CONSISTENCIA_INCIERTA`.
5. Confirmación simultánea y confirmación contra cancelación quedan serializadas
   y una operación activa bloquea claves incompatibles.
6. Cancelación y retry reponen una sola vez; una cancelación interrumpida continúa
   desde evidencia real.
7. El diario no guarda tokens/cookies/secretos y la migración preparada es
   aditiva, idempotente y exclusiva de TEST.

Pendiente manual/remoto: ejecutar migración, despliegue y validación solo en TEST
después de aprobar el diff. No se declara transacción ACID ni se ejecutaron E2E
remotos en este lote.

### Corrección final F9-A — casos fail-closed y numéricos (2026-09-23)

1. Estados de diario vacío, whitespace, `null`, desconocido o con casing no
   canónico bloquean tanto una nueva key como el retry con la misma key, sin
   modificar pedido, stock ni movimientos.
2. `PREPARADA` y `APLICANDO` solo se reanudan con la misma key;
   `REQUIERE_REVISION` no se reanuda automáticamente y `COMPLETADA` permite una
   transición posterior legítima.
3. El comparador durable acepta números finitos y strings numéricos completos;
   rechaza vacíos, `null`, `NaN`, infinitos, coma decimal, moneda, unidades y
   cualquier string mixto.
4. Un número inválido en snapshot, stock o movimiento impide `COMPLETADA`, deja
   la operación en `REQUIERE_REVISION` cuando el diario puede persistirlo y no
   aplica efectos desde un snapshot numéricamente inválido.

## F9/F10 — QA público y preflight (2026-09-21)

1. Ejecutar `npm run preflight:go-no-go -- --allow-dirty` durante desarrollo y
   el mismo comando sin flags desde el commit candidato limpio.
2. Verificar `/`, `/historia`, `/rosa-elena`, `/participar` y `/tienda` en
   desktop y móvil; revisar teclado, foco, menú, imágenes, filtros, carrito,
   loading, error/reintento y ausencia de scroll horizontal.
3. Abrir `/robots.txt`, `/sitemap.xml`, una ruta inexistente y `/api/health`.
4. Con `SITE_URL` ausente, esperar canonical/sitemap inactivos y aviso
   `HUMAN_DECISION_REQUIRED`; con origen HTTPS confirmado, esperar cinco URLs
   públicas y exclusión de `/admin` y `/api`.
5. Confirmar que el preflight TEST indica escrituras deshabilitadas y que no se
   ejecutó ningún deploy ni E2E remoto de escritura.

Resultado automatizado de referencia: tests, lint, build, audit, diff check y
secrets scan. La evidencia final de esta sesión se registra en
`docs/GO_NO_GO_FASE_9_10.md` y `docs/CHANGELOG.md`.

## 1. Pruebas actuales (estado vigente)

### T1 — Catálogo carga desde Google Sheets
1. Abrir `/tienda`.
2. Esperar la carga.
- ✅ Esperado: se listan productos con nombre y precio tomados del CSV de Sheets.
- ⚠️ Si el CSV cambia de formato, el catálogo puede quedar vacío (parser frágil).

### T2 — Carrito
1. En `/tienda`, agregar varios productos.
2. Aumentar/reducir cantidades y vaciar.
- ✅ Esperado: el total y el contador se actualizan; el carrito persiste al recargar
  (guardado en `localStorage`).

### T3 — Buscador
1. Escribir parte de un nombre en el buscador.
- ✅ Esperado: se filtran los productos coincidentes; mensaje si no hay resultados.

### T4 — Envío de pedido por WhatsApp
1. Con productos en el carrito, ingresar nombre y teléfono.
2. Pulsar "Enviar pedido por WhatsApp".
- ✅ Esperado: se abre `wa.me` con el mensaje pre-armado (lista, total, datos).
- ⚠️ Limitación conocida: el pedido se guarda solo en `localStorage` del dispositivo.

### T5 — Panel admin (estado actual)
1. Abrir `/admin`, ingresar contraseña.
2. Ver, filtrar, editar y cambiar estado de pedidos.
- ✅ Esperado: funciona sobre los pedidos del **mismo navegador**.
- 🔴 Limitación: NO muestra pedidos hechos por clientes en otros dispositivos.

---

## 2. Pruebas futuras — FASE 1 (pedidos reales)

> A ejecutar cuando exista la Google Sheet operativa + Apps Script.

### T6 — Pedido se guarda en Google Sheets
1. Hacer un pedido desde la tienda.
- ✅ Esperado: aparece una fila nueva en la hoja `PEDIDOS` (y líneas en
  `DETALLE_PEDIDOS`) de la Sheet operativa.

### T7 — Pedido desde celular visible en admin (multidispositivo)
1. Hacer un pedido **desde un celular**.
2. Abrir `/admin` desde **otro dispositivo** (PC).
- ✅ Esperado: el pedido del celular aparece en `/admin` del PC.

### T8 — Admin lee pedidos reales
1. Con varios pedidos en la Sheet, abrir `/admin`.
- ✅ Esperado: se listan todos los pedidos reales, no los de `localStorage`.

### T9 — Cambio de estado persiste en backend
1. En `/admin`, marcar un pedido como "listo" y luego "entregado".
2. Recargar / abrir desde otro dispositivo.
- ✅ Esperado: el estado actualizado persiste en la Sheet y se ve igual en cualquier
  dispositivo.

---

## 3. Pruebas futuras — Stock (FASE 3)

### T10 — Stock reservado al pedir
1. Crear un pedido de un producto con stock conocido.
- ✅ Esperado: se genera un movimiento `reserva` en `MOVIMIENTOS_STOCK`; el stock
  disponible disminuye sin registrarse como venta.

### T11 — Stock devuelto al cancelar
1. Cancelar un pedido previamente reservado.
- ✅ Esperado: se genera un movimiento `devolucion`; el stock vuelve a su valor
  anterior.

### T12 — Precio de venta y redondeo
1. Definir un producto con costo y margen.
- ✅ Esperado: `precio_venta = costo × (1 + margen)` redondeado **hacia arriba al
  múltiplo de $10** (ver `docs/DATA_MODEL.md`).

### T13 — Auditoría técnica del catálogo TEST
1. Confirmar el nombre exacto de la Sheet TEST antes de leer `PRODUCTOS`.
2. Auditar IDs, nombres, activo, categoría, prioridad, unidad, decimal/paso,
   costo, margen, precio, stock, mínimo e imagen.
3. Verificar que los hallazgos masivos se agrupen y no expongan configuración.
- ✅ Esperado: lectura sin escrituras, errores objetivos separados de advertencias
  y decisiones humanas, con estado por producto.

### T14 — Plan de cambios Fase 4
1. Preparar un JSON con destino TEST y pares `esperado`/`propuesto`.
2. Ejecutar `npm run catalogo:test:validar-plan -- <archivo>` con entorno TEST.
- ✅ Esperado: no usa red; rechaza producción, campos inesperados, cambios sin
  valor esperado y edición directa de `stock_actual`.

---

## Notas

- T1–T14 son pruebas manuales históricas; la suite automatizada vigente se
  ejecuta con `npm test` y se amplía con cada cambio técnico.
- Antes de cada apertura real conviene ejecutar T1–T9 como checklist mínima.

---

## 4. Pruebas manuales — Sistema documental

### TD1 — Metadata completa
1. Abrir el Markdown fuente.
2. Verificar `DOCUMENTO`, `VERSION`, `FECHA`, `ESTADO`, `FUENTE` y `TIPO_INFORME`.
- ✅ Esperado: todos los campos existen y usan valores permitidos por ADS-002.

### TD2 — Integridad del HTML
1. Generar el HTML desde el template correspondiente.
2. Buscar marcadores `{{...}}`.
3. Abrir el HTML desde `reports/html/<tipo>/`.
- ✅ Esperado: no quedan placeholders y cargan `almacen.css`, `reports.css` y logo.

### TD3 — Comparación visual
1. Comparar portada, ficha, tarjetas, fases, badges, tablas y síntesis con los
   pilotos v0.2 aprobados.
- ✅ Esperado: mantiene identidad y estructura documental; no parece landing page.

### TD4 — Impresión A4
1. Abrir vista previa de impresión con fondos activados, escala 100 % y sin
   encabezados/pies del navegador.
2. Revisar saltos, tablas largas, fases y síntesis.
- ✅ Esperado: contenido legible, sin cortes críticos ni desbordamiento horizontal.

### TD5 — Ausencia de secretos
1. Buscar tokens, credenciales, valores de variables e IDs privados.
- ✅ Esperado: solo aparecen nombres de variables; ningún valor sensible.

### TD6 — Densidad compacta y roadmap completo
1. Comparar HTML/PDF v0.2.1 con la versión v0.2 a tamaño real A4.
2. Verificar base de impresión de 7–7,2 pt y jerarquía legible.
3. Confirmar checklist Fases 0, 1, 1B, 2, 3, 4, 5 y 6.
4. Revisar que cada fase indique realizada, prioridad actual o pendiente.
- ✅ Esperado: documento más compacto, sin desbordes y útil para seguimiento del
  roadmap completo.
