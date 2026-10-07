# B3 — administración técnica TEST

Parte de la sesión autorizada por Omar; continúa B2 `315817ef5139ecb842fb1d056b0dea7fa384a975` en feature/fase-3a-operativa. Sin familias comerciales ni asociaciones reales.

- Esquema: cuatro headers al final de AUDITORIA_PRODUCTOS (7→11). Backup completo `BACKUP TEST FAMILIAS B3 2026-10-07T07-20-33-123Z`, ID `16-_4Kesg_6nmHS9P2n_ta1-xFAymUVixlIvZorA9RIk`: 18 pestañas legibles e idénticas antes de escribir. Readback conserva todas las celdas previas; segunda ejecución 0 cambios/0 backup. PRODUCTOS, compras, stock y precios intactos.
- Apps Script TEST v19→v20, deployment existente. Backup privado del código v19/manifest bajo operativa.local/backups; v19 inmutable disponible para rollback del deployment. No deploy C1/C2.
- CRUD familias TEST con versión/validación, lock, diario idempotente persistido y compensación ante errores. Interrupción abrupta bloquea entidad en PREPARADA para revisión, sin fingir transacción ACID. Hash usa entrada administrativa normalizada y actor validado.
- Nueva página /admin/familias y APIs administrativas requieren productos:gestionar y entorno TEST. Secciones Oferta pública e Identidad física; ninguna edición directa de stock. ID familiar inmutable, versión administrada, precio explícito, activar/desactivar mediante activo.
- SKU: familia única/existente y equivalencia obligatoria; no agrupamiento por nombre. Campos opcionales para legado. Compras continúan derivando snapshots desde SKU, sin input manual de marca.
- Dry-run: inconsistencias, huérfanos, duplicados, marca/contenido, inactivos, oferta sin SKU elegible y granel; no corrige. Catálogo/carrito/pedidos/ventas V1 no usan este mapa.
- QA: 15 pruebas focales B3, 97 de A/B1 y suite previa a los dos tests de migración 585/585; lint/typecheck aprobados; build aprobado tras reintento por EBUSY de Dropbox. Secrets scan aprobado. Lecturas remotas posteriores documentadas en la entrega integral. UI compilada; revisión visual humana pendiente, sin activar catálogo familiar ni promover F10.
- Rollback estructural: conservar columnas aditivas vacías es compatible con v19/v18; evitar borrar/restaurar filas históricas. Backup permite recuperación completa supervisada. Nunca restaurar stock/precios por suposición.

Contrato dueño: [DATA_MODEL](../DATA_MODEL.md). Próxima fase C1/C2 exclusivamente local. La carga real, revisión del mapa y activación requieren otra autorización.
