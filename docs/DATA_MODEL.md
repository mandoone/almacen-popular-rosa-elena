# DATA_MODEL.md — Modelo de datos

## Resolución de revisiones V1 — D52 (2026-10-07)

OPERACIONES_PEDIDOS añade seis campos al final: revision_resuelta (SI/vacío), revision_tipo (dos clasificaciones reconocidas), revision_evidencia_hash (SHA256), revision_detalle (JSON ACREDITACION_CREACION_V1_1), revision_resuelta_por, revision_resuelta_en. Estado/paso/errores/snapshot/resultado originales inmutables. Acreditación válida y única libera recursos conservando REQUIERE_REVISION; evidencia corrupta/desconocida no libera. SHA verifica integridad, no firma. movimiento_id no vacío es identidad canónica única; id_movimiento conserva alias histórico aun si se repite. Nuevo movimiento V2 requiere canónico. [Acta](operativa/REMEDIACION_PRE_C5_2026-10-07.md).


> Estructura de datos del proyecto: estado actual y diseño objetivo de la Google
> Sheet operativa. Documento dueño de todo lo relativo a datos; otros `.md`
> referencian aquí.

---

## 0. Contrato operativo vigente TEST (2026-10-01)

### Esquema durable C5 — diseño local, no migrado (2026-10-07, D51)

`src/lib/familias/esquemaDurableV2.ts` y `scripts/lib/familias-c5.mjs` preparan contrato y migrador con almacenamiento inyectado, sin cliente Google ni acción HTTP. El preflight real detuvo la integración; **estas columnas NO existen todavía en TEST**. [Auditoría y estado parcial](operativa/FAMILIAS_PRODUCTO_FASE_C5_TEST_REAL_2026-10-07.md).

| Hoja | Campos al final / estrategia | Motivo |
|---|---|---|
| PRODUCTOS | revision_stock_v2, evidencia_stock_v2 | CAS y autoría del saldo; ambos necesarios para reproducir C4. Históricos vacíos. |
| PEDIDOS | operacion_asignacion_vigente, evidencia_estado_v2, evidencia_puntero_v2 | Vigencia append-only y autoría diferenciada de estado/puntero. Históricos vacíos. |
| DETALLE_PEDIDOS | id_detalle_pedido, modelo_linea, familia_id, cantidad_solicitada, unidad_solicitada, presentacion_publica_snapshot, version_oferta_snapshot, oferta_snapshot_json | Contrato C1. IDs solo para nuevas líneas; 27 históricos intactos, modelo vacío significa V1. |
| ASIGNACIONES_PEDIDO | Las 13 columnas C1 documentadas abajo | Nueva hoja vacía. Hashes/vigencia se prueban contra plan/diario/puntero; no duplicarlos en cada fila. |
| OPERACIONES_PEDIDOS | 14 columnas actuales, sin agregados | Tipos CONFIRMAR_V2/CANCELAR_V2/REASIGNAR_V2; plan PEDIDO_MIXTO_V2_1 en snapshot_json. |
| MOVIMIENTOS_STOCK | 20 columnas actuales, sin agregados | Campos C4 directos en columnas existentes; observacion guarda contrato MOVIMIENTO_PEDIDO_V2_1 con id_detalle_pedido, asignacion_ids, unidad_stock_snapshot, gramos_unidad_stock_snapshot y escala_stock_snapshot. |

Recibo JSON: operacion_id, payload_hash, plan_hash y efecto_id. Debe escribirse junto al saldo o estado correspondiente, con readback; no inferir autoría por saldo coincidente. Apertura: el puerto futuro derivará contexto_apertura_snapshot.apertura_id del **apertura_id ya congelado en PEDIDOS**. Habilitaciones actuales de esa apertura se congelan en el plan de confirmación. No agregar otro contexto JSON redundante en PEDIDOS.

Plan local desde el esquema actual: PRODUCTOS25→27, PEDIDOS15→18, DETALLE_PEDIDOS11→19, ASIGNACIONES_PEDIDO13 nueva. Trece headers al final de hojas existentes y trece en la hoja nueva; ampliación física de PRODUCTOS26→27 columnas. Ni costo, stock, precio ni contenido histórico se rellenan. Migrador en mocks exige destino exacto, IDs/headers únicos, ausencia de bloqueos, backup nativo legible con valores/fórmulas/celdas/estructura, relectura sin concurrencia, readback histórico y segunda ejecución0.

El puerto GAS aún debe acreditar CAS lógico bajo LockService con setValues/flush/readback, conservación de tipos/fórmulas, serialización exacta, límite de celda snapshot_json y bloqueo compartido con escritores V1. Una escritura parcial de saldo/recibo exige REQUIERE_REVISION; no existe promesa ACID. La propuesta de movimiento todavía es un mapa de persistencia, no un serializador remoto implementado.

