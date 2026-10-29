# Sprint Operación TEST usable

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
