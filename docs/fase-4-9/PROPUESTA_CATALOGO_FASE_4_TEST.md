# Propuesta de catálogo normalizado — Fase 4 TEST

> Auditoría read-only realizada el 2026-09-14. Fuente: pestaña `PRODUCTOS` de
> `TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES`, rango acotado `A1:Z100`.
> No autoriza cambios en TEST ni en producción.

## Resultado objetivo

- 54 filas analizadas: 53 productos del catálogo y `PROD-TEST-DECIMAL`.
- 0 IDs inválidos o duplicados.
- 0 nombres exactamente duplicados o iguales tras normalizar mayúsculas,
  tildes, espacios y puntuación.
- 0 estados, prioridades, unidades, reglas decimales, precios de venta o stocks
  con formato inválido.
- 32 filas usan `alimentos`, 16 `limpieza` y 6 `higiene`; ninguna usa `granel`.
- 53 filas usan `unidad`; solo el fixture usa `kg`, decimal `SI` y paso `0.1`.
- 54 costos y márgenes vacíos; 54 mínimos en cero; 54 prioridades `media`.
- 48 filas tienen stock exactamente `100`, señal de datos TEST/importados que
  no deben confundirse con un conteo físico.
- 54 `imagen_url` vacíos; el repositorio no contiene assets de producto. Drive
  conserva 45 JPEG con nombres de WhatsApp, todavía sin identificación ni
  aprobación.
- Precios de venta positivos en las 54 filas. Requieren verificación puntual
  los extremos `$100`, `$120` y `$9.700`; no se declara que sean erróneos.

## Paquete de decisiones

### DECISIÓN F4-01 — Modelo de venta de productos a granel

**Problema:** los 19 productos informados como granel están hoy en categoría
`alimentos`, unidad `unidad`, decimal `NO` y paso `1`.

**Evidencia:** el Almacén informó presentaciones de 500 g / 1 kg, 250 g y 100 g;
el levantamiento técnico anterior propone venta por peso con paso base 0,25 kg.
Son dos modelos diferentes y no deben mezclarse automáticamente.

**Opciones:**

A. Mantener cada envase/presentación como una unidad fija.
B. Vender por peso, con `kg`, decimal `SI` y paso por producto.
C. Modelo mixto, decidiendo por producto.

**RECOMENDACIÓN DE CODEX:** A mientras no se confirme que la operación pesa el
producto al vender. Es la opción conservadora y coincide con el catálogo actual.

**Impacto:** define unidad, paso, precio y stock para compras y ventas.

**Productos afectados:** `PROD-001`–`PROD-019`.

**BLOQUEA_F7:** sí.

### DECISIÓN F4-02 — Taxonomía de categorías

**Problema:** la fuente confirmada menciona `Granel`, `Alimento` e `Higiene`,
pero TEST distingue `limpieza` e `higiene` y no usa `granel`.

**Opciones:**

A. Tres categorías: Granel, Alimentos e Higiene, absorbiendo Limpieza.
B. Cuatro categorías: Granel, Alimentos, Limpieza e Higiene.
C. Mantener temporalmente las tres etiquetas actuales.

**RECOMENDACIÓN DE CODEX:** B. Los 16 productos de limpieza y los 6 de higiene
forman grupos operativos claros; el código puede conservar aliases históricos.

**Impacto:** filtros y reportes. No cambia precios ni stock.

**Productos afectados:** todo el catálogo comercial (`PROD-001`–`PROD-053`).

**BLOQUEA_F7:** no.

### DECISIÓN F4-03 — Unidad técnica y presentación comercial

**Problema:** 53 productos usan `unidad`, aunque la fuente describe `PAQUETE`,
`ENVASE`, `MANGA`, `ROLLO`, `ML` y `KILO`. El esquema validado solo admite
`unidad`, `kg`, `litro` y `pack`.

**Opciones:**

A. Usar `unidad` para toda presentación fija y conservar tamaño/formato en el nombre.
B. Ampliar el vocabulario con envase, manga y rollo.
C. Usar `pack` para toda presentación agrupada y `unidad` para el resto.

**RECOMENDACIÓN DE CODEX:** C, manteniendo tamaños en el nombre. No usar `ML`
como unidad seleccionable: 250 ml o 500 ml describen un envase, no una venta
fraccionada.

**Impacto:** trazabilidad de compras y comprensión de cantidades.

**Productos afectados:** `PROD-020`–`PROD-053`; los primeros 19 dependen además
de F4-01.