### Adaptador durable C4 — exclusivamente local (2026-10-07, D49)

`adaptadorDurableV2.ts` orquesta un plan mixto completo mediante un puerto de almacenamiento; `planMixtoV2.ts` reutiliza C2 y conserva cantidades nativas históricas V1. `almacenSheetsMemoriaV2.ts` simula filas, lock y CAS. No existe puerto Google ni integración con rutas/GAS. [Orden, pruebas y límites](operativa/FAMILIAS_PRODUCTO_FASE_C4_DURABLE_LOCAL_2026-10-07.md).

OPERACIONES_PEDIDOS conserva contrato de columnas; tipos locales CONFIRMAR_V2/CANCELAR_V2/REASIGNAR_V2 y snapshot_json versionado PEDIDO_MIXTO_V2_1 guardan plan/hash, reservas V1, asignaciones familiares y efectos deterministas. Paso/resultado_json permiten reconciliar/replay. Asignaciones append-only se seleccionan por operacion_asignacion_vigente; cancelado mantiene referencia histórica. Reasignación escribe saldos netos por SKU y registra reversión/aplicación, sin modificar filas anteriores.

Campos lógicos adicionales **solo del mock**, no columnas migradas: PRODUCTOS revision_stock_v2/evidencia_stock_v2; PEDIDOS contexto_apertura_snapshot/evidencia_estado_v2/evidencia_puntero_v2; movimientos referencia_id/payload_hash/id_detalle_pedido/asignacion_ids. Recibos enlazan operación/payload_hash/plan_hash/efecto_id. Futuro puerto debe definir serialización y acreditar escritura conjunta saldo/recibo. Stock coincidente sin recibo nunca reconoce autoría. PREPARADA/APLICANDO/REQUIERE_REVISION bloquean pedido/SKU; diario desconocido/corrupto bloquea globalmente. Movimientos V2 pendientes son intenciones, no efectos completos para reportes.

Mixed V1/V2 valida stock acumulado del plan completo y no crea familias artificiales para V1. Política vigente **PERMITIR_SNAPSHOT (D50)**: permite cumplir pedidos recibidos contra su oferta congelada; no acepta nuevos pedidos de familia inactiva. La desactivación no cancela. Apertura del pedido conserva ID; POR_APERTURA exige habilitación actual siguiendo C2. Cancelación utiliza cantidades/bases históricas. Un cambio concurrente después de PREPARADA conserva el guardrail técnico de readback/revisión, sin cancelar ni rehacer efectos silenciosamente. D40, operaciones V1, Sheets y backend TEST v20 permanecen intactos.

### Motor de asignación C2 — exclusivamente local (2026-10-07, D48)

`src/lib/familias/asignacionV2.ts`: operación aporta reparto por detalle; familia nunca tiene saldo. Confirma recibido→pendiente mediante SKU elegibles equivalentes y solicitud exacta. Cantidades/stock se operan como enteros (unidades, milésimas o gramos), sin NaN/desborde. SKU compartidos por líneas se validan sobre saldo acumulado. No se elige marca automáticamente.

Plan durable local PREPARADA→APLICANDO→COMPLETADA o REQUIERE_REVISION congela pedido/estados, líneas, oferta, asignaciones, apertura, stocks anteriores/resultantes, escala física, IDs de movimientos y actor. SHA-256 de input real y snapshot inmutable; mismo reparto/key retorna plan original, diferente reparto409. Reconciliación exige movimiento estable y saldo correspondiente; stock escrito sin movimiento, cursor sin evidencia o cambio concurrente bloquean progreso. El paso local es atómico en memoria: NO constituye adaptador Sheets ni transacción remota. Adaptador futuro requiere lock, diario persistido previo a efectos, bloqueo por pedido/SKU con operación incompleta, readback y manejo de rollback/revisión. No está conectado/desplegado.

Cancelar recibido no mueve stock; cancelar pendiente/listo devuelve cantidades/base de asignaciones históricas aun si SKU ahora inactivo o asociado a otra familia. Base histórica cambiada o snapshot corrupto requiere revisión; entregado no cancela. Reasignación es plan explícito que revierte el reparto anterior y aplica uno nuevo validado, registra antes/después y conserva IDs/asignaciones anteriores; no editar asignaciones confirmadas.

