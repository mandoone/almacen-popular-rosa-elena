# GOOGLE_SHEET_SETUP.md — Crear la base de datos operativa

Guía para crear, de forma automática, la **Google Sheet operativa** del sistema web
del Almacén Popular Rosa Elena Morales.

- **Script:** `scripts/setup-google-sheet.gs`
- **Planilla resultante:** `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`
- **Decisión asociada:** D5 en `docs/DECISIONS.md` (Sheet nueva y exclusiva).
- **Modelo de datos:** `docs/DATA_MODEL.md`.

> Esta planilla es la **fuente oficial** futura de productos, pedidos, ventas,
> clientes, stock, compras, movimientos de stock y configuración. Se crea **una sola
> vez**.

---

## Pasos

1. Abrir **https://script.google.com/** con la cuenta de Google que será **dueña**
   de la base de datos (idealmente la cuenta del proyecto, no una personal externa).
2. Crear un **proyecto nuevo** (botón *Nuevo proyecto*).
3. Borrar el contenido del archivo `Código.gs` que viene por defecto y **pegar todo**
   el contenido de `scripts/setup-google-sheet.gs`.
4. Guardar el proyecto (icono de disquete o `Ctrl+S`).
5. En el selector de funciones (arriba), elegir **`crearBaseDatosAlmacen`** y pulsar
   **Ejecutar**.
6. **Autorizar permisos** cuando lo solicite:
   - Google pedirá permiso para gestionar tus hojas de cálculo.
   - Si aparece "Google no verificó esta app", entrar en
     *Configuración avanzada → Ir a (nombre del proyecto)* y continuar. Es tu propio
     script, no una app de terceros.
7. Abrir el **registro de ejecución**: menú **Ver → Registros** (o `Ctrl+Enter`).
   Verás algo como:
   ```
   Planilla creada: BD_WEB_ALMACEN_ROSA_ELENA_MORALES
   ID:  1AbC...XYZ
   URL: https://docs.google.com/spreadsheets/d/1AbC...XYZ/edit
   ```
8. **Copiar la URL** (para abrir la planilla) y, sobre todo, **el ID**.
9. **Guardar el ID** en un lugar seguro: se usará en **FASE 1** para que la web lea y
   escriba pedidos. ⚠️ El ID **no** se commitea al repositorio; se manejará como
   configuración/variable de entorno cuando llegue FASE 1.

---

## Qué crea el script

Una planilla con **10 hojas**, cada una con sus encabezados en la fila 1:

`CONFIG` · `PRODUCTOS` · `CLIENTES` · `PEDIDOS` · `DETALLE_PEDIDOS` · `VENTAS` ·
`DETALLE_VENTAS` · `COMPRAS` · `DETALLE_COMPRAS` · `MOVIMIENTOS_STOCK`

En cada hoja:
- Encabezados en negrita, fondo morado (`#3B0764`) y texto blanco.
- **Fila 1 congelada**.
- Ancho de columnas ajustado (mínimo legible).

Además:
- **Validaciones de lista** (desplegables) en columnas clave: `activo`, `prioridad`,
  `unidad_medida`, `permite_decimal` (PRODUCTOS); `estado_pedido`, `estado_pago`,
  `forma_pago` (PEDIDOS); `forma_pago`, `estado_pago` (VENTAS); `tipo`, `origen`
  (MOVIMIENTOS_STOCK).
- **CONFIG precargada** con las claves del proyecto (`whatsapp_pedidos`,
  `whatsapp_contacto`, `margen_default_pct`, `proxima_apertura`, `banco_aportes`,
  `cuenta_aportes`, `titular_aportes`, `rut_aportes`, `email_contacto`,
  `mensaje_home`) con **valores vacíos**, listos para completar a mano.

---

## Después de crear la planilla

1. Completar los valores de la hoja **CONFIG** (WhatsApp, margen, datos de aportes,
   etc.). El script los deja vacíos a propósito: **no se guardan secretos en el repo**.
2. Verificar que las 10 hojas existen y que los desplegables funcionan.
3. Anotar el **ID** para FASE 1 (ver `docs/TASKS.md`).

---

## Notas

- El script **no usa credenciales ni secretos**. Toda la autorización ocurre dentro
  de tu cuenta de Google al ejecutarlo.
- Si ejecutas `crearBaseDatosAlmacen` **otra vez**, se crea **una planilla nueva**
  distinta (no modifica ni borra la anterior). Conserva solo el ID de la planilla
  correcta.
- Es seguro re-ejecutarlo si algo salió mal: simplemente descarta la planilla
  sobrante.
