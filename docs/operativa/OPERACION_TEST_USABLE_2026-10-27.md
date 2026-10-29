# Sprint Operación TEST usable

## Cierre técnico verificado —28/10/2026

**COMPLETO en TEST por HTTP real; revisión personal de Omar y activación segura de su cuenta pendientes.** Los apartados siguientes conservan la cronología del sprint y de sus interrupciones. No reiniciar los fixtures ni reabrir el turno cerrado.

| Componente | Resultado final |
|---|---|
| Alta unidad/granel | COMPLETO. Se reutilizó la unidad existente; nueva alta granel base250 acreditada. Regresión integral100/250/1000. |
| Inventario parcial / autoría | COMPLETO. Conteo5 unidades/1700g, referencias, actor, hash y readback; no inferencia por saldo solamente. Lectura admite observaciones legacy y observacion moderna. |
| Compras / reposición | COMPLETO. Compra2800 y reposición1300, proveedores distintos/mismo SKU, snapshots físicos y tres líneas de historial de costos. Revisión/activación antes de comprar, conservando el rechazo backend del SKU inactivo. |
| Apertura / web / POS | COMPLETO. Apertura QA propia APE-20261028; pedido1203 durante anticipados, luego transición explícita a presencial y venta2203. |
| Confirmar / pagar / cancelar | COMPLETO. Stock conjunto6/10,2→5/9,6→6/10,2 bases; replay sin doble descuento/devolución. Subtotal150g a1350/kg conserva203. |
| Gasto / caja / cierre | COMPLETO. Gasto200 explícitamente asociado, inicial500, efectivo esperado/contado2503, diferencia0. Cierre CONFIRMADA y replay; mutación financiera incompatible posterior bloqueada409. |
| Historiales / reportes | COMPLETO. Readback final de13 movimientos únicos,3 costos,2 compras,1 venta,1 pedido cancelado,1 gasto y1 cierre; resumen de venta vigente2203. |
| Cleanup / integridad | COMPLETO. Dos SKU QA inactivos/stock0; apertura cerrada y habilitaciones NO. Historia conservada.54 SKU comerciales y todas las filas/celdas preexistentes ajenas al fixture autorizado idénticas al backup. |
| Roles / logout | COMPLETO en ensayo: tres roles sintéticos efímeros locales y backend TEST real; permisos y logout401. No se creó ni activó cuenta humana. |
| Visual | COMPLETO focal con mocks sin red remota: desktop1280×900 y móvil390×844. Alta granel, inventario recuperado, compras, g/kg/POS y arqueo/historial. No se afirma E2E remoto completo por navegador. |
| Acceso Omar | PENDIENTE del procedimiento privado de activación y de su primer login/turno personal. No equivale a F10 READY. |

### Ejecución y evidencia

`scripts/e2e-turno-web-test.mjs` llama los handlers Next reales y Apps Script TESTv26, conservando `operativa.local/e2e-turno-web-20261028.json`, IDs y keys. La continuación no volvió a crear la unidad. El modo `--solo-readback` verifica reportes mediante GET; únicamente login/logout modifican la sesión local. Credenciales de los tres actores QA aleatorias, efímeras y solo en memoria, nunca guardadas en Git ni transferidas a una cuenta humana.

Pedido `PED-20261028-232814-480a46fa`, venta `VEN-20261028-233028-3bcaccdb`, cierre `CIE-85224594e1932a6b67d229b16cc0c928`. El cierre registra actor `qa-sprint-operacion`, esperado/contado2503 y diferencia0. Los dos SKU propios terminan en stock0/NO: `PROD-TEST-WEB-90cbfde8cd54c0e13353e156570719e5` y `PROD-TEST-WEB-b514621449e6a99f482571352e56bc78`. Sus costos/precios sintéticos quedan en historia; no se borran ni se toman como valores comerciales.

Comparación nativa de20 hojas contra backup incremental, incluyendo valores, fórmulas, formatos, validaciones y notas: PASS; única fila previa autorizada a cambiar, la unidad QA existente. Filas nuevas respecto de ese respaldo: PRODUCTOS1, AUDITORIA_PRODUCTOS5, APERTURAS1, APERTURA_PRODUCTOS2, COMPRAS2, DETALLE_COMPRAS3, HISTORIAL_COSTOS3, PEDIDOS1, DETALLE_PEDIDOS2, VENTAS1, DETALLE_VENTAS2, MOVIMIENTOS_STOCK13, GASTOS_EXTRA1, OPERACIONES_PEDIDOS3 y CIERRES_CAJA1. Tres operaciones nuevas COMPLETADA; cero bloqueos QA nuevos. Se conservan las dos REQUIERE_REVISION legacy ya acreditadas en30e047e; no se borraron para obtener PASS.