Contrato futuro PEDIDOS agrega `operacion_asignacion_vigente`: permite seleccionar asignaciones vigentes por operacion_id sin borrar filas anteriores de ASIGNACIONES_PEDIDO. Cancelado conserva referencia histórica. Este puntero/hojas NO se migraron remotamente. Subtotal comercial granel se conserva por detalle; fragmentos solo convierten stock por bases 100/250/1000 g. D40 intacto.

### Pedido familiar C1 — contrato local paralelo (2026-10-07, D47)

`src/lib/familias/pedidoV2.ts` define columnas futuras aditivas de DETALLE_PEDIDOS: id_detalle_pedido, modelo_linea, familia_id, cantidad_solicitada, unidad_solicitada, presentacion_publica_snapshot, version_oferta_snapshot, oferta_snapshot_json. Vacío histórico en modelo_linea significa SKU_V1; valor desconocido se rechaza. V1 usa id_producto físico; V2 deja id_producto/cantidad nativa vacíos y guarda solicitud comercial. No rellenar familia en id_producto ni crear SKU virtual. IDs de detalle futuros son estables, emitidos por servidor; no se asignan a históricos en esta sesión.

Snapshot JSON adicional congela la oferta completa (contenido, marca, modo, referencia, precio/versiones) para evitar reinterpretarla si el maestro cambia. Nombre_producto, precio_unitario y subtotal continúan siendo snapshots comerciales autoritativos. Solicitud solo indica familia/cantidad/unidad/versión; no acepta precio del navegador. Granel g libres y precio por referencia D40; subtotal se redondea una vez por línea.

ASIGNACIONES_PEDIDO es únicamente un contrato futuro de 13 columnas: asignacion_id, id_detalle_pedido, producto_id, cantidad_asignada, cantidad_stock, unidad_stock_snapshot, gramos_unidad_stock_snapshot, nombre_sku_snapshot, marca_snapshot, presentacion_snapshot, operacion_id, actor, creado_en. Relación detalle→varias asignaciones→SKU; cantidad_asignada usa unidad solicitada y cantidad_stock base nativa. No se creó hoja real, no se extendió setup ejecutable/GAS ni se conectó carrito/API. Selección física y stock corresponden a C2 local.

### Administración familiar B3 (2026-10-07, D46)

FAMILIAS_PRODUCTO existe vacía en TEST tras B2. Backend administrativo separado del catálogo V1; exige APP_ENV TEST, ID/nombre exactos y token interno. Next exige sesión con `productos:gestionar`; página y APIs bloqueadas fuera de TEST. Creación v1, ID inmutable, edición con versión esperada; cualquier cambio de oferta incrementa versión y valida todos los SKU asociados antes de escribir. Asociación SKU valida familia única/existente, categoría, contenido, modo, marca y reglas; desasociación permite V1. No cambia stock/costo/precio físico.

AUDITORIA_PRODUCTOS agrega al final `entidad_tipo`, `entidad_id`, `payload_hash`, `resultado_json`. Filas históricas vacías conservan significado de producto; familia usa tipo FAMILIA, entidad_id FAM-* y producto_id vacío. `cambios_json` congela antes/después y estado PREPARADA/COMPLETADA; actor, referencia y timestamp existentes. Resultado persistido permite replay histórico; misma key/otro payload falla 409. Una interrupción pendiente bloquea la entidad para revisión; errores controlados compensan oferta/auditoría. Reportes de producto excluyen FAMILIA. La nueva UI administra oferta e identidad en secciones separadas; dry-run detecta problemas sin corregirlos. [Acta B3](operativa/FAMILIAS_B3_TEST_2026-10-07.md).

### Venta y peso (D40)

Conteo físico: captura en kg con tres decimales (1 g) y conversión a base nativa conservada. Ajustes/compras GRANEL rechazan fracciones de gramo. `ajustarStockAdmin` admite `stock_esperado`, validado bajo lock antes de escribir; replay de la misma key conserva el resultado anterior. Propuestas de abastecimiento conservan tres decimales. [Dry-run, acta y aplicación futura](operativa/CONTEO_CORTE_TEST.md); no se cargó stock contado.

PRODUCTOS agrega `modo_venta` UNIDAD/GRANEL (ausente/vacío = UNIDAD), `gramos_referencia` (entero positivo para GRANEL) y `gramos_unidad_stock` (100, 250 o 1000; kg exige 1000). `precio_venta` es CLP por referencia; `precio_costo` continúa por base nativa de stock, independiente de cambios de referencia comercial. `unidad_medida`, saldo y snapshots heredados se conservan. La base histórica queda congelada al establecer GRANEL; modificarla requiere migración específica.

