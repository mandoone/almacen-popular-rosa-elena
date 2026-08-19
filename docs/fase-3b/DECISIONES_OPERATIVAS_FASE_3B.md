# DECISIONES_OPERATIVAS_FASE_3B.md — Calendario, pedidos anticipados y modo presencial

> Documento de decisiones aprobadas para **FASE 3B**. Es diseño técnico y
> documental: **nada de lo aquí descrito está implementado**. No se tocó
> Google Sheets, Apps Script, Vercel ni `.env.local`.
> Fuente: respuestas del Almacén por WhatsApp (agosto 2026) + decisiones
> técnicas definidas por Omar a partir de esas respuestas.
> Relacionado: `docs/fase-3a/PENDIENTES_CAROLINA_NADIA.md` (P1 y P2, ahora
> respondidas), `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md`,
> `docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md`.

---

## 1. Respuestas recibidas del Almacén

Responden y cierran (parcialmente) **P1** y **P2** de
`PENDIENTES_CAROLINA_NADIA.md`, que estaban marcadas 🔴 Bloqueado.

### 1.1 Horario de apertura y retiro

- Apertura del almacén: **11:00 a 15:00 hrs**.
- El retiro de pedidos se hace en ese mismo horario.
- Sigue sin confirmarse si este horario es el mismo para **todas** las
  aperturas futuras o solo para las próximas informadas (ver pendiente
  correspondiente en `PENDIENTES_ALMACEN_FASE_3B.md`).

### 1.2 Cierre de pedidos online

- Respuesta textual del Almacén: **"jueves anterior a la apertura"**.
- **Decisión técnica (Omar):** el cierre se fija en **jueves anterior a la
  apertura, 23:59 hrs**, como valor por defecto.
- Este valor es la **regla base del sistema**, pero queda **editable por
  administradores** por apertura (ver §3).

### 1.3 Confirmación de pedidos

- **Solo administradores** pueden confirmar pedidos (pasar de `recibido` a
  `pendiente`/`listo`, según `MODELO_ESTADOS_PEDIDOS.md`).
- Esto resuelve en firme lo que P3 dejaba como "cualquier sesión admin" por
  falta de usuarios individuales: se mantiene admin-only, sin abrir el rol
  vendedor a confirmar. El rol vendedor (FASE 2, aún no iniciada) queda fuera
  de esta atribución mientras no exista.

### 1.4 Cancelación de pedidos

- **Solo administradores** pueden cancelar pedidos. Misma lógica que §1.3
  respecto de P4.

---

## 2. Decisiones técnicas nuestras (no dependen del Almacén)

Estos puntos **no se bloquean** esperando respuesta del Almacén: se definen,
se prueban en TEST y luego se muestran ya funcionando.

1. **Flujo de estados de pedidos** — ya definido y probado en
   `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md` (29 tests verdes en
   `tests/fase3a-estados.test.mjs`). Fase 3B no lo reabre.
2. **`entregado` y `cancelado` como estados finales** — ya es la decisión
   vigente (§3.2 de `MODELO_ESTADOS_PEDIDOS.md`). Se confirma para Fase 3B,
   sin cambios.
3. **Nombres iniciales de botones del panel admin** — a definir como parte
   de la UI de calendario y modo presencial (§3–§4). Placeholder, no bloquea.
4. **Modo demo del panel** — ya existe y quedó validado en Fase 3A; el
   calendario y el modo presencial deben poder probarse ahí antes de tocar
   backend real.
5. **Entorno TEST** — sigue siendo requisito previo a cualquier cambio
   productivo (T3 de `PENDIENTES_CAROLINA_NADIA.md`). El calendario y el
   modo presencial se prueban en TEST antes de producción, igual que el
   backend atómico de Fase 3A.
6. **Calendario editable de aperturas** — ver §3.
7. **Separación entre pedido anticipado y venta presencial** — ver §4.
8. **Modo presencial QR** — ver §4.
9. **Venta asistida por vendedor** — ver §4.
10. **Comanda papel como respaldo** — ver §4. No se elimina el papel.

---

## 3. Calendario editable de aperturas

**Decisión aprobada.** El sistema debe tener un calendario editable de
aperturas administrado desde el panel `/admin`.

### 3.1 Datos por apertura

Cada apertura del calendario debe poder registrar:

| Campo | Descripción |
|---|---|
| `fecha` | Día de la apertura |
| `hora_inicio` | Hora de inicio (por defecto 11:00, editable) |
| `hora_fin` | Hora de término (por defecto 15:00, editable) |
| `lugar` | Dirección o punto de retiro |
| `cierre_pedidos_anticipados` | Fecha y hora en que se cierran los pedidos online (por defecto jueves anterior 23:59) |
| `estado_apertura` | Estado operativo de esa fecha (ver §3.3) |
| `modo_presencial_qr` | Activado / desactivado para esa apertura |
| `mensaje_publico` | Texto que ve la web pública sobre esta apertura |
| `observaciones_internas` | Notas solo visibles en el panel admin |

### 3.2 Regla base y excepciones

- **Regla base:** cierre de pedidos anticipados = jueves anterior a la
  apertura, 23:59 hrs (§1.2).
