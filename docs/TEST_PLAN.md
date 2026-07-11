# TEST_PLAN.md — Plan de pruebas manuales

> Pruebas manuales del sistema. Cada caso: **pasos → resultado esperado**. Se amplía
> al avanzar cada fase. Funcionalidades actuales en `docs/PROJECT_STATE.md`.

---

## 1. Pruebas actuales (estado vigente)

### T1 — Catálogo carga desde Google Sheets
1. Abrir `/tienda`.
2. Esperar la carga.
- ✅ Esperado: se listan productos con nombre y precio tomados del CSV de Sheets.
- ⚠️ Si el CSV cambia de formato, el catálogo puede quedar vacío (parser frágil).

### T2 — Carrito
1. En `/tienda`, agregar varios productos.
2. Aumentar/reducir cantidades y vaciar.
- ✅ Esperado: el total y el contador se actualizan; el carrito persiste al recargar
  (guardado en `localStorage`).

### T3 — Buscador
1. Escribir parte de un nombre en el buscador.
- ✅ Esperado: se filtran los productos coincidentes; mensaje si no hay resultados.

### T4 — Envío de pedido por WhatsApp
1. Con productos en el carrito, ingresar nombre y teléfono.
2. Pulsar "Enviar pedido por WhatsApp".
- ✅ Esperado: se abre `wa.me` con el mensaje pre-armado (lista, total, datos).
- ⚠️ Limitación conocida: el pedido se guarda solo en `localStorage` del dispositivo.

### T5 — Panel admin (estado actual)
1. Abrir `/admin`, ingresar contraseña.
2. Ver, filtrar, editar y cambiar estado de pedidos.
- ✅ Esperado: funciona sobre los pedidos del **mismo navegador**.
- 🔴 Limitación: NO muestra pedidos hechos por clientes en otros dispositivos.

---

## 2. Pruebas futuras — FASE 1 (pedidos reales)

> A ejecutar cuando exista la Google Sheet operativa + Apps Script.

### T6 — Pedido se guarda en Google Sheets
1. Hacer un pedido desde la tienda.
- ✅ Esperado: aparece una fila nueva en la hoja `PEDIDOS` (y líneas en
  `DETALLE_PEDIDOS`) de la Sheet operativa.

### T7 — Pedido desde celular visible en admin (multidispositivo)
1. Hacer un pedido **desde un celular**.
2. Abrir `/admin` desde **otro dispositivo** (PC).
- ✅ Esperado: el pedido del celular aparece en `/admin` del PC.

### T8 — Admin lee pedidos reales
1. Con varios pedidos en la Sheet, abrir `/admin`.
- ✅ Esperado: se listan todos los pedidos reales, no los de `localStorage`.

### T9 — Cambio de estado persiste en backend
1. En `/admin`, marcar un pedido como "listo" y luego "entregado".
2. Recargar / abrir desde otro dispositivo.
- ✅ Esperado: el estado actualizado persiste en la Sheet y se ve igual en cualquier
  dispositivo.

---

## 3. Pruebas futuras — Stock (FASE 3)

### T10 — Stock reservado al pedir
1. Crear un pedido de un producto con stock conocido.
- ✅ Esperado: se genera un movimiento `reserva` en `MOVIMIENTOS_STOCK`; el stock
  disponible disminuye sin registrarse como venta.

### T11 — Stock devuelto al cancelar
1. Cancelar un pedido previamente reservado.
- ✅ Esperado: se genera un movimiento `devolucion`; el stock vuelve a su valor
  anterior.

### T12 — Precio de venta y redondeo
1. Definir un producto con costo y margen.
- ✅ Esperado: `precio_venta = costo × (1 + margen)` redondeado **hacia arriba al
  múltiplo de $10** (ver `docs/DATA_MODEL.md`).

---

## Notas

- Estas son pruebas **manuales**; no hay suite automatizada (coherente con el arnés
  liviano, ver `docs/DECISIONS.md`).
- Antes de cada apertura real conviene ejecutar T1–T9 como checklist mínima.

---

## 4. Pruebas manuales — Sistema documental

### TD1 — Metadata completa
1. Abrir el Markdown fuente.
2. Verificar `DOCUMENTO`, `VERSION`, `FECHA`, `ESTADO`, `FUENTE` y `TIPO_INFORME`.
- ✅ Esperado: todos los campos existen y usan valores permitidos por ADS-002.

### TD2 — Integridad del HTML
1. Generar el HTML desde el template correspondiente.
2. Buscar marcadores `{{...}}`.
3. Abrir el HTML desde `reports/html/<tipo>/`.
- ✅ Esperado: no quedan placeholders y cargan `almacen.css`, `reports.css` y logo.

### TD3 — Comparación visual
1. Comparar portada, ficha, tarjetas, fases, badges, tablas y síntesis con los
   pilotos v0.2 aprobados.
- ✅ Esperado: mantiene identidad y estructura documental; no parece landing page.

### TD4 — Impresión A4
1. Abrir vista previa de impresión con fondos activados, escala 100 % y sin
   encabezados/pies del navegador.
2. Revisar saltos, tablas largas, fases y síntesis.
- ✅ Esperado: contenido legible, sin cortes críticos ni desbordamiento horizontal.

### TD5 — Ausencia de secretos
1. Buscar tokens, credenciales, valores de variables e IDs privados.
- ✅ Esperado: solo aparecen nombres de variables; ningún valor sensible.
