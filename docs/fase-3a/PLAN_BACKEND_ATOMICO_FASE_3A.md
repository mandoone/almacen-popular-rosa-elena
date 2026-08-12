# PLAN_BACKEND_ATOMICO_FASE_3A.md — Diseño técnico previo a implementación

> Estado: **propuesta, no implementada**
>
> Fecha: **2026-08-11**
>
> Alcance: Apps Script y migración de datos de Fase 3A
>
> Prohibido aplicar en producción sin una copia de Sheet, una copia de Apps Script
> y la aprobación explícita del plan de migración y rollback.

---

## 1. Objetivo

Convertir el cambio de estado de un pedido en una única operación atómica que:

1. lea el pedido y su detalle;
2. compare el estado real con el `estado_esperado` del cliente;
3. valide la transición y todas sus precondiciones;
4. compruebe el stock completo antes de modificar una sola línea;
5. aplique el impacto de stock una sola vez;
6. escriba el nuevo estado y su auditoría;
7. termine todo dentro del mismo bloqueo de Apps Script.

El diseño elimina la ventana leer-luego-escribir que hoy existe entre Next.js y
Apps Script. Las validaciones actuales del proxy siguen siendo una primera barrera,
pero Apps Script debe convertirse en la autoridad final.

## 2. Invariantes del modelo

- Un pedido web nuevo nace en `recibido` y no compromete stock.
- El stock se compromete al pasar desde `recibido` a `pendiente` o `listo`.
- `fecha_confirmacion` vacía significa que el pedido todavía no descontó stock.
- `fecha_confirmacion` con valor significa que el pedido ya descontó stock.
- Todo movimiento de stock y su cambio de estado se confirman juntos o no se
  confirma ninguno.
- Una transición a sí mismo es inválida.
- `entregado` y `cancelado` son estados terminales.
- El servidor calcula precios, totales, fechas e impacto de stock; no confía en
  esos valores enviados por el cliente.

## 3. Contrato para crear un pedido

Se conserva la acción pública `crearPedido` y su forma general de petición:

```json
{
  "action": "crearPedido",
  "nombre_cliente": "Rosa Elena",
  "telefono": "+56900000000",
  "forma_pago": "efectivo_al_retirar",
  "observaciones": "",
  "carrito": [
    { "id_producto": "PROD-001", "cantidad": 2 }
  ]
}
```

### Comportamiento propuesto

1. Validar existencia y disponibilidad informativa de productos.
2. Validar enteros, decimales y múltiplos de `paso_venta`.
3. Calcular precios y total desde `PRODUCTOS`.
4. Crear cabecera y detalle bajo un único `ScriptLock`.
5. Escribir `estado_pedido = recibido`.
6. Escribir `estado_pago = pendiente_de_pago`.
7. Dejar `fecha_confirmacion` y `responsable_confirmacion` vacíos.
8. Registrar la creación en `HISTORIAL_PEDIDOS`.
9. **No** descontar `stock_actual` y **no** crear una salida en
   `MOVIMIENTOS_STOCK`.

Respuesta de éxito propuesta:

```json
{
  "ok": true,
  "data": {
    "id_pedido": "PED-20260811-120000",
    "estado_pedido": "recibido",
    "estado_pago": "pendiente_de_pago",
    "stock_comprometido": false
  }
}
```

La comprobación de stock al crear no reserva inventario. Dos pedidos pueden pedir
la última unidad; solo el primero que se confirme con stock suficiente avanza.

## 4. Contrato para cambiar el estado

Nueva acción única: `cambiarEstadoPedido`.

```json
{
  "action": "cambiarEstadoPedido",
  "token": "...",
  "id_pedido": "PED-20260811-120000",
  "estado_esperado": "recibido",
  "estado_nuevo": "pendiente",
  "responsable": "Carolina",
  "motivo_cancelacion": null,
  "observacion_interna": null
}
```

Campos obligatorios:

- `id_pedido`
- `estado_esperado`
- `estado_nuevo`
- `responsable`

`motivo_cancelacion` es obligatorio al ir a `cancelado`. Si el motivo es `otro`,
también se exige `observacion_interna`.

Respuesta de éxito propuesta:

```json
{
  "ok": true,
  "data": {
    "id_pedido": "PED-20260811-120000",
    "estado_anterior": "recibido",
    "estado_pedido": "pendiente",
    "impacto_stock": "descuenta",
    "fecha_confirmacion": "2026-08-11 12:05:00"
  }
}
```

Next.js debe enviar el estado que la UI tenía al iniciar la acción. No debe hacer
una segunda lectura para reemplazarlo: la comparación útil ocurre dentro del lock.

## 5. Uso de `LockService`

La operación completa debe ejecutarse bajo `LockService.getScriptLock()`:

```text
1. adquirir ScriptLock con tiempo máximo definido;
2. leer fila de PEDIDOS dentro del lock;
3. leer DETALLE_PEDIDOS y PRODUCTOS dentro del lock;
4. validar estado esperado, transición, pago, motivo y stock;
5. calcular todos los nuevos valores en memoria;
6. escribir PRODUCTOS y MOVIMIENTOS_STOCK si corresponde;
7. escribir PEDIDOS y campos asociados;
8. escribir HISTORIAL_PEDIDOS;
9. SpreadsheetApp.flush();
10. liberar el lock en finally.
```