- El administrador puede:
  - editar ese cierre por apertura;
  - crear aperturas especiales;
  - abrir en otro día de la semana;
  - agregar domingos o feriados;
  - cancelar una apertura ya publicada;
  - cerrar pedidos manualmente antes de la fecha de cierre;
  - reabrir pedidos por excepción, ya cerrado el plazo;
  - activar o desactivar el modo presencial QR por apertura.

### 3.3 Estados públicos de la web según calendario

La web pública **no se apaga**. Cambia de modo según el calendario:

1. **Pedido anticipado activo** — antes del cierre configurado.
2. **Pedido anticipado cerrado** — cerrado el plazo, apertura aún no ocurre.
3. **Modo presencial activo** — durante el horario de la apertura, si
   `modo_presencial_qr` está activado.
4. **Apertura cerrada** — fuera de horario, sin apertura próxima activa.
5. **Próxima fecha por confirmar** — sin apertura vigente publicada.

### 3.4 Relación con el diseño existente

`COLUMNAS_SHEETS_PROPUESTAS.md` §6 ya proponía una hoja `APERTURAS` con
`fecha`, `hora_inicio`, `hora_fin`, `cierre_pedidos_online`, `activa` y
`observaciones`, bloqueada por falta de respuesta. Esa base sigue siendo
válida; el calendario de Fase 3B la **amplía** con `lugar`,
`estado_apertura`, `modo_presencial_qr`, `mensaje_publico` y
`observaciones_internas`. Actualizar esa sección de columnas propuestas
queda como paso técnico pendiente (ver §6).

---

## 4. Modo presencial digital

**Decisión aprobada.** La comanda en papel **no desaparece todavía**: se
mantiene como respaldo y método alternativo. Durante la apertura, la web
puede ofrecer un modo presencial digital adicional.

### 4.1 Flujo del modo presencial QR

1. La persona llega al almacén.
2. Escanea un QR.
3. Se abre la tienda en modo presencial (variante de la tienda normal).
4. Arma su comanda digital.
5. Envía la solicitud.
6. Un vendedor o administrador la revisa.
7. Se confirma, se cobra y se entrega.
8. Se descuenta stock (mismo modelo de `MODELO_ESTADOS_PEDIDOS.md`).
9. Queda registrado para caja y cierre del día.

### 4.2 Si la persona no usa celular

- Puede llenar la comanda en papel, o
- pedir atención directa;
- el vendedor o administrador ingresa la venta manualmente en el sistema.

### 4.3 Orígenes de pedido a distinguir

El sistema debe poder distinguir el canal de cada pedido:

- `online_anticipado`
- `presencial_qr`
- `presencial_vendedor`
- `comanda_papel`

Este campo es nuevo respecto del `canal` que ya existe hoy en `PEDIDOS`
(`docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` §1) y debe diseñarse en
conjunto con esa hoja antes de implementar.

---

## 5. Alcance de Fase 3B

**Fase 3B — Calendario de aperturas, pedidos anticipados y modo presencial**

**Objetivo:** diseñar la operación flexible de aperturas y separar el
pedido anticipado de la venta presencial.

**Incluye:**

- Calendario editable de aperturas (§3).
- Cierre configurable de pedidos anticipados (§3.2).
- Modo presencial QR (§4.1).
- Venta asistida por vendedor/admin (§4.2).
- Comanda papel como respaldo, no reemplazada (§4.2).
- Estados públicos de la web según calendario (§3.3).
- Permisos de administrador para confirmar/cancelar y gestionar el
  calendario (§1.3, §1.4, §3.2).
- Pendientes del Almacén que condicionan contenido y catálogo — ver
  `PENDIENTES_ALMACEN_FASE_3B.md`.
- Próximos pasos técnicos antes de implementar (§6).

**No incluye (fuera de alcance de Fase 3B):**

- Implementación de código, cambios en Google Sheets, Apps Script o Vercel.
- Rol vendedor con login propio (sigue en FASE 2 del backlog, `TASKS.md`).
- Migración del backend atómico de Fase 3A (sigue su propio plan en
  `docs/fase-3a/PLAN_IMPLEMENTACION_FASE_3A.md`).

---

## 6. Próximos pasos técnicos antes de implementar

1. Diseñar el modelo de datos del calendario (hoja `APERTURAS` ampliada,
   ver §3.4) sin tocar la Sheet real todavía.
2. Diseñar el campo de origen de pedido (`online_anticipado` /
   `presencial_qr` / `presencial_vendedor` / `comanda_papel`) junto con las
   columnas nuevas ya propuestas para `PEDIDOS` en
   `docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md`.
3. Definir la máquina de estados públicos de la web (§3.3) como función pura,
   siguiendo el mismo patrón que `src/lib/fase3a/estados.ts`.
4. Definir el contrato del modo presencial QR (qué ve el cliente, qué ve el
   vendedor/admin) antes de tocar UI.
5. Probar calendario y modo presencial en modo demo local, igual que se hizo
   con el panel admin de Fase 3A.
6. Resolver primero el entorno TEST de Fase 3A (`docs/fase-3a/PENDIENTES_CAROLINA_NADIA.md`
   T3) — Fase 3B se prueba sobre la misma base, no sobre producción.
7. Actualizar `docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` §6 con el diseño
   ampliado de `APERTURAS` una vez validado este documento.
