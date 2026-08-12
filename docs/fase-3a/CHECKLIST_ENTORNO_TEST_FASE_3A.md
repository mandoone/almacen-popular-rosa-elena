# CHECKLIST_ENTORNO_TEST_FASE_3A.md

> Estado: pendiente de ejecución
>
> Alcance: copias TEST; no autoriza cambios en producción

## 1. Preparación

- [ ] Asignar responsable, fecha y criterio para detener la prueba.
- [ ] Registrar la versión base sin copiar URLs, IDs ni tokens al repo.
- [ ] Confirmar que no se trabajará sobre recursos productivos.

## 2. Recursos TEST

- [ ] Crear una copia del Google Sheet y nombrarla claramente `TEST`.
- [ ] Crear una copia independiente del Apps Script y nombrarla `TEST`.
- [ ] Crear propiedades, token y deployment exclusivos de TEST.
- [ ] Conectar el Script TEST al Sheet TEST mediante ID explícito.
- [ ] Verificar `ENVIRONMENT=TEST` y las salvaguardas de nombre e ID.

## 3. Configuración local

- [ ] Usar variables TEST solo en el proceso local.
- [ ] No guardar valores TEST en Vercel ni en archivos versionados.
- [ ] Confirmar que la aplicación local consulta exclusivamente el deployment TEST.

## 4. Datos mínimos

- [ ] Cargar un pedido por estado: recibido, pendiente, listo, entregado y cancelado.
- [ ] Cargar un pedido con estado desconocido para revisión manual.
- [ ] Preparar productos con stock suficiente, insuficiente y compartido.
- [ ] Registrar stock, pedidos y movimientos iniciales para reconciliación.

## 5. Pruebas

- [ ] Verificar creación en `recibido` sin descuento de stock.
- [ ] Verificar descuentos y devoluciones para todas las transiciones válidas.
- [ ] Verificar que conflictos y stock insuficiente no dejan escrituras parciales.
- [ ] Ejecutar solicitudes concurrentes sobre el mismo pedido y el mismo stock.
- [ ] Verificar idempotencia con `operacion_id` repetida.
- [ ] Ensayar rollback y reconciliación usando únicamente las copias TEST.

## 6. Go/No-Go

- [ ] 46/46 tests, lint y build correctos en la versión candidata.
- [ ] Matriz de estados, stock y concurrencia aprobada.
- [ ] Cero diferencias de inventario y cero movimientos duplicados.
- [ ] Operaciones parciales detectables y procedimiento de recuperación aprobado.
- [ ] Rollback ensayado con evidencia.
- [ ] **Go:** todos los puntos anteriores aprobados por Omar.
- [ ] **No-Go:** cualquier diferencia de stock, escritura parcial, conexión dudosa
  o ausencia de rollback detiene el avance a producción.