Entrada pública/presencial: `cantidad` = gramos enteros positivos en GRANEL, cantidad nativa en UNIDAD. Apps Script determina el modo desde PRODUCTOS y calcula `precio_venta × gramos / gramos_referencia`, redondeando mitad hacia arriba al CLP entero con numerador seguro. Browser no decide precio, modo ni referencia. Saldos nuevos se calculan en milésimas enteras de la base histórica. No hay pasos obligatorios de 100/250/500 g.

DETALLE_PEDIDOS y DETALLE_VENTAS agregan `modo_venta`, `gramos_solicitados`, `gramos_referencia`, `gramos_unidad_stock` como snapshot. Para GRANEL, `cantidad` conserva gramos/base_stock y `precio_unitario` conserva precio de referencia; `subtotal` conserva el resultado redondeado. Los nuevos campos permanecen vacíos en históricos. Confirmación/cancelación usa cantidad nativa del detalle, evitando reinterpretar históricos. UI y WhatsApp muestran el peso snapshot y subtotal de autoridad. [Productos, migración y QA](operativa/GRANEL_TEST_2026-10-01.md).

[Cierre operativo TEST 2026-10-01](operativa/CIERRE_TEST_2026-10-01.md) registra migración y readback. PRODUCTOS usa id_producto, activo SI/NO y tipo_disponibilidad REGULAR/POR_APERTURA. Campo ausente/vacío = REGULAR; activo NO nunca se ofrece.

APERTURA_PRODUCTOS: apertura_id + producto_id (pareja única), habilitado SI/NO, actualizado_por y actualizado_en. Sin apertura: REGULAR activos. Con apertura: REGULAR activos + especiales habilitados. Duplicados rechazan el catálogo; valores inválidos no habilitan. Administrador gestiona oferta sin editar Sheet; no hay precio por apertura. Backend valida bajo lock en pedido/venta; snapshots y diario durable conservados.

TEST: 56 maestros (54 comerciales y 2 fixtures), 2 comerciales históricos inactivos y Empanadas POR_APERTURA sin habilitación real. Jerarquía: respuesta humana directa más reciente > documento Nadia > comanda/diseño > histórico > suposición. Comanda 03/10 acredita precio público; Diseño acredita costo/compras, nunca stock físico actual. Marca física distinta distingue SKU interno; la oferta pública futura puede agrupar SKU equivalentes mediante familia, sin fusionar inventario ni historia. Arroz y demás 18 granel tienen unidad resuelta, sin pendiente de presentación.

### Contrato paralelo de familias — Fase A, 2026-10-07 (D43)

Implementado exclusivamente en código/fixtures locales. No se creó FAMILIAS_PRODUCTO en ninguna Sheet, no se migraron productos ni se desplegó Apps Script. SKU_V1 continúa siendo el contrato operativo: catálogo, carrito, pedidos, confirmación, cancelación, ventas, compras y movimientos conservan producto_id. F10 no cambia de estado. [Entrega y QA](operativa/FAMILIAS_PRODUCTO_FASE_A_2026-10-07.md).

`src/lib/familiasProducto.ts` es la fuente única del dominio puro. Su bloque GAS se genera localmente con `node scripts/generar-contrato-familias-gs.mjs --write`; `--check` verifica igualdad sin escribir. No importa transportes ni accede a red/Sheets. El setup solo incorpora encabezados para una futura base nueva; no es un migrador de bases existentes y no se ejecutó.

#### FAMILIAS_PRODUCTO

Clave: `familia_id`, única, formato `FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}`. No se utiliza en columnas producto_id. La familia no admite stock_actual, precio_costo ni proveedor, aunque vengan vacíos.

| Campos | Contrato |
|---|---|
| `familia_id`, `activo` | ID obligatorio; activo SI/NO. |
| `nombre_publico`, `categoria` | Nombre obligatorio; mismas cuatro categorías actuales, sin categorías nuevas. Comparación de categoría ignora capitalización/tildes/espacios exteriores, no deduce identidad desde el nombre. |
| `precio_venta` | CLP entero seguro no negativo. Cero permite preparar el contrato pero impide anunciar disponibilidad vendible. No se deriva del costo ni se sincroniza con PRODUCTOS. |
| `modo_venta`, `unidad_venta` | UNIDAD/GRANEL. UNIDAD usa unidad/pack/kg/litro compatibles con el SKU; GRANEL recibe g. |
| `permite_decimal`, `paso_venta` | SI/NO y paso positivo. Envasado entero usa NO/1; granel usa NO/1 porque solicita gramos enteros libres, no pasos comerciales de 100/250/500 g. |
| `gramos_referencia` | Entero seguro positivo solo para GRANEL; vacío/ausente en UNIDAD. |
| `contenido_cantidad`, `contenido_unidad` | Contenido positivo y unidad normalizada g/ml/unidad para envasados. 1 L se declara como 1000 ml; no hay conversiones implícitas por nombre. Vacíos/ausentes en GRANEL. |
| `presentacion_publica` | Etiqueta legible obligatoria; no prueba equivalencia por sí sola. |
| `politica_marca`, `marca_publica` | VARIABLE/EXPLICITA/NO_APLICA. Marca pública obligatoria solamente en EXPLICITA; vacía en las otras políticas. |
| `imagen_url` | Opcional; no se asocian ni modifican fotos en esta fase. |
| `version_oferta` | Entero seguro positivo; reservado para contratos comerciales posteriores. |
| `actualizado_en` | Texto opcional de auditoría. El lector GAS convierte Date de celda a ISO sin escribirla. |

