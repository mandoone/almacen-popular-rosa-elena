# REQUIREMENTS.md — Requerimientos consolidados

> Requisitos del proyecto por perfil y por fase. Para el estado actual ver
> `docs/PROJECT_STATE.md`; para tareas concretas ver `docs/TASKS.md`.

---

## Objetivo general

Permitir que los vecinos de la Población Juan Antonio Ríos accedan al catálogo del
Almacén Popular, hagan pedidos online y los retiren los sábados de apertura,
operando el sistema de forma simple, gratuita y sin fines de lucro.

---

## Perfiles de usuario

| Perfil | Descripción | Necesidades principales |
|--------|-------------|-------------------------|
| **Comprador** | Vecino/a que hace pedidos desde su celular. | Ver catálogo y precios, armar carrito, enviar pedido, recibir confirmación. |
| **Vendedor** | Voluntario/a que atiende durante la apertura. | Ver pedidos del día, preparar y entregar, registrar ventas. (FASE 2) |
| **Administrador** | Coordina el almacén. | Ver todos los pedidos, gestionar productos/precios/stock, ver reportes. |

---

## Requisitos funcionales por fase

### FASE 0 — Documentación viva
- RF-0.1 Estructura de documentación (`AGENTS.md` + `docs/`).
- RF-0.2 Estado, requisitos, modelo de datos, tareas, decisiones, pruebas y
  changelog consolidados.

### FASE 1 — Pedidos reales (PRIORIDAD)
- RF-1.1 Los pedidos se almacenan en una Google Sheet operativa, no en `localStorage`.
- RF-1.2 El cliente envía su pedido y queda registrado en el backend (Apps Script).
- RF-1.3 El panel `/admin` lee los pedidos reales, visibles desde cualquier dispositivo.
- RF-1.4 El admin puede cambiar el estado de un pedido (pendiente → listo → entregado)
  y que el cambio persista en el backend.
- RF-1.5 Mantener el aviso/confirmación al cliente (WhatsApp como canal de contacto).

### FASE 2 — Panel vendedor
- RF-2.1 Vista separada para vendedores (rol distinto de administrador).
- RF-2.2 Listado de pedidos del día con estados operables durante la apertura.

### FASE 3 — Productos, precios y stock
- RF-3.1 Gestión de productos desde la Google Sheet operativa.
- RF-3.2 Precio de venta calculado desde costo + margen, con redondeo (ver
  `docs/DATA_MODEL.md`).
- RF-3.3 Control de stock (existencias, reserva al pedir, devolución al cancelar).

### FASE 4 — Compras y abastecimiento
- RF-4.1 Registro de compras a proveedores.
- RF-4.2 Movimientos de stock por entrada de mercadería.

### FASE 5 — Caja y reportes
- RF-5.1 Registro de ventas y caja.
- RF-5.2 Reportes básicos (ventas, pedidos, stock).

---

## Requisitos no funcionales

- RNF-1 **Costo cero / bajo:** apoyarse en Google Sheets + Apps Script, sin
  infraestructura de pago.
- RNF-2 **Simplicidad operativa:** usable por voluntarios sin perfil técnico.
- RNF-3 **Operable en apertura real:** disponible desde celular, datos compartidos
  entre dispositivos.
- RNF-4 **Mantenibilidad:** documentación viva mínima, datos centralizados en la
  Google Sheet operativa.
- RNF-5 **Seguridad razonable:** no exponer secretos; evitar credenciales en el
  cliente (a resolver en FASE 1+).

---

## Fuera de alcance (por ahora)

- ❌ **Pagos online (Webpay / Mercado Pago / transferencia integrada).** El pago se
  realiza presencialmente al retirar. Se podrá reevaluar en una fase futura.
- ❌ App móvil nativa.
- ❌ Logística de despacho a domicilio.