**BLOQUEA_F7:** sí.

### DECISIÓN F4-04 — Nombres y variantes heredadas

**Problema:** el catálogo TEST y el listado posterior del Almacén difieren en
marcas, tildes, tamaños o nombres. No existen duplicados internos actuales.

**Opciones:**

A. Conservar el nombre actual de TEST.
B. Sustituirlo por el nombre informado después.
C. Crear productos separados si son marcas/presentaciones distintas.

**RECOMENDACIÓN DE CODEX:** A por defecto; elegir C solo cuando físicamente
existan dos SKUs. Los IDs actuales preservan ventas y movimientos históricos.

**Impacto:** editorial y trazabilidad; no se deben fusionar IDs.

**Productos afectados:** `PROD-020`, `PROD-021`, `PROD-028`, `PROD-030`,
`PROD-032`, `PROD-035`, `PROD-037`, `PROD-039`, `PROD-040`, `PROD-042`,
`PROD-046`, `PROD-048`, `PROD-050` y `PROD-052`.

**BLOQUEA_F7:** no, salvo que una variante sea realmente un SKU adicional.

### DECISIÓN F4-05 — Precio costo y margen

**Problema:** `precio_costo` y `margen_pct` están vacíos en las 54 filas.

**Opciones:**

A. Cargar costo actual y dejar margen informativo vacío.
B. Cargar costo y margen objetivo, manteniendo aprobación manual del precio público.
C. Esperar a la primera compra y registrar el costo en ese flujo.

**RECOMENDACIÓN DE CODEX:** C para el historial y A como carga inicial cuando
exista una factura vigente. Nunca recalcular automáticamente el precio público.

**Impacto:** presupuesto, propuesta de abastecimiento y evolución de costos.

**Productos afectados:** `PROD-001`–`PROD-053`; el fixture queda excluido de
decisiones comerciales.

**BLOQUEA_F7:** sí para propuestas por presupuesto; no para registrar una compra.

### DECISIÓN F4-06 — Stock físico y stock mínimo

**Problema:** 48 filas tienen stock `100` y las 54 tienen mínimo `0`. Los stocks
91/98/99 y 5.5 reflejan pruebas TEST, no un inventario físico confirmado.

**Opciones:**

A. Realizar un conteo y cargar stock y mínimo por producto.
B. Confirmar stock físico ahora y definir mínimos después.
C. Mantener TEST como datos sintéticos y no usar alertas de reposición todavía.

**RECOMENDACIÓN DE CODEX:** C en TEST hasta contar con una fuente aprobada; para
la operación real, A. `stock_actual` debe corregirse mediante movimiento
auditado, nunca mediante edición masiva silenciosa.

**Impacto:** disponibilidad, alertas y propuesta de compra.

**Productos afectados:** `PROD-001`–`PROD-053`.

**BLOQUEA_F7:** sí para una propuesta real de abastecimiento; no para probar el flujo.

### DECISIÓN F4-07 — Prioridad de abastecimiento

**Problema:** las 54 filas usan el valor importado `media`.

**Opciones:**

A. Clasificar alta/media/baja por producto.
B. Definir reglas objetivas por rotación, esencialidad y tiempo de reposición.
C. Mantener todas en media y ordenar solo por faltante.

**RECOMENDACIÓN DE CODEX:** B y luego aplicar A en lote. Evita decisiones
arbitrarias y permite revisar excepciones.

**Impacto:** orden de la propuesta de abastecimiento.

**Productos afectados:** `PROD-001`–`PROD-053`.

**BLOQUEA_F7:** sí para priorización útil; no para registrar compras.

### DECISIÓN F4-08 — Productos activos y precios extremos

**Problema:** los 53 productos comerciales están activos. No existe evidencia
actual de cuáles siguen disponibles ni de si los precios extremos fueron
reconfirmados.

**Opciones:**

A. Confirmar en bloque que el catálogo completo sigue activo y revisar solo excepciones.
B. Desactivar preventivamente los productos no verificados.
C. Revisar activo/inactivo uno por uno.

**RECOMENDACIÓN DE CODEX:** A: pedir una lista corta de bajas y confirmar
puntualmente `PROD-017`, `PROD-034`, `PROD-049` y `PROD-050` por sus precios
extremos. Conservar los demás precios hasta recibir una corrección explícita.

**Impacto:** catálogo vendible y productos considerados por abastecimiento.