#### Relación física opcional en PRODUCTOS

Campos aditivos: `familia_id`, `marca`, `presentacion`, `contenido_cantidad`, `contenido_unidad`. SKU sin familia conserva validez V1 y no necesita ninguno de los nuevos campos. Cada fila puede referenciar como máximo una familia; IDs duplicados o familia inexistente fallan en la auditoría paralela. No se infiere marca ni se asigna familia automáticamente. Fase A no modificó DTOs de escritura ni validadores operativos; Fase B1 prepara esos contratos internos en código local, sin activar controles de UI ni desplegar backend.

Al vincular un SKU se exige categoría/modo compatibles y presentación física legible. VARIABLE permite diferentes marcas físicas documentadas; EXPLICITA exige la misma marca pública (comparación textual normalizada, sin equiparar marcas diferentes); NO_APLICA no exige marca física. En UNIDAD se exige contenido numérico/unidad idénticos, misma unidad de venta y reglas de cantidad compatibles. 750 ml y 1000 ml no son equivalentes. La asociación explícita aprobada sigue siendo necesaria incluso si los contenidos coinciden.

GRANEL conserva base nativa 100/250/1000 g, kg exige base 1000 y referencia legada positiva. La referencia legada de precio y el paso nativo pueden diferir entre SKU: no definen la cantidad comercial de familia. D40 permanece intacto; no se activan familias reales para los 18 graneles.

#### Lectura y agregación de diagnóstico

`agregarDisponibilidadFamilia` devuelve familia_id, precio familiar, cantidad agregada interna, unidad, disponible, IDs de SKU elegibles e inconsistencias. Solo aporta un SKU relacionado, equivalente, activo, con stock numérico no negativo válido y habilitado: REGULAR como hoy; POR_APERTURA exige apertura explícita válida y pertenencia a la lista de SKU habilitados de ese contexto. Sin apertura, una lista de habilitados sola no habilita especiales.

UNIDAD entera suma unidades; fracciones compatibles conservan precisión de milésimas. GRANEL convierte cada saldo nativo a gramos enteros antes de sumar: 4×250 + 2×1000 = 3000 g, nunca 6 unidades. Rechaza medio gramo, stock textual/no finito, bases inválidas y desbordes. Inactivos/especiales no habilitados aportan cero; cero saldo es válido. Duplicados físicos se excluyen para impedir inflar disponibilidad.

La cantidad diagnóstica puede mostrar el subtotal de SKU correctos ante una inconsistencia, pero `disponible` falla cerrado. Una auditoría global inválida también impide anunciar cualquier vista paralela como vendible. Familia inactiva agrega cero; precio cero no es vendible. Esta cifra no es stock persistido de familia ni reserva.

GAS incorpora helpers internos `leerFamiliasProductoFaseA_` y `leerVistaFamiliasFaseA_`, restringidos al destino TEST conocido. La hoja faltante se tolera como lista vacía; un SKU con familia_id que referencia una familia ausente falla en auditoría, mientras que un SKU sin familia_id sigue permitido como legado V1. El caller aporta contexto de apertura/habilitados. No se añade ninguna acción HTTP, no se abre un spreadsheet remoto desde estos helpers y ninguna acción V1 los invoca. Fuente operativa, precios V1, stocks, costos y snapshots históricos permanecen intactos.

### Identidad física y snapshots de compra — Fase B1 local, 2026-10-07 (D44)

El código versionado de administración admite los cinco campos opcionales de PRODUCTOS. No hay controles nuevos en UI; backend/Sheet TEST desplegados no se modificaron. No se vinculan productos reales a familias. [Entrega, archivos y QA](operativa/FAMILIAS_PRODUCTO_FASE_B1_2026-10-07.md).