No se debe liberar el lock entre la validación y las escrituras. Si una validación
falla, no se escribe ninguna fila ni movimiento.

Si Apps Script no ofrece transacciones con rollback automático, el orden de
escritura debe minimizar estados parciales y cada fallo debe quedar registrado.
La prueba en copia debe incluir fallos inducidos antes de decidir el orden final.

## 6. Matriz de transiciones e impacto de stock

La fuente de verdad es `src/lib/fase3a/estados.ts`.

| Desde | Hacia | Impacto de stock |
|---|---|---|
| `recibido` | `pendiente` | Descuenta |
| `recibido` | `listo` | Descuenta |
| `recibido` | `cancelado` | Ninguno; no devuelve |
| `pendiente` | `listo` | Ninguno |
| `pendiente` | `cancelado` | Devuelve |
| `listo` | `pendiente` | Ninguno |
| `listo` | `entregado` | Ninguno |
| `listo` | `cancelado` | Devuelve |
| `entregado` | cualquiera | Inválida; terminal |
| `cancelado` | cualquiera | Inválida; terminal |

Confirmar `recibido → pendiente/listo` exige stock suficiente para **todas** las
líneas. Si falta una unidad en cualquier producto, no se descuenta ninguno y el
pedido permanece en `recibido`.

## 7. Manejo de conflictos y errores

Formato de error esperado desde Apps Script:

```json
{
  "ok": false,
  "error": "Mensaje claro para operación",
  "codigo": 409,
  "tipo": "estado_desactualizado"
}
```

Apps Script Web App puede responder HTTP 200 en el transporte. En ese caso,
`codigo` es el estado lógico que `src/lib/appsScriptPedidos.ts` debe propagar a
Next.js mediante `AppsScriptError`.

| Caso | Código lógico | Tipo sugerido | Efecto |
|---|---:|---|---|
| Petición incompleta o estado nuevo desconocido | `400` | `peticion_invalida` | Sin escrituras |
| Token inválido | `401` | `no_autorizado` | Sin escrituras |
| Pedido inexistente | `404` | `pedido_inexistente` | Sin escrituras |
| `estado_esperado` distinto del real | `409` | `estado_desactualizado` | Devolver también el estado real |
| Stock insuficiente | `409` | `stock_insuficiente` | Devolver productos y faltantes; sin descuentos |
| Estado actual ilegible | `409` | `estado_ilegible` | Revisión manual; sin escrituras |
| Transición no permitida | `409` | `transicion_invalida` | Sin escrituras |
| No se pudo adquirir el lock | `409` o `503` | `operacion_ocupada` | Solicitar reintento seguro |
| Error interno inesperado | `500` | `error_interno` | No revelar secretos ni URL del script |

Ante `estado_desactualizado`, Next.js debe mostrar el mensaje y recargar el pedido.
No debe reintentar automáticamente una mutación con un estado esperado nuevo.

## 8. Compatibilidad con pedidos heredados

Antes del despliegue, todos los pedidos existentes deben marcarse con
`fecha_confirmacion = <fecha de migración>`, porque su stock fue descontado al
crearlos bajo el modelo anterior.

Reglas de compatibilidad:

- Pedidos heredados en `pendiente` o `listo` conservan su stock comprometido.
- Al cancelar un pedido heredado confirmado, se devuelve stock una sola vez.
- Pedidos heredados `entregado` o `cancelado` permanecen terminales.
- Valores ilegibles no se corrigen automáticamente: se marcan con
  `requiere_revision = SI` y se revisan manualmente.
- `forma_pago` y `vendedor_admin` no se borran; quedan como histórico.
- `estado_pago` y `metodo_pago` se migran antes de conectar la UI nueva de pagos.

Las acciones antiguas `actualizarEstadoPedido` y `cancelarPedido` pueden existir
como alias temporales, pero nunca deben saltarse el lock ni la matriz. Durante la
compatibilidad deben delegar en el mismo núcleo atómico. Los alias se eliminan en
un despliegue posterior, cuando ningún frontend activo los utilice.

## 9. Plan de migración

### Preparación

1. Elegir una ventana fuera del sábado de apertura y sin pedidos en operación.
2. Identificar y registrar versión actual de Apps Script y despliegue de Vercel.
3. Duplicar la Sheet completa.
4. Duplicar el proyecto Apps Script y apuntarlo exclusivamente a la copia.
5. Agregar en la copia las columnas y hojas aditivas definidas en
   `COLUMNAS_SHEETS_PROPUESTAS.md`.

### Ensayo en copia

6. Migrar pagos heredados y marcar casos dudosos para revisión.
7. Poblar `fecha_confirmacion` en pedidos heredados.
8. Implementar el núcleo atómico en la copia de Apps Script.
9. Probar el contrato desde un entorno Next.js apuntado solo a la copia.
10. Comparar inventario inicial, movimientos y resultado después de cada caso.

### Producción, solo después de aprobación

