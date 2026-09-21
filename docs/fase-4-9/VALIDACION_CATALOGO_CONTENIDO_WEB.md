# Validación de catálogo y contenido web — Fases 4 y 9

> **Actualización 2026-09-21:** el inventario y las decisiones vigentes de F9
> fueron consolidados en [`../GO_NO_GO_FASE_9_10.md`](../GO_NO_GO_FASE_9_10.md).
> Este archivo conserva la evidencia histórica F4 y no debe usarse como estado
> actual de F7/F8 ni como autorización productiva.

> Checklist de revisión con el Almacén. Mantiene la numeración del plan
> original: Fase 4 corresponde a productos, stock, precios e imágenes; Fase 9,
> a contenido público, historia y comunidad. No autoriza cambios en datos ni en
> producción.

## Diagnóstico del bloque

### Qué ya existía

- Catálogo real servido desde `PRODUCTOS`, con búsqueda, carrito y fallback de
  imagen.
- Metadatos disponibles en servidor para categoría, unidad, venta decimal,
  paso de venta e imagen; la respuesta de la tienda no los mostraba.
- Portada y páginas separadas para historia, Rosa Elena y participación.
- Calendario TEST validado y siete fechas de apertura confirmadas para 2026.

### Qué se preparó sin cambiar datos operativos

- Categorías visibles con nombres largos: `Productos a granel`, `Abarrotes
  envasados` y `Productos de higiene`.
- Filtro flexible que reconoce las etiquetas actuales de la Sheet y conserva
  cualquier categoría desconocida tal como llega.
- Señales de categoría, granel y unidad de venta; placeholder accesible para
  productos sin fotografía.
- Secciones públicas breves sobre funcionamiento, historia, Rosa Elena,
  comunidad, participación, aportes y próximas aperturas.

## Fase 4 — validaciones del catálogo

### Auditoría técnica TEST 2026-09-14

La pestaña `PRODUCTOS` de la Sheet TEST fue recuperada directamente en modo
read-only y auditada completa: 54 filas, sin IDs inválidos/duplicados, sin
nombres duplicados y sin errores objetivos de tipos, precios o stock. Los
pendientes comerciales se redujeron a nueve decisiones agrupadas. La evidencia,
propuesta por producto y dependencias con F7/F8 están en
[`PROPUESTA_CATALOGO_FASE_4_TEST.md`](./PROPUESTA_CATALOGO_FASE_4_TEST.md).

No se modificó la Sheet. El fixture `PROD-TEST-DECIMAL` permanece separado de
las decisiones comerciales.

### Cierre técnico Fase 4 TEST 2026-09-15

Las nueve decisiones fueron aprobadas y el plan exacto se aplicó únicamente en
la Sheet TEST, después de backup y comparación optimista de las 54 filas. La
verificación posterior confirmó 64 cambios previstos y ninguno adicional:

- categorías: 19 `Granel`, 13 `Alimentos`, 16 `Limpieza`, 6 `Higiene`;
- unidades: 43 `unidad`, 10 `pack`, 1 `kg` (fixture decimal);
- `PROD-001`–`PROD-019`: presentación fija, decimal `NO`, paso `1`;
- `PROD-TEST-DECIMAL`: `kg`, decimal `SI`, paso `0.1`;
- nombres, IDs, activo, precios, costos, stock, mínimos, prioridad e imágenes:
  sin cambios.

El plan versionado es
[`PLAN_CATALOGO_FASE_4_TEST_APROBADO.json`](./PLAN_CATALOGO_FASE_4_TEST_APROBADO.json).
La web reconoce las cuatro categorías, distingue categoría `Granel` de venta
fraccionada y conserva el fallback accesible cuando `imagen_url` está vacío.