`validarIdentidadSkuFisica` es el validador puro compartido TS/GAS: familia_id vacío o formato FAM de D43; marca texto hasta 120 caracteres; presentación física texto hasta 200; contenido_cantidad numérico finito positivo hasta el máximo seguro, o vacío; contenido_unidad g/ml/unidad o vacío. No convierte texto numérico, infiere marca ni exige completar el legado. Edición normaliza espacios y admite vaciar campos opcionales. La auditoría familiar de D43 sigue exigiendo marca para VARIABLE/EXPLICITA y equivalencia completa cuando se usa el modelo familiar; no se consulta una hoja de familias para registrar compras B1.

#### DETALLE_COMPRAS: columnas aditivas

| Campo | Fuente y significado |
|---|---|
| `familia_id_snapshot` | PRODUCTOS.familia_id vigente en la compra; no cambia producto_id físico. |
| `marca_snapshot` | Marca del SKU; no se escribe manualmente en la compra. |
| `presentacion_snapshot` | Presentación física del SKU, puede diferir de la etiqueta pública de familia. |
| `contenido_cantidad_snapshot` | Contenido numérico del SKU o vacío. |
| `contenido_unidad_snapshot` | g/ml/unidad del SKU o vacío. |
| `gramos_unidad_stock_snapshot` | Base nativa de stock solo en GRANEL; vacío en UNIDAD. Permite interpretar cantidad/costo históricos sin consultar el maestro futuro. |

El navegador sigue enviando producto_id/cantidad/costo_unitario por línea, más la cabecera de compra. DTO y normalización GAS descartan snapshots enviados por el cliente. La compra exige PROD-* y rechaza FAM-*; un SKU repetido sigue rechazado. Dentro del lock, después de comprobar replay/conflicto, el backend busca el SKU en PRODUCTOS, valida identidad opcional y congela los snapshots antes de cualquier escritura. Cantidad, stock, costo, movimiento y rollback conservan las reglas vigentes. Proveedor permanece en COMPRAS; costo_unitario en cada detalle, precio_costo vigente e HISTORIAL_COSTOS por SKU. No se lee/escribe costo ni precio de FAMILIAS_PRODUCTO.

Hash de compra: mismo input normalizado de cabecera/líneas V1; no incorpora snapshots derivados. Replay devuelve el detalle persistido original, incluso si después cambian nombre/marca/presentación/familia del maestro. Cambiar el input con la misma key produce conflicto. La reversión conserva el mecanismo existente: restaura stock/costo y elimina filas nuevas de COMPRAS, DETALLE_COMPRAS, MOVIMIENTOS_STOCK e HISTORIAL_COSTOS, incluidos snapshots sin efectos adicionales. Sigue siendo compensación en Sheets, no transacción ACID ni nueva garantía ante interrupción abrupta del proceso.

Compatibilidad de esquemas: las columnas nuevas son opcionales para lectura y compra de legado sin identidad; respuestas antiguas pueden omitirlas y futuras filas legadas las dejan vacías. GRANEL legado congela su base si existe la columna destino y sigue operando sin ella en esquema V1. Con cualquier identidad física documentada, se exige el destino completo de cinco snapshots (y base en GRANEL) antes de escribir, para impedir pérdida silenciosa. Columnas opcionales presentes deben ser únicas. Crear/editar identidad exige sus columnas destino; sin ellas se rechaza antes de mutar y no las crea. Setup futuro solo agrega encabezados locales; no es una migración ejecutada.

F10 conserva estados. La sesión B2 posterior alineó únicamente el esquema TEST: campos SKU y snapshots vacíos más FAMILIAS_PRODUCTO con cero registros; Apps Script TEST v19. No se modificó ninguna celda histórica ni valor comercial/stock/costo. Las restricciones de no migración/deploy de A/B1 describen esas entregas originales. [Backup/readback B2](operativa/FAMILIAS_B2_TEST_2026-10-07.md). Catálogo/pedido familiar y asignaciones siguen sin activar.

## 1. Estado actual

- **Fuente operativa:** la base de datos nueva `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`
  alimenta **tanto el catálogo como los pedidos**:
  - **Catálogo:** `src/app/api/productos/route.ts` obtiene los productos de la hoja
    PRODUCTOS (`activo = SI` y oferta de apertura) vía la acción `listarProductos` de la Web App de Apps
    Script; expone a la tienda `{ id, nombre, precio }` con `id = id_producto`
    (`PROD-001…`).
  - **Pedidos:** se crean/consultan vía la Web App (ver `docs/APPS_SCRIPT_PEDIDOS.md`),
    escribiendo en PEDIDOS, DETALLE_PEDIDOS, PRODUCTOS y MOVIMIENTOS_STOCK. La
    versión F9-A.2 usa además un diario `OPERACIONES_PEDIDOS` en TEST, ya
    preparado; validación de cinco estados alineada y F9-A validada en TEST.