### QA final ejecutado

- **1286 PASS,0 FAIL,0 skipped**: seis pruebas nuevas sobre baseline1280 (cinco de traza integral de alta granel y una de compra inactiva/activación). Evidencia moderna de movimiento incorporada a una prueba existente.
- Lint, typecheck, build aislado, scan de secretos y `git diff --check`: PASS. Diferencial V1:244 declaraciones GAS, siete guards/adiciones exactas y doce archivos críticos; D40 intacto.
- E2E HTTP completo y lectura final de reportes: PASS. Autoría por referencias/actor/hash, replay de compra/confirmación/cancelación/cierre, cierre durable y cleanup acreditados.
- Visual con `scripts/qa-visual-turno.mjs --local-mocks`: red externa bloqueada. Capturas ignoradas en `operativa.local/visual-turno/`. Caja visual usa2703 porque ese mock no incluye el gasto200; no se confunde con cierre TEST real2503. Compras, caja y POS sin overflow móvil (ancho375/scrollWidth375 dentro de viewport390). Datos exclusivamente sintéticos.

Logs privados ignorados: `sprint-suite-final.log`, `sprint-build-final.log`, `sprint-e2e-web-continuacion-6.log`, `sprint-e2e-readback-reportes.log`, `recuperacion-preflight-v26.log`. No contienen credenciales impresas ni se versionan backups de fuente con secretos.

### Entrega, rollback y límites

Apps Script **v26**, sin nuevo deploy durante esta continuación; v25 recuperable con fuente/manifest respaldados privadamente. Backup original19 hojas y backup incremental20 hojas enlazados más abajo, ambos conservados. Rollback no consiste en restaurar toda la Sheet sobre operaciones nuevas: preservar historia y compensar solo efectos QA acreditados; nunca borrar el cierre confirmado.