**Productos afectados:** `PROD-001`–`PROD-053`; revisión puntual de precios en
`PROD-017`, `PROD-034`, `PROD-049` y `PROD-050`.

**BLOQUEA_F7:** sí para decidir qué productos incluir en una propuesta real.

### DECISIÓN F4-09 — Fotografías, asociación y derechos

**Problema:** hay 45 JPEG de WhatsApp sin identificación estable, 54 filas sin
`imagen_url` y cero assets de producto en el repositorio.

**Opciones:**

A. Identificar y aprobar las 45 fotos existentes, luego asociarlas por ID.
B. Solicitar un set nuevo siguiendo la pauta documentada.
C. Mantener placeholders y publicar imágenes gradualmente.

**RECOMENDACIÓN DE CODEX:** C mientras se ejecuta A. La ausencia de foto no
debe bloquear catálogo, compras ni stock. Antes de publicar se deben confirmar
selección, derecho de uso y crédito si corresponde.

**Impacto:** presentación y accesibilidad. El alt actual se deriva del nombre y
el placeholder tiene etiqueta accesible.

**Productos afectados:** 54 filas; 45 originales disponibles por identificar.

**BLOQUEA_F7:** no.

## Propuesta por producto

Leyenda: `*` requiere la decisión indicada. `venta/costo` conserva el precio de
venta conocido; el costo sigue pendiente. `stock/mínimo` muestra los valores
TEST observados, no un conteo físico.

| ID | Nombre recomendado | Categoría propuesta | Unidad / decimal / paso | Venta / costo | Stock / mínimo | Prioridad | Imagen | Estado |
|---|---|---|---|---:|---:|---|---|---|
| PROD-001 | Arroz | Granel* | definir F4-01 | 1320 / — | 91 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-002 | Arroz integral | Granel* | definir F4-01 | 1900 / — | 99 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-003 | Avena Integral | Granel* | definir F4-01 | 1200 / — | 99 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-004 | Carne vegetal | Granel* | definir F4-01 | 2000 / — | 99 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-005 | Garbanzos | Granel* | definir F4-01 | 2650 / — | 98 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-006 | Harina | Granel* | definir F4-01 | 900 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-007 | Harina Integral | Granel* | definir F4-01 | 1100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-008 | Lentejas | Granel* | definir F4-01 | 2400 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-009 | Poroto blanco | Granel* | definir F4-01 | 2650 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-010 | Poroto burro | Granel* | definir F4-01 | 3000 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-011 | Quínoa | Granel* | definir F4-01 | 4200 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-012 | Sal de Cáhuil | Granel* | definir F4-01 | 800 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-013 | Mote | Granel* | definir F4-01 | 1900 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-014 | Té (250 grs) | Granel* | definir F4-01 | 2100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-015 | Pimienta (100 grs) | Granel* | definir F4-01 | 1350 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-016 | Ají de color (100 grs) | Granel* | definir F4-01 | 660 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-017 | Bicarbonato (100 grs)* | Granel* | definir F4-01 | 100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-018 | Orégano (100 grs) | Granel* | definir F4-01 | 650 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-019 | Aliño completo | Granel* | definir F4-01 | 880 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-020 | Aceite Oliva Vor 250 ml* | Alimentos | unidad* / NO / 1 | 2000 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-021 | Aceite Oliva Vor 500 ml* | Alimentos | unidad* / NO / 1 | 3300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-022 | Aceite Natura | Alimentos | unidad* / NO / 1 | 2200 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-023 | Aceite vegetal | Alimentos | unidad* / NO / 1 | 1700 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-024 | Azúcar | Alimentos | unidad* / NO / 1 | 800 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-025 | Tallarines Parma | Alimentos | pack* / NO / 1 | 600 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-026 | Fideos Parma | Alimentos | pack* / NO / 1 | 600 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-027 | Sal | Alimentos | unidad* / NO / 1 | 300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-028 | Salsa de tomate Toddo* | Alimentos | pack* / NO / 1 | 300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-029 | Tallarines Luchetti | Alimentos | pack* / NO / 1 | 800 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-030 | Fideos Luchetti* | Alimentos | pack* / NO / 1 | 800 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-031 | Cloro gel Igenix | Limpieza* | unidad* / NO / 1 | 1200 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-032 | Cloro gel Excell* | Limpieza* | unidad* / NO / 1 | 1100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-033 | Cloro 1 L | Limpieza* | unidad* / NO / 1 | 650 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-034 | Manga Swan* | Limpieza* | pack* / NO / 1 | 9700 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-035 | Papel Higienico 6u Swan* | Higiene* | pack* / NO / 1 | 1400 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-036 | Detergente 5L | Limpieza* | unidad* / NO / 1 | 1300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-037 | Detergente 5L con suavi* | Limpieza* | unidad* / NO / 1 | 1750 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-038 | Detergente concentrado | Limpieza* | unidad* / NO / 1 | 1750 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-039 | Jabón 1L* | Higiene* | unidad* / NO / 1 | 1250 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-040 | Lavaloza Fuzol* | Limpieza* | unidad* / NO / 1 | 1100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-041 | Pasta Pepsodent (90 g) | Higiene* | unidad* / NO / 1 | 750 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-042 | Toalla Nova x3* | Limpieza* | pack* / NO / 1 | 900 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-043 | Toalla Tork | Limpieza* | pack* / NO / 1 | 1400 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-044 | Desinfectante suelo (Todos) | Limpieza* | unidad* / NO / 1 | 1150 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-045 | Servilletas (300u) | Limpieza* | pack* / NO / 1 | 1000 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-046 | Shampoo Ballerina* | Higiene* | unidad* / NO / 1 | 1300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-047 | Bálsamo Ballerina | Higiene* | unidad* / NO / 1 | 1300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-048 | Limpiador crema* | Limpieza* | unidad* / NO / 1 | 1400 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-049 | Paños Amarillos* | Limpieza* | unidad* / NO / 1 | 100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-050 | Esponjas* | Limpieza* | unidad* / NO / 1 | 120 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-051 | Afeitadora desechable | Higiene* | unidad* / NO / 1 | 500 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-052 | B. de basura 70x90 VIRUTEX* | Limpieza* | unidad* / NO / 1 | 1100 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-053 | PAN DE MASA MADRE | Alimentos | unidad* / NO / 1 | 3300 / — | 100 / 0* | media* | pendiente | REQUIERE_DECISIÓN |
| PROD-TEST-DECIMAL | Producto decimal TEST | TEST (no comercial) | kg / SI / 0.1 | 1000 / — | 5.5 / 0 | media | pendiente | APROBABLE_AUTOMÁTICAMENTE |