11. Respaldar y registrar conteos de filas y stock por producto.
12. Agregar columnas y hojas aditivas.
13. Ejecutar la migración de datos con reporte de antes/después.
14. Desplegar Apps Script compatible con frontend antiguo y nuevo.
15. Ejecutar smoke tests controlados.
16. Desplegar Next.js con el contrato `estado_esperado`.
17. Monitorear conflictos, movimientos y diferencias de stock.
18. Retirar alias antiguos en una etapa separada.

Cada paso debe tener responsable, hora de inicio, evidencia y criterio explícito
para continuar o abortar.

## 10. Plan de pruebas en copias

### Casos funcionales

- Reproducir los 25 pares de la matriz de estados.
- Verificar cada impacto de stock de la tabla de §6.
- Confirmar que una transición a sí mismo no mueve stock.
- Confirmar que `recibido → cancelado` no devuelve stock.
- Confirmar que `pendiente/listo → cancelado` devuelve exactamente una vez.
- Confirmar que `entregado` y `cancelado` no tienen salida.
- Confirmar creación en `recibido` sin movimiento de stock.
- Confirmar que granel respeta `paso_venta`.

### Casos de error

- Pedido inexistente.
- Estado actual ilegible.
- Estado esperado desactualizado.
- Stock insuficiente en la primera, una intermedia y la última línea.
- Motivo de cancelación ausente y motivo `otro` sin observación.
- Pago incompleto al intentar entregar.
- Timeout al adquirir el lock.

### Casos de concurrencia

- Dos confirmaciones simultáneas del mismo pedido.
- Confirmación y cancelación simultáneas del mismo pedido.
- Dos pedidos distintos compitiendo por el último stock.
- Doble clic y reintento después de timeout.

Para cada caso se debe comprobar estado del pedido, stock final, número de
movimientos e historial. Nunca basta con revisar solo la respuesta HTTP.

## 11. Plan de rollback

Condiciones de rollback inmediato:

- creación de pedidos deja de funcionar;
- una transición mueve stock dos veces o no lo mueve cuando corresponde;
- aparecen filas parciales o historial inconsistente;
- crecen errores `500`, `estado_ilegible` o diferencias de inventario;
- frontend desplegado y Apps Script no comparten contrato compatible.

Procedimiento propuesto:

1. detener nuevas mutaciones admin;
2. restaurar la versión anterior del despliegue de Apps Script;
3. restaurar el frontend compatible si ya cambió;
4. no borrar columnas nuevas: son aditivas y sirven para diagnóstico;
5. comparar el backup con stock, movimientos y pedidos modificados durante la
   ventana;
6. corregir manualmente solo con evidencia y responsable registrado;
7. documentar el incidente antes de reintentar.

Volver al código anterior no revierte datos ya escritos. Por eso el respaldo, el
registro de operaciones y la reconciliación forman parte obligatoria del rollback.

## 12. Riesgos pendientes

1. Apps Script y Sheets no ofrecen una transacción de base de datos con rollback
   automático para varias hojas.
2. Un timeout del cliente puede ocurrir después de que el servidor confirme la
   operación; la respuesta debe incluir datos idempotentes y el cliente debe
   recargar antes de reintentar.
3. Los pedidos heredados dependen de que `fecha_confirmacion` se pueble completa y
   correctamente.
4. Los estados o pagos libres ya existentes requieren revisión humana.
5. La contraseña admin compartida no identifica al responsable; el campo
   `responsable` seguirá siendo declarado hasta contar con usuarios individuales.
6. Los alias temporales amplían la ventana de compatibilidad y deben retirarse con
   evidencia de que no quedan clientes antiguos.
7. Una copia de Sheet no reproduce por sí sola permisos, cuotas y latencia de
   producción; el ensayo debe documentar esas diferencias.

## 13. Prohibiciones hasta contar con entorno de prueba

No se debe:

- editar ni desplegar Apps Script productivo;
- probar mutaciones contra Google Sheets real;
- cambiar pedidos nuevos a `recibido` en producción;
- retirar el descuento actual al crear sin migrar pedidos heredados;
- modificar `estado_pago` antes de crear y poblar `metodo_pago`;
- renombrar o borrar columnas existentes;
- desplegar frontend que exija `estado_esperado` antes de que Apps Script lo
  soporte, salvo estrategia compatible verificada;
- ejecutar la migración durante una apertura o con pedidos en vuelo;
- confiar solo en pruebas unitarias: son obligatorias las pruebas de integración
  y concurrencia sobre copias;
- continuar un despliegue sin versión anterior, respaldo y criterio de rollback.

## 14. Criterio para autorizar implementación

La implementación puede comenzar únicamente cuando existan:

1. copia identificada de la Sheet;
2. copia separada del proyecto Apps Script;
3. columnas y datos fixture preparados en la copia;
4. responsable de ejecutar y revisar la migración;
5. matriz de pruebas y resultados esperados aprobados;
6. versión productiva anterior y procedimiento de rollback registrados;
7. ventana de trabajo sin apertura ni pedidos en curso.

Hasta entonces, este documento es diseño y no autorización para modificar
producción.
