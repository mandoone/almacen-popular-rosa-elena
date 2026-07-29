# MATRIZ_QA_FASE_3A.md — Pruebas automáticas y manuales

> Documento separado de `docs/TEST_PLAN.md` a propósito: ese archivo ya tenía
> cambios sin commitear al empezar esta sesión y no se tocó, para no mezclar
> trabajos. Al cerrar FASE 3A conviene fusionarlos.

---

## 1. Pruebas automáticas (ejecutables hoy)

```bash
npm test
```

Runner nativo de Node (`node --test`), **sin dependencias añadidas**. Node 24
elimina los tipos de los `.ts` al importarlos, por eso los tests son `.mjs` e
importan con extensión explícita.

**Resultado actual: 29/29 verdes.**

| Archivo | Cubre | Casos |
|---|---|---|
| `tests/fase3a-estados.test.mjs` | Máquina de estados, impacto de stock | 9 |
| `tests/fase3a-pagos.test.mjs` | Pago separado, migración, responsables, cancelación | 8 |
| `tests/fase3a-productos.test.mjs` | Catálogo, granel, imágenes, alertas | 12 |

### 1.1 La matriz 5×5

`tests/fase3a-estados.test.mjs` fija los **25 pares** de estados con su validez y
su impacto de stock. El test comprueba además que la matriz tenga exactamente
`5 × 5` filas, así que **agregar un estado sin actualizar la matriz falla el
test**. Es la especificación ejecutable de §3.4 y §3.8.

### 1.2 Casos que blindan los hallazgos críticos

| Test | Hallazgo que previene |
|---|---|
| `el stock nunca se descuenta dos veces por el mismo pedido` | Doble descuento |
| `el stock nunca se devuelve dos veces: cancelado es terminal` | **Hallazgo 3** |
| `un pedido entregado no se cancela en flujo normal` | **Hallazgo 5** |
| `cancelar un pedido recibido no devuelve stock` | Devolución indebida |
| `estado de pago y método de pago son vocabularios separados` | **Hallazgo 6** |
| `granel acepta múltiplos de 0,25 y rechaza el resto` | **Hallazgo 8** |

> El de vocabularios separados verifica por programa que ningún valor de
> `ESTADOS_PAGO` contenga `efectivo` ni `transferencia`. Si alguien reintroduce
> `pagado_efectivo`, el test falla.

### 1.3 Qué NO cubren

- Nada del backend real: Apps Script y Sheets no se prueban desde aquí.
- Nada de la UI: no hay entorno de pruebas de componentes.
- Ninguna función está conectada al flujo real, así que **estos tests no prueban
  que el sistema se comporte así hoy** — prueban que las reglas del levantamiento
  son coherentes y están bien codificadas.

---

## 2. Pruebas manuales — regresión mínima (hacer ya)

Verifican que lo tocado en esta sesión no rompió nada. **No requieren backend
nuevo.**

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| R1 | El panel carga | Entrar a `/admin` con sesión válida | Lista de pedidos con badges de colores como antes |
| R2 | Badges sin cambios | Mirar pedidos en cada estado | `pendiente` naranja, `listo` amarillo, `entregado` verde, `cancelado` gris |
| R3 | Detalle | “Ver detalle” en un pedido | Muestra las líneas |
| R4 | Cambio de estado | “Marcar listo” en uno pendiente | Cambia y persiste al recargar |
| R5 | Pago | Cambiar el desplegable de pago | Guarda; **las opciones siguen siendo las de antes** |
| R6 | Cancelar | Cancelar un pedido de prueba | Cancela y devuelve stock (comportamiento antiguo, sin cambios) |
| R7 | Login | Cerrar sesión y volver a entrar | Redirige a `/admin/login` y luego al panel |
| R8 | Tienda | Armar un carrito y enviar pedido | Se crea el pedido como siempre |

> R5 y R6 deben comportarse **exactamente igual que antes**. Esta sesión no cambió
> la lógica de pago ni de cancelación. Si algo cambió, es un error.

---

## 3. Pruebas manuales — FASE 3A (después de migrar)

