# Guía práctica de revisión por Omar — TEST

Fecha:2026-10-12. Objetivo: Omar recorre la web antes de capacitar al equipo. **Esta guía no autoriza escrituras ni Production.** Usar Preview TEST vigente guardado en el proyecto, verificar entorno/banners y cuenta individual por canal privado. No publicar URL administrativa privada, contraseña, cookies, nombres de clientes ni montos de caja en Git.

## Cómo registrar

En cada fila elegir **OK / ERROR / NO ENTIENDO / CAMBIAR UX / OBSERVACIÓN**; dejar texto breve con pantalla/paso, esperado y observado. Un campo vacío significa no probado. Guardar capturas/evidencia privada sin credenciales; usar datos sintéticos al compartir. No marcar READY F10 automáticamente por completar un recorrido.

- **LECTURA:** permitido sobre TEST actual, abrir/listar/ver detalle sin guardar. Carrito y formatos locales pueden revisarse sin enviar pedido.
- **MOCK LOCAL:** ensayos que requieren confirmar/cancelar/comprar/vender/ajustar/caja/gasto, exclusivamente con almacenamiento en memoria y fixtures sintéticos. Nunca apuntar el harness a Sheet real.
- **FUTURO TEST:** para un ensayo operativo humano completo sobre TEST real se requiere tarea separada con fixtures aislados, alcance autorizado, backup/readback y cleanup. No hacerlo siguiendo esta guía durante la sesión actual.

No pulsar Guardar/Crear/Confirmar/Registrar/Cancelar/Ajustar sobre datos reales. Si el entorno es incierto, detener ese paso. No entrenar al equipo hasta que Omar complete la revisión y priorice los cambios de UX.

## Recorrido público y pedido

| Área / punto | Modo | Qué observar | Resultado | Observación |
|---|---|---|---|---|
| Público: Inicio | LECTURA | Diseño, navegación, lenguaje/precios justos, CTA comprensibles en desktop/móvil. | | |
| Público: Historia | LECTURA | Síntesis editorial incorporada; cronología legible y enlaces. No pedir nuevos textos a Nadia. | | |
| Público: Rosa Elena | LECTURA | Biografía respetuosa, fuente institucional y legibilidad; derechos de retratos siguen separados. | | |
| Público: Participar | LECTURA | Turnos/difusión/compra/aportes generales entendibles, sin datos bancarios. | | |
| Público: contactos/menu/footer | LECTURA | Enlaces oficiales, dirección/horario/calendario vigentes y menú móvil/foco. No volver a elegir datos cerrados. | | |
| Tienda V1 | LECTURA | Categorías, búsqueda, disponible/agotado, unidad/presentación, estado de carga/error. Sigue por SKU. | | |
| Tienda granel | LECTURA | Gramos libres y referencia de precio D40;150g a1350/kg=203 en mock. No migrar los18 graneles. | | |
| Carrito V1 | LECTURA LOCAL | Agregar/quitar/cambiar cantidad solo en navegador, subtotales/totales y presentación; no enviar. | | |
| Pedido V1: formulario | LECTURA | Campos/contacto/retiro/apertura y mensajes entendibles; detener antes de enviar. | | |
| Pedido completo/reintento | MOCK LOCAL | Crear fixture, confirmar/replay/listo/entregar/pago/cancelación autorizada; revisar ID y evitar duplicados. | | |

## Login y perfiles

| Área / punto | Modo | Qué observar | Resultado | Observación |
|---|---|---|---|---|
| Login | TEST individual | Entrar con cuenta propia, nombre/rol, mensaje de error y cerrar sesión; no crear usuarios ni cambiar credenciales. | | |
| Venta | LECTURA | Pedidos/POS/comanda y consulta de stock visibles según permisos; cancelación/ajustes/compras no habilitados. | | |
| Venta: registrar/pagar | MOCK LOCAL | Apertura requerida, SKU físico, cantidades, comanda y estado de pago; no confundir pago pendiente con dinero recibido. | | |
| Operación | LECTURA | Cancelación, stock, compras, caja/gastos/reportes accesibles según rol; distinguir consulta de mutación. | | |
| Operación: reversos | MOCK LOCAL | Confirmación/cancelación devuelve SKU exactos, bloqueo de operación incierta y replay sin duplicar. | | |
| Administración | LECTURA | Maestro físico/oferta pública/permisos/configuración claramente separados. No alta de usuarios ni guardar configuración. | | |

## Paneles y catálogo futuro

| Área / punto | Modo | Qué observar | Resultado | Observación |
|---|---|---|---|---|
| Familias | LECTURA | Oferta pública separada de identidad física; no crear/activar/asociar familias reales. | | |
| Familias: simulador | MOCK LOCAL / LECTURA | `/admin/familias/simulador`: política, imagen/origen, precio, disponibilidad y SKU/stock interno claramente separados. | | |
| Simulador Económico | MOCK LOCAL | Aceite1700 sin marca pública; placeholder genérico; foto branded bloqueada con aviso; ninguna petición de guardar. | | |
| Simulador mapa | MOCK LOCAL | JSON/CSV válido/inválido, CUMPLE/ADVERTENCIA/BLOQUEADO; no alterar Sheet. | | |
| Productos | LECTURA | SKU/activo/unidad/stock/costo/precio e identidad legible; no inferir marca desde el nombre ni editar. | | |
| Compras | LECTURA | Cabecera proveedor/fecha, detalle SKU/costo y snapshots históricos; proveedor no fijo en SKU. | | |
| Compras futura | MOCK LOCAL | Mismo SKU a proveedores distintos conserva identidad y congela historial; marca/formato distintos requieren otro SKU. | | |
| Stock | LECTURA | Unidad/base granel/movimientos/bloqueos; stock técnico no equivale al conteo físico. No ajustar. | | |
| Caja | LECTURA | Saldo/resumen/tipo de movimiento/pago pendientes comprensibles; no abrir/cerrar/cargar montos. | | |
| Gastos | LECTURA | Categoría, responsable/referencia y relación con caja; no registrar ni corregir gastos reales. | | |
| Reportes | LECTURA | Filtros/períodos/proveedor/movimientos y legibilidad; QA aislado y efectos V2 incompletos no deben confundirse con ventas reales. | | |
| Aperturas | LECTURA | Calendario/habilitación/POR_APERTURA/POS; no crear/habilitar/modificar una apertura. Empanadas mantienen su regla. | | |

## Cierre de la revisión

Omar consolida ERROR/NO ENTIENDO/CAMBIAR UX por prioridad antes de capacitación. Evidencia de cuenta/permiso y validación editorial siguen gates humanos; F10 no se promueve desde este checklist. Nadia ya recibió las preguntas agrupadas, no reenviarlas. Carolina continúa fotos/derechos. Conteo/caja/banco se harán al corte y no durante una prueba de UX. Migración familiar y activación pública siguen separadas.

Guías operativas existentes para un ensayo futuro autorizado: [Venta](GUIA_VENTA.md), [Operación](GUIA_OPERACION.md), [Administración](GUIA_ADMINISTRACION.md), [ensayo final](../ENSAYO_FINAL_F10_TEST.md). Este documento es plantilla sin resultados humanos inventados.