Datos deliberadamente sintéticos/de TEST: stock actual, mínimos en cero,
prioridad uniforme `media`, costos/márgenes vacíos y fixture decimal. Antes de
producción se deben confirmar conteo físico, mínimos, costos, prioridades,
modelo de venta física de `PROD-001`–`019`, precios de `PROD-017`, `034`, `049`,
`050` e imágenes/derechos/créditos. Ninguno bloquea desarrollo o E2E de F7/F8.

### Nombres y variantes por confirmar

No normalizar ni fusionar estos nombres hasta recibir una respuesta:

- Aceite Oliva VDR / Aceite Oliva VOR.
- Salsa de tomate Vergel / Salsa de tomate Toddo.
- Fideos luchett / Fideos Luchetti.
- Cloro gel Excel / Cloro gel Excell / Cloro gel Igenix.
- Papel Higienico 6u / Papel Higiénico 6u Swan.
- Detergente 5L con suavi.
- Jabón líquido / Jabón 1L.
- Lavaloza 1 Fuzol / Lavaloza Fuzol 1L.
- Toalla Nova / Toalla Nova x3.
- Shampoo Sedal / Shampoo Ballerina.
- Limpiador crema / Limpiador crema Wyn.
- B. de basura 70x90 Virutex.

### Categorías y formatos

- [x] Usar `Granel`, `Alimentos`, `Limpieza` e `Higiene`.
- [ ] Confirmar el orden definitivo de las categorías.
- [x] Separar `Limpieza` de `Higiene`.
- [x] Usar `pack` para presentaciones agrupadas y `unidad` para envases o
  productos individuales, conservando el formato en el nombre.
- [x] Mantener `PROD-001`–`019` como cantidades enteras en TEST.
- [ ] Confirmar antes de producción si `PROD-001`–`019` se pesan al vender.

### Fotos e imágenes requeridas

- [ ] Identificar cada original con su `id_producto` real.
- [ ] Informar qué fotos sirven y cuáles deben descartarse.
- [ ] Enumerar los productos que siguen sin foto.
- [ ] Aprobar recorte, fondo y legibilidad de cada imagen final.
- [ ] Definir la fuente definitiva de publicación de imágenes.
- [ ] Asociar la imagen aprobada en `PRODUCTOS.imagen_url` solo después de la
  revisión.

Mientras no exista una imagen aprobada, la tarjeta conserva un placeholder
sobrio y el producto no cambia de nombre, precio, stock ni disponibilidad.

### Datos operativos todavía pendientes

- [ ] Stock real definitivo y stock mínimo por producto.
- [ ] Precio costo, precio sugerido y precio final cuando no estén confirmados.
- [ ] Priorización de productos y alertas de stock bajo.

## Fase 9 — validaciones del contenido público

Revisar los textos breves publicados en:

- [ ] `Cómo funciona el Almacén`.
- [ ] `Historia del Almacén`.
- [ ] `Rosa Elena Morales`.
- [ ] `Comunidad, participación y aportes`.
- [ ] `Próximas aperturas`.
- [ ] Contacto y orientación general.

Confirmar además qué fotografías históricas o comunitarias pueden publicarse,
sus créditos y sus textos alternativos. No se agregó material visual nuevo.

## Decisiones que desarrollo puede tomar sin esperar

- Mantener diseño responsive, jerarquía visual y estilos existentes.
- Conservar placeholders accesibles cuando falten imágenes.
- Mostrar metadatos públicos ya disponibles sin exponer precio costo, margen ni
  campos internos.
- Mantener categorías desconocidas sin renombrarlas silenciosamente.
- Corregir errores evidentes de presentación sin alterar datos maestros.

## Decisiones que debe validar el Almacén

- Nombre final y posible fusión de cada variante de producto.
- Categoría, formato y unidad definitivos por producto.
- Stock real, stock mínimo y los tres valores de precio.
- Selección, descarte, asociación y publicación final de fotografías.
- Aprobación editorial de historia, Rosa Elena, participación y aportes.
- Cambios futuros en fechas, horario, lugar o información de contacto.