## Aplicación segura después de la aprobación

No existe hoy un endpoint de escritura masiva de productos y no se agregó uno
durante esta auditoría. La preparación segura queda así:

1. Convertir solo las decisiones aprobadas a un JSON con `entorno`,
   `sheet_nombre`, `decision_id`, `id_producto`, valores `esperado` y `propuesto`.
2. Validar localmente el archivo con:

   ```powershell
   $env:NEXT_PUBLIC_APP_ENV='test'
   npm.cmd run catalogo:test:validar-plan -- .\ruta\plan-aprobado.json
   ```

   El validador no usa red, bloquea configuración productiva genérica y no
   admite `stock_actual`.
3. Identificar nuevamente por título exacto la Sheet TEST y crear una copia de
   respaldo antes de escribir. No registrar su ID en el repositorio.
4. Leer encabezados, validaciones y valores actuales de las filas afectadas.
   Resolver filas por `id_producto`, nunca por una posición guardada.
5. Abortar si cualquier valor actual difiere de `esperado` o si aparece un ID
   duplicado, una validación incompatible o un destino ambiguo.
6. Aplicar un lote acotado solo a los campos aprobados. Los cambios de
   `stock_actual` se hacen mediante movimiento de ajuste con motivo y
   responsable, nunca como edición directa del catálogo.
7. Releer las filas, ejecutar la auditoría F4, probar `/tienda` y
   `/admin/vendedor`, y comprobar reglas decimal/entero e imágenes.
8. Si falla la verificación, restaurar únicamente los campos del lote desde el
   snapshot previo; no borrar movimientos ni evidencia histórica.
9. Documentar resultados y recién entonces preparar commit/push de código o
   documentación. Producción requiere un Go/No-Go independiente.

## Dependencias con Fase 7 y Fase 8

- Bloquean una propuesta real de abastecimiento: F4-01, F4-03, F4-05, F4-06,
  F4-07 y la confirmación de activos de F4-08.
- No bloquean registrar compras en TEST: imágenes, nombres editoriales y orden
  visual de categorías.
- No bloquean Fase 8 técnica: F4-02, F4-04 y F4-09; sí limitan la utilidad de
  reportes reales los mínimos, prioridades y costos pendientes.