- **Planilla antigua (retirada):** la Google Sheet publicada como CSV (hoja "WEB") se
  usó **solo como fuente de datos inicial** y **ya no alimenta** el catálogo ni la
  operación. La hoja PRODUCTOS de la base nueva se **cargó manualmente** con **53
  productos reales** y su `precio_venta`; CONFIG quedó con datos temporales de prueba
  (ver decisión D5 en `docs/DECISIONS.md`).
- El script `scripts/import-products-from-old-sheet.gs` (ver `docs/IMPORT_PRODUCTS.md`)
  queda como **herramienta auxiliar** reutilizable, pero **no fue necesario ejecutarlo**
  para esta primera carga.

---

## 2. Decisión: Google Sheet nueva, exclusiva para la web

La **base de datos operativa** del sistema web será una **Google Sheet nueva y
exclusiva**, creada para este proyecto. (Ver `docs/DECISIONS.md`.)

**No** se usará la planilla antigua de comandas como base principal, porque:

- pertenece a otra cuenta;
- tiene permisos externos;
- contiene formato histórico/manual;
- no está diseñada como backend operativo.

Esta nueva planilla queda documentada como **fuente oficial futura** para:
productos, pedidos, ventas, clientes, stock, compras, movimientos de stock y
configuración.

> La base ya existe; su continuidad TEST y los gates del corte viven en `PROJECT_STATE.md`.

---

## 3. Hojas previstas en la Google Sheet operativa

Diseño objetivo (se refinará al implementar cada fase). Las columnas marcadas con
`*` son claves/identificadores.

### CONFIG
Parámetros globales del sistema (clave/valor).
| campo | descripción |
|-------|-------------|
| `clave`* | nombre del parámetro (p. ej. `margen_default`, `whatsapp`, `direccion`, `fechas_apertura`). |
| `valor` | valor del parámetro. |
| `nota` | comentario opcional. |

### PRODUCTOS
| campo | descripción |
|-------|-------------|
| `id`* | identificador del producto. |
| `nombre` | nombre visible. |
| `costo` | costo de compra. |
| `margen` | margen aplicado (si difiere del default de CONFIG). |
| `precio_venta` | precio vigente explícito (ver §4). |
| `stock` | existencias actuales. |
| `activo` | SI/NO; NO siempre oculta y rechaza compras nuevas. |
| `tipo_disponibilidad` | REGULAR/POR_APERTURA; ausente = REGULAR. |
| `imagen` | slug/archivo de imagen (opcional). |

### CLIENTES
| campo | descripción |
|-------|-------------|
| `id`* | identificador del cliente. |
| `nombre` | nombre. |
| `telefono` | teléfono (WhatsApp). |
| `creado` | fecha de alta. |

### PEDIDOS
| campo | descripción |
|-------|-------------|
| `id`* | identificador del pedido. |
| `fecha` | fecha/hora de creación. |
| `cliente_id` | referencia a CLIENTES (o nombre/teléfono inline). |
| `nombre` | nombre del cliente. |
| `telefono` | teléfono del cliente. |
| `total` | total del pedido. |
| `estado` | `recibido` · `pendiente` · `listo` · `entregado` · `cancelado`. |

En TEST, `PEDIDOS.estado_pedido` tiene una validación estricta para esos
cinco valores desde la fila 2 hasta el final de la columna operativa. La regla
heredada de cuatro estados fue migrada en F9-A. La validación de
transiciones permanece en el backend; el dropdown solo restringe valores.

### DETALLE_PEDIDOS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la línea. |
| `pedido_id` | referencia a PEDIDOS. |
| `producto_id` | referencia a PRODUCTOS. |
| `nombre` | nombre del producto (snapshot). |
| `cantidad` | cantidad pedida. |
| `precio` | precio unitario (snapshot). |
| `subtotal` | `cantidad × precio`. |

### VENTAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la venta. |
| `fecha` | fecha/hora. |
| `pedido_id` | pedido asociado (si aplica). |
| `total` | total vendido. |
| `vendedor` | quién registró la venta. |

### DETALLE_VENTAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la línea. |
| `venta_id` | referencia a VENTAS. |
| `producto_id` | referencia a PRODUCTOS. |
| `cantidad` | cantidad vendida. |
| `precio` | precio unitario. |
| `subtotal` | `cantidad × precio`. |

### COMPRAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la compra. |
| `fecha` | fecha. |
| `proveedor` | proveedor. |
| `total` | total de la compra. |

