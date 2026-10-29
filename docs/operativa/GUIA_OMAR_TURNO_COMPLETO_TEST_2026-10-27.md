# Guía de Omar — turno completo TEST

**Turno técnico completo validado por HTTP contra TEST; prueba personal de Omar pendiente.** Revisión visual focal desktop/móvil con mocks sintéticos y sin red remota. No confundir esta evidencia con una capacitación o un turno humano ya realizado. [Resultados y límites](OPERACION_TEST_USABLE_2026-10-27.md).

Preparada el28/10/2026. Ensayo con productos nuevos identificados **ENSAYO-TEST**; no usar los54 SKU comerciales ni introducir saldos/costos reales por aproximación. La prueba técnica y sus resultados viven en [el informe del sprint](OPERACION_TEST_USABLE_2026-10-27.md). Esta guía no sustituye la revisión humana de Omar ni autoriza Production.

## Antes de entrar

El build Preview está READY. La última verificación automatizada llegó a SSO Vercel y el conector devolvió403; no se pudo acreditar la navegación remota posterior. Omar necesita primero su acceso Vercel habitual y, por separado, la activación segura de su cuenta individual de la aplicación. No compartir credenciales ni desactivar protección para superar este punto.

1. Abrir el [Preview TEST de feature/fase-3a-operativa](https://almacen-popular-rosa-ele-git-99da69-omarquezadac-9434s-projects.vercel.app), no el dominio público. Debe mostrar TEST. Si aparece protección Vercel, usar el acceso habitual autorizado del proyecto; no desactivar protección.
2. Abrir `/admin/login`. Usar el actor individual aprobado de Omar y su credencial entregada privadamente. No escribir contraseñas en esta guía/chat ni compartir capturas de credenciales. Si aún no se generó/entregó, seguir [Activación de cuentas TEST](ACTIVACION_CUENTAS_TEST.md): el custodio genera el hash con prompt sin eco, valida registro y configura solo Preview/rama; Omar realiza su primer login. No usar la cuenta sintética de QA como cuenta personal.
3. Verificar nombre/rol de sesión y que puede abrir Productos, Inventario, Compras, Gastos y Caja. Un403 es un permiso, no una invitación a probar otro actor. Operación puede comprar/contar/cancelar/caja; Venta puede vender/confirmar/entregar, pero no contar/cancelar/cerrar caja. Administración gestiona catálogo/precios/configuración.
4. Abrir `/admin/configuracion-inicial`. Leer los pendientes; los fixtures no vuelven LISTO un conteo, saldo, costo o gate humano. Mantener los seis costos pendientes vacíos hasta su acreditación.

## Ensayo desde navegador

El turno técnico28/10 terminó con cleanup y cierre confirmado; **no reabrirlo ni repetir sus keys**. La cuenta humana de Omar todavía no fue activada. Para su ensayo nuevo elegir fecha/alcance TEST libres y respaldo vigente. No alterar históricos. La apertura usa ID APE-AAAAMMDD por contrato; no escribir APE-TEST manualmente. El recorrido tiene dos momentos: recibir el pedido durante anticipados y luego habilitar presencial en esa misma apertura QA. El cierre de anticipados debe ser anterior al inicio presencial, según validación vigente.

| Paso | Qué abrir / escribir / pulsar | Resultado que revisar |
|---|---|---|
|1. Alta | `/admin/productos` → **Alta de producto físico · ID automático**. Nombre `ENSAYO-TEST unidad Omar`, marca `QA` (sintética), presentación `1 unidad QA`, contenido1/unidad, categoría Alimentos, venta UNIDAD, disponibilidad POR_APERTURA, precio1000, costo500 (solo sintéticos). **Crear inactivo con stock0**. | Se genera PROD-TEST-WEB… sin inventar ID. Inactivo, stock0, sin familia. Copiar únicamente el ID para reconocerlo. Proveedor no se define aquí. |
|2. Granel de ensayo | Alta equivalente `ENSAYO-TEST granel Omar`, GRANEL, referencia1000g, base stock250g, precio1350 por referencia, costo250 por base (1000/kg), contenido/presentación QA. | Inactivo, stock0, referencia y base separadas. No cambiar la base de un granel histórico. |
|3. Conteo parcial | `/admin/inventario`: buscar cada SKU, ingresar5 unidades y1,7kg respectivamente. Observación `ENSAYO-TEST conteo inicial`. Agregar ambos a la revisión, revisar saldo esperado/diferencia, marcar revisión y aplicar. | Solo esos SKU:5 unidades y6,8 bases de250g. Dos movimientos con actor/key. Lo omitido no pasa a cero. Si cambia el saldo esperado, detener/revisar; si respuesta es incierta, conservar pestaña y reconciliar la misma sesión. |
|4. Revisar/activar y comprar | En Productos revisar y activar únicamente los dos SKU QA antes de comprarlos. `/admin/compras`: proveedor `ENSAYO-TEST Proveedor1`, fecha del ensayo. Buscar unidad, cantidad3, costo600. **Agregar línea**, buscar granel, cantidad1kg, costo1000 por kg. Revisar subtotales1800+1000=2800 y **Confirmar compra TEST**. | Backend rechaza compras de SKU inactivos. Readback de compra/actor/snapshots y stocks8 /10,8 bases. Costo de unidad600 y granel250/base. Precio público no se recalcula. No generar otra compra ante timeout; usar **Consultar / reintentar misma compra**. |
|5. Apertura anticipada QA | `/admin/aperturas`: crear una apertura sintética para la fecha del ensayo, lugar/observación ENSAYO-TEST, horario y cierre válidos; activar anticipados, mantener presencial inactivo. No cambiar una apertura comercial ni dejar dos activas para anticipados. Habilitar solamente los SKU QA mediante Productos por apertura. | Apertura propia con ID de fecha; SKU POR_APERTURA solo habilitados en ella. Finalizarla al terminar. |
|6. Pedido web anticipado | Antes del corte, `/tienda`: elegir solo los SKU del ensayo,1 unidad y150g. Enviar con nombre ENSAYO-TEST, teléfono de ensayo y efectivo al retirar. | Total1203; recibido en `/admin`, stock8 /10,8 sin descuento. No enviar datos personales. Si no existe una ventana anticipada válida, detener y planificar el ensayo; no cambiar el reloj ni relajar controles. |
|7. Momento presencial y venta | En la apertura QA propia cerrar anticipados y habilitar presencial con horarios válidos. `/admin/vendedor`: seleccionar apertura QA,2 unidades y150g, efectivo. Revisar subtotal granel203, total2203 y registrar. | Comanda con actor de sesión, stock6 /10,2 bases. Un doble clic/reintento no crea dos ventas. No ingresar responsable manual. |
|8. Confirmar/pagar | `/admin`: abrir el pedido propio, confirmar a pendiente y registrar pagado en efectivo. | Stock5 /9,6 bases, estado/pago persistidos; el detalle granel conserva203. Releer el pedido después de guardar. |
|9. Cancelar | Como Operación/Administración, cancelar ese mismo pedido confirmado. Revisar confirmación y motivo/contexto de la acción. | Cancelado, stock6 /10,2 bases; movimientos de devolución trazables. Replay no devuelve dos veces. Se conserva la historia del pago, pero el resumen separa cancelados. |
|10. Reposición | Compras: mismo SKU unidad, proveedor `ENSAYO-TEST Proveedor2`, cantidad2, costo650. | Mismo producto_id, compra/proveedor/costo nuevos en historial; stock8. No crear otro SKU por cambiar proveedor. |
|11. Gasto | `/admin/gastos`: materiales, descripción ENSAYO-TEST,200, apertura QA explícita, efectivo de apertura; registrar y revisar historial. | Actor automático. Gasto asociado a esa apertura/medio; los históricos sin asociación se excluyen, no se atribuyen por fecha. Reintentar con la misma referencia ante respuesta incierta. |
|12. Caja | `/admin/caja`: seleccionar apertura QA. Distinguir cobrado/pendiente/transferencias/cancelados y gastos asociados. En arqueo ingresar saldo inicial500 y efectivo contado2503 (solo sintéticos). Escribir observación ENSAYO-TEST y marcar revisión. | Esperado500+2203−200=2503, diferencia0. El pedido cancelado no integra cobro vigente. Vacío no significa cero declarado. |
|13. Cierre | **Confirmar cierre revisado TEST**; esperar readback y releer historial. | Una fila CONFIRMADA, actor/fecha/snapshot, sin botón de edición. Cerrar caja no cierra el calendario. Un nuevo gasto/venta/pago incompatible de ese turno cerrado se bloquea. Una corrección exige rectificación auditada, nunca editar/eliminar la fila. |
|14. Historia | `/admin/historiales`, Compras, Gastos y Caja: localizar por IDs del ensayo. | Compra/costo/proveedor, movimientos, venta/comanda, pedido/cancelación y cierre permanecen trazables. El saldo vigente puede incluir operaciones posteriores; usar snapshots para explicar las anteriores. |
|15. Cleanup | Antes de abandonar el ensayo: inventario de ambos SKU QA a0 con observación cleanup, inactivarlos en Productos; deshabilitarlos en su apertura y cerrar calendario/anticipados/presencial. | Solo QA vuelve al baseline0 y deja de ofrecerse. No borrar compras, movimientos, venta, pedido, gasto o cierre. No resetear toda la Sheet. Si hay operación incierta, resolverla antes de cerrar. |
|16. Salir | **Cerrar sesión**. Intentar volver a una pantalla administrativa en ventana privada. | Debe pedir login/401. Revocar/versionar una cuenta se realiza por el procedimiento seguro; logout no invalida una cookie copiada. |

## Granel sin atajos obligatorios

En tienda/carrito/POS el campo principal se escribe directamente:750g, cambiar a kg y escribir1,7 o5. Debe conservar gramos enteros (750/1700/5000), subtotal en vivo, botones−100/+100 y250/500/1000. Un valor inválido no debe enviarse como la cantidad válida anterior. El backend confirma el total; referencia de precio no es base de stock.

## Hoja de evaluación humana

Marcar una opción por paso; anotar qué esperaba ver y qué ocurrió. No adjuntar credenciales ni datos privados.

| Paso | OK | ERROR | NO ENTIENDO | CAMBIAR UX | OBSERVACIÓN |
|---|---|---|---|---|---|
| Acceso/configuración |☐|☐|☐|☐| |
| Alta unidad/granel |☐|☐|☐|☐| |
| Conteo parcial/readback |☐|☐|☐|☐| |
| Compra/reposición |☐|☐|☐|☐| |
| Apertura/habilitación |☐|☐|☐|☐| |
| Venta/comanda |☐|☐|☐|☐| |
| Tienda/carrito/pedido |☐|☐|☐|☐| |
| Confirmación/pago |☐|☐|☐|☐| |
| Cancelación/devolución |☐|☐|☐|☐| |
| Gasto/medio/apertura |☐|☐|☐|☐| |
| Caja/arqueo/cierre |☐|☐|☐|☐| |
| Historial/reportes |☐|☐|☐|☐| |
| Cleanup/logout |☐|☐|☐|☐| |

Pendientes Nadia/Carolina/conteo/saldos/capacitación y F10 siguen en sus documentos dueños. Nada de esta guía autoriza migración familiar, POS familiar ni Production.