Preview de la rama: [abrir TEST](https://almacen-popular-rosa-ele-git-99da69-omarquezadac-9434s-projects.vercel.app). Acceso por `/admin/login`, sujeto a protección Vercel y cuenta individual autorizada. Su validación de despliegue final se registra en el checkpoint de entrega. [Guía del primer turno de Omar](GUIA_OMAR_TURNO_COMPLETO_TEST_2026-10-27.md).

**Verificación de publicación:** `fb400b1a65b19327832af18d11c66ca15a5f6053` pusheado solo a feature, Preview `dpl_FVeypme3ff1YWgiLQnTebceEncHv` READY, target no productivo y alias de rama confirmado. Production conserva `dpl_28Bi5v6raTU4eJhsqNofMrXy7UUu`/main `f203e0c`. Gate de acceso: el conector devuelve403 al leer protección y el navegador llega al login SSO de Vercel; no hay CLI/credencial local disponible para alternativa. No se alteraron protecciones. Por ello la disponibilidad del build está acreditada, pero **la navegación funcional en Preview queda pendiente del acceso Vercel autorizado de Omar**. El E2E remoto acreditado usa Next local con TESTv26 real; no se lo presenta como E2E del Preview. El checkpoint posterior de documentación no cambia código de aplicación.

CI posterior de21e26a8 detectó otra brecha de infraestructura: checkout superficial no incluía los hitos9200139/716e8c8/30e047e/48eb4ec/8b1d105, por lo que cinco auditorías basadas en `git show` fallaban antes de comparar. Se configura `actions/checkout` con `fetch-depth: 0`, preservando todas las pruebas y sus referencias originales. No es una regresión funcional ni una omisión aceptada; el resultado del siguiente run se verifica antes de la entrega final.

Checkpoints previos de este sprint:3af0d6d (implementación local),0a94679 (arreglo alta y traza). El checkpoint final incorpora arneses/evidencia y guía sin secretos. El maestro del usuario se conserva sin editar como untracked preexistente; árbol versionado limpio no implica borrarlo.

Pendientes humanos: acceso individual/primer turno de Omar, respuestas Nadia, fotos Carolina, seis costos acreditados, conteo y saldos reales/corte, capacitación tras la prueba de Omar. F10 no cambia automáticamente. Producción/main/datos comerciales intactos; no familias comerciales, catálogo/carrito/POS familiar ni promociones productivas.

Nombre solicitado27/10; ejecución real iniciada28/10/2026. Base `9200139c365483ab3fb18b85219f2c36dd9e8e64`, rama exclusiva `feature/fase-3a-operativa`. Archivo maestro del usuario preservado sin editar y respaldado en operativa.local, SHA256 `7041ec5089fa5e1cb14e8ec1f097c76ae01ddf7c82c8a8b9a3da6d9d833938d5`. Local/remoto coinciden; único untracked previo es ese maestro. No se reabre C5/C6/C7 ni D63/D64.

## Auditoría inicial

| Función | Clasificación inicial | Brecha / trabajo |
|---|---|---|
| Login, roles, revocación | FUNCIONA_YA | Reutilizar sesión/DTO; acceso individual Omar requiere preparación privada. |
| Alta física | UX_MEJORABLE | ID manual y formulario mínimo; backend lock/unicidad/stock0 ya existe. |
| Conteo parcial | BACKEND_SIN_UI | Ajuste CAS/idempotencia/movimientos existente; falta sesión web. |
| Compra | UX_MEJORABLE | Buscar líneas, g/kg/costo kg, actor automático y readback. |
| Stock/movimientos | FUNCIONA_YA | No editar saldo directamente; exponer lectura por key para reconciliar. |
| Aperturas y ofertas especiales | FUNCIONA_YA | Calendario existente; fixture futuro sintético con ID de contrato APE-AAAAMMDD, no inventar enum/ID inválido. |
| POS / pedidos V1 / confirmar / pagar / cancelar | FUNCIONA_YA | Actor manual redundante; verificar ciclo con fixtures sin tocar comerciales. |
| Reposición | FUNCIONA_YA | Compra y propuesta existentes; no inventar mínimos/costos. |
| Gastos | UX_MEJORABLE | Actor ya autoritativo en backend; relación a apertura/medio no existe en contrato actual. |
| Resumen caja por apertura | FUNCIONA_YA | No es arqueo ni cierre financiero. |
| Arqueo/cierre durable | FALTA | Nuevo contrato aditivo necesario; nunca reutilizar cierre calendario como cierre contable. |
| Historiales/reportes | FUNCIONA_YA | Mantener snapshots; incluir cierre si se despliega contrato nuevo. |
| Entrada granel | UX_MEJORABLE | Input directo g/kg, ±100g, atajos/subtotal; mantener D40 y bases. |
| Configuración inicial | FALTA | Diagnóstico y pendientes humanos sin promover F10. |
| Familias públicas/POS familiar | NO_NECESARIO_LANZAMIENTO | No activar ni migrar comerciales. |
| Conteo real, saldos/costos faltantes | NO_NECESARIO_LANZAMIENTO técnico | Gates humanos para datos reales; ensayo solo sintético, no F10 READY. |

## Entorno y estado

Drive confirma ID/nombre TEST exactos. Apps Script preflight/clasp dry-run read-only PASS (sin push/deploy). Preview existente READY corresponde a la rama y SHA inicial, `almacen-popular-rosa-elena-7m17-psxwlnq67.vercel.app`; aún falta validación del sprint final. El primer GET Node falló y un intento clasp fue interrumpido por un aviso npm; el segundo dry-run con avisos suprimidos verificó destino y configuración sin relajar guardrails.

Estado de sprint: EN_CURSO. No se realizaron escrituras de datos TEST durante la auditoría. Es necesario backup completo verificado y readback antes de fixtures/migración/deploy.

## Primer bloque local

Inventario parcial reutiliza ajuste con stock_esperado, lock e idempotencia. Plan revisado/congelado por SKU con referencias conservadas en sessionStorage de la pestaña por actor; recuperación consulta evidencia durable, no infiere autoría por saldo. No pasa SKU omitidos a cero. Una aplicación múltiple no es ACID: puede concluir una línea y detener otra; se conserva plan y referencias para reconciliar.

Alta genera ID en servidor por actor/key, backend valida unicidad bajo lock; reintento mismo ID. Nuevo flujo nace inactivo/stock0 y sin familia. Campos físicos no se inventan, costos vacíos siguen pendientes. Mínimo0/prioridad media son defaults técnicos existentes, no aprobación operativa.

Granel comparte parser decimal g/kg, input directo y subtotal; inválido no envía una cantidad diferente silenciosamente. Compras convierte kg a base stock/costo por base, conserva precio público separado, actor desde sesión y readback de detalle por key. POS/gastos muestran sesión sin pedir otra identidad.

## Checkpoint local y esquema —28/10

1272 pruebas PASS,0 FAIL,0 skipped; 40 focales inventario/caja (21+19). Lint/typecheck/build aislado/scan/diff PASS. Diferencial del sprint verifica244 declaraciones GAS y12 archivos críticos; siete adiciones exactas solo para actions/guards de cierre. Las antiguas pruebas byte-a-byte C5/v23 se ejecutan contra el hito716e8c8, conservando el SHA esperado original; la fuente actual tiene auditoría propia. No se eliminaron tests ni se omitieron pruebas.

Contrato financiero y su runtime están versionados y sincronizados por generador. Diario PREPARADA, readback y confirmación; timeout después de append/confirmación recuperable sin nueva fila; CAS de fuente, bloqueo de turno cerrado y replay. Proveedor sigue por compra. Gastos asociados de forma explícita mediante metadatos versionados, sin reinterpretar dos históricos.

Destino y versión real verificados: Sheet exacta, GASv25. Baseline:54 SKU comerciales,18 familias QA inactivas,0 comerciales con familia. Dos operaciones legacy REQUIERE_REVISION son las ya acreditadas en30e047e; no se rehacen. Sin duplicados nuevos ni bloqueos QA C5.

Backup: [BACKUP TEST OPERACION USABLE 2026-10-28T18-07-00Z](https://docs.google.com/spreadsheets/d/1_jeHvpqSdxdE7b8exFFkGV3ZgpPs_nDasBQFYZ8jh_I/edit). Verificación completa:19 pestañas, valores/fórmulas/formatos/validaciones/notas idénticos. Tabla nueva CIERRES_CAJA:18 headers,0 datos. Readback confirmó las19 hojas preexistentes idénticas. Segunda planificación idempotente:0 requests. No se tocaron celdas históricas. Rollback de esquema: conservar tabla vacía o archivarla con evidencia; nunca restaurar toda la Sheet sobre nuevas operaciones.

Pendiente de este checkpoint original: backup de fuente GASv25/deploy TEST, E2E nuevo de turno, cleanup, guía/visual y Preview. No se considera sprint terminado todavía.

## Recuperación controlada posterior —sprint detenido

El deploy TESTv25→v26 y su backup sí se completaron después del checkpoint. El ensayo superó login/me de tres roles sintéticos y creó una unidad QA inactiva/stock0; luego se bloqueó al crear granel. La hipótesis de campo omitido en DTO se corrigió con la traza integral descrita abajo. No hubo conteos, compras, ventas, pedidos, gastos, movimientos ni cierres nuevos al recuperar. La recuperación confirmó19 hojas previas/54 SKU comerciales intactos y CIERRES_CAJA vacía; únicamente la unidad y su auditoría son nuevas. Última suite previa1280 PASS/0 FAIL/0 skipped; build final/visual/E2E aún pendientes. No hubo escrituras TEST, deploy ni push en la recuperación. [Continuidad exacta, archivos, backups y matriz](PAUSA_TECNICA_OPERACION_TEST_2026-10-28.md).

## Reanudación — corrección mínima de alta granel

Comparación literal de9200139/local: el DTO siempre incluye gramos_unidad_stock; los únicos cambios del DTO son de gastos, no de producto. Traza formulario→payload→DTO→ruta Next→transporte TEST→doPost GASv26 conserva base250. El formulario y el arnés fijaban kg para cualquier base; el contrato D40 histórico rechaza kg+250. Se añade unidadStockInicialGranel y se usa al construir el payload:100/250→unidad,1000→kg. No cambia GAS, DTO, conversión, IDs, stock histórico ni validación; no requiere deploy Apps Script.

Regresión nueva integral con las bases100/250/1000, actor firmado, stock0/inactivo, persistencia, replay y protección de base histórica; reproduce además el409 original sin crear filas.26 focales PASS (5 nuevos+21 previos), typecheck y diferencial V1 PASS. La suite1280 previa sigue siendo baseline; suite/build final se reservan para integración terminada.

Readback antes de reanudar:20 hojas idénticas al cierre recuperado, unidad QA intacta/granel ausente, sin ejecución concurrente. Backup incremental [BACKUP TEST TURNO REANUDACION 2026-10-28T23-13-00](https://docs.google.com/spreadsheets/d/1qf_VINtC-xif7kan7Vu9nTSZnznLAjIGnp6g2TK21E8/edit):20 pestañas y todas sus celdas/fórmulas/formatos/validaciones/notas idénticas; conserva el backup inicial. El arnés mantiene el archivo de pasos y las keys, verifica la unidad existente y se detiene si encuentra un granel sin paso acreditado.