⚠️ **Sobre una copia de la planilla**, nunca sobre la real.

### 3.1 Ciclo de stock

| # | Caso | Esperado |
|---|---|---|
| S1 | Crear pedido web | Nace `recibido`; **stock sin cambios** |
| S2 | Confirmar (`recibido → pendiente`) | Stock baja; movimiento `salida`; `fecha_confirmacion` escrita |
| S3 | `pendiente → listo` | Stock **sin cambios** |
| S4 | `listo → pendiente` | Stock **sin cambios** |
| S5 | `listo → entregado` con pago | Stock sin cambios; pasa |
| S6 | `listo → entregado` sin pago | **Rechazado** (§4.4) |
| S7 | Cancelar desde `recibido` | Stock **sin cambios** |
| S8 | Cancelar desde `pendiente` | Stock vuelve; movimiento `devolucion` |
| S9 | Cancelar desde `listo` | Stock vuelve |
| S10 | Cancelar desde `entregado` | **Rechazado** |
| S11 | Reabrir un cancelado | **Rechazado** (§3.5) |
| S12 | Confirmar sin stock suficiente | **Rechazado**; queda en `recibido`; ninguna línea se descuenta |

### 3.2 Los agujeros del diagnóstico

Estos son **los casos que más importan**. Reproducen los hallazgos críticos:

| # | Caso | Esperado |
|---|---|---|
| H3 | Cancelar → forzar `pendiente` por API → cancelar otra vez | **Rechazado en el 2.º paso**; el stock se devuelve **una sola vez** |
| H4 | `PATCH {estado_pedido:'cancelado'}` directo | **Rechazado**; cancelar exige la acción con motivo, y devuelve stock |
| H5 | Cancelar un pedido `entregado` | **Rechazado** |
| H8 | Pedir 0,37 kg de granel | **Rechazado**; solo múltiplos de 0,25 |
| CC | Dos personas cambian el mismo pedido a la vez | La segunda recibe `409`; el stock se mueve una sola vez |

> **CC (concurrencia) es el caso que hay que probar de verdad**, porque es el más
> fácil de pasar por alto y el más caro de descubrir en producción. Se prueba
> abriendo el panel en dos navegadores y confirmando el mismo pedido casi a la vez.

### 3.3 Pago

| # | Caso | Esperado |
|---|---|---|
| P1 | Marcar pagado sin método | Rechazado |
| P2 | Marcar pagado sin responsable | Rechazado |
| P3 | Marcar pagado un pedido `recibido` | Rechazado (§4.3) |
| P4 | Marcar pagado un `cancelado` | Rechazado |
| P5 | Pagar con responsable “Otro” sin observación | Rechazado |
| P6 | Pagar con “Otro” + observación | Pasa, con alerta de validación pendiente |
| P7 | Leer un pedido antiguo con `pagado_efectivo` | Se muestra `pagado` + `efectivo` |
| P8 | Leer un pedido antiguo con `anulado` | Marcado para revisión, **sin inventar** un valor |

### 3.4 Catálogo

| # | Caso | Esperado |
|---|---|---|
| C1 | Producto con stock 0 | Se ve “Agotado”, no se puede agregar |
| C2 | Producto sin imagen | Se vende igual, con imagen genérica |
| C3 | Producto en `borrador` | No aparece en la tienda |
| C4 | Producto con `requiere_revision_precio` | No vendible |
| C5 | Granel de a 0,25 kg | Los incrementos del carrito son de 0,25 |
| C6 | Subir foto `Avena Integral.JPG` | Se renombra a `avena_integral_01.jpg` |

---

## 4. Verificación antes de cada commit

```bash
npm run lint
npm test
npm run build
```

**Nota sobre `npm run build` en este equipo:** puede fallar de forma intermitente
con `EBUSY: resource busy or locked, rmdir '.next\export'`. Es un bloqueo de
archivos de Windows/Dropbox sobre la carpeta `.next`, **no un error de código**: la
compilación y el chequeo de tipos ya terminaron cuando ocurre. Reintentar suele
bastar. Si molesta, pausar la sincronización de Dropbox mientras se compila.