### DETALLE_COMPRAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la línea. |
| `compra_id` | referencia a COMPRAS. |
| `producto_id` | referencia a PRODUCTOS. |
| `cantidad` | cantidad comprada. |
| `costo` | costo unitario. |
| `subtotal` | `cantidad × costo`. |

### MOVIMIENTOS_STOCK
| campo | descripción |
|-------|-------------|
| `id`* | identificador del movimiento. |
| `fecha` | fecha/hora. |
| `producto_id` | referencia a PRODUCTOS. |
| `tipo` | `entrada` · `salida` · `reserva` · `devolucion` · `ajuste`. |
| `cantidad` | cantidad (positiva/negativa según tipo). |
| `origen` | referencia (pedido, venta, compra, ajuste manual). |
| `stock_anterior` | saldo observado antes del movimiento. |
| `stock_resultante` | saldo esperado después del movimiento. |
| `usuario` | actor validado que originó la acción. |
| `operacion_id` | vínculo aditivo al diario durable de confirmación/cancelación. |

### OPERACIONES_PEDIDOS (preparada en TEST)

Diario de intención y verificación para creación/confirmación/cancelación. No reemplaza
`MOVIMIENTOS_STOCK` ni constituye una transacción ACID.

| campo | descripción |
|-------|-------------|
| `operacion_id`* | identificador UUID con prefijo legible de la operación. |
| `idempotency_key`* | clave del intento; no puede reutilizarse con otro payload. |
| `tipo_operacion` | `CREAR_PEDIDO`, `CONFIRMAR` o `CANCELAR`. |
| `id_pedido` | pedido afectado. |
| `actor` | identidad obtenida de la sesión validada. |
| `estado_operacion` | `PREPARADA`, `APLICANDO`, `COMPLETADA` o `REQUIERE_REVISION`. |
| `paso` | último punto durable alcanzado. |
| `payload_hash` | hash canónico para detectar conflictos de idempotencia. |
| `snapshot_json` | plan mínimo: estados y saldos antes/después esperados. |
| `resultado_json` | respuesta estable de una operación completada. |
| `error_codigo` / `error_detalle` | diagnóstico acotado, sin secretos. |
| `creado_en` / `actualizado_en` | marcas temporales de auditoría. |

---

## 4. Reglas de negocio

### Precio de venta
- Precio vigente explícito en PRODUCTOS; comanda 03/10 es referencia pública, subordinada a respuesta humana directa/documento Nadia cuando corresponda.
- Costo + margen (10% de referencia) y redondeo son herramientas de propuesta; nunca reemplazan automáticamente el precio aprobado.
- DETALLE_PEDIDOS/DETALLE_VENTAS conserva snapshot. Solo coincidencia inequívoca autoriza cambios TEST; dudas de SKU/unidad permanecen PENDING.

### Stock
- El stock se descuenta/registra mediante **MOVIMIENTOS_STOCK** (auditoría
  del inventario); `PRODUCTOS.stock_actual` refleja el saldo y el diario verifica operaciones.
- **Pedido recibido:** crear no modifica stock ni genera movimiento.
- **Confirmación:** `recibido → pendiente` descuenta stock y registra una salida
  verificable ligada a `operacion_id`.
- **Devolución:** cancelar desde `pendiente`/`listo` repone una vez; cancelar desde
  `recibido` no mueve stock.
- **Entrega:** cambia estado sin otro movimiento: la salida ya quedó registrada al confirmar.
- **Entrada:** las compras generan movimientos `entrada`.

> Estas reglas ya están implementadas y verificadas en TEST; stock físico permanece gate humano.

---

## 5. Notas de implementación

- Mecanismo de escritura: **Google Apps Script** (Web App `doPost`/`doGet`) que
  recibe los datos y los anexa a las hojas correspondientes. Ver `docs/DECISIONS.md`.
  Implementado en `scripts/apps-script-pedidos.gs` (guía en `docs/APPS_SCRIPT_PEDIDOS.md`):
  crea pedidos (PEDIDOS + DETALLE_PEDIDOS) sin tocar stock; al confirmar/cancelar,
  prepara `OPERACIONES_PEDIDOS`, aplica PRODUCTOS/MOVIMIENTOS_STOCK/PEDIDOS y
  verifica el resultado por readback. El backend lee las hojas **por nombre de
  encabezado**, robusto ante reordenamientos de columnas. El diario está en
  TEST; la validación de estados de Sheet y retest F9-A ya pasaron.
- Los identificadores y relaciones (`*_id`) se mantienen simples (texto/numérico)
  por tratarse de una hoja de cálculo, no una base relacional.
- Snapshots de `nombre`/`precio` en los detalles para preservar el histórico aunque
  cambie el producto.
