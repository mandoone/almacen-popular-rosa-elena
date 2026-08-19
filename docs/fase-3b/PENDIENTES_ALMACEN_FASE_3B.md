# PENDIENTES_ALMACEN_FASE_3B.md — Pendientes reales del Almacén

> Pendientes que **dependen de respuesta o trabajo del Almacén** (Carolina/
> Nadia), no de nosotros. Complementa `docs/fase-3a/PENDIENTES_CAROLINA_NADIA.md`
> (preguntas de Fase 3A, algunas ya respondidas — ver ese documento).
> Ninguno de estos pendientes bloquea el diseño técnico de Fase 3B descrito en
> `DECISIONES_OPERATIVAS_FASE_3B.md`; sí condicionan el contenido y catálogo
> reales antes de publicar.

---

## 1. Catálogo y venta

| # | Pendiente | Depende de |
|---|---|---|
| 1 | Confirmar categorías iniciales | Almacén |
| 2 | Confirmar orden de categorías | Almacén |
| 3 | Confirmar unidades de venta | Almacén |
| 4 | Definir cómo se venderán los productos a granel | Almacén |
| 5 | Confirmar si habrá productos solo presenciales | Almacén |

Relacionado con P6, P7, P8 y P9 de `docs/fase-3a/PENDIENTES_CAROLINA_NADIA.md`
(ya tienen valor por defecto editable; esto es la confirmación real).

## 2. Calendario y aperturas

| # | Pendiente | Depende de |
|---|---|---|
| 6 | Confirmar próximas aperturas vigentes | Almacén |
| 7 | Confirmar criterios para aperturas especiales | Almacén |

El horario 11:00–15:00 (§1.1 de `DECISIONES_OPERATIVAS_FASE_3B.md`) está
confirmado; falta confirmar si aplica igual a **todas** las fechas futuras y
qué fechas están vigentes hoy.

## 3. Contenido público

| # | Pendiente | Depende de |
|---|---|---|
| 8 | Validar o corregir textos públicos actuales | Almacén |
| 9 | Entregar o validar texto de historia del Almacén | Almacén |
| 10 | Definir texto sobre comunidad, participación y aportes | Almacén |
| 11 | Confirmar quién revisa contenidos públicos antes de publicar | Almacén |

## 4. Fotos de productos

| # | Pendiente | Depende de |
|---|---|---|
| 12 | Identificar productos fotografiados | Almacén / Omar |
| 13 | Seleccionar fotos útiles para la web | Almacén / Omar |
| 14 | Indicar fotos que no deben usarse | Almacén |
| 15 | Dejar imágenes finales listas para la web | Omar |
| 16 | Validar imágenes finales cuando estén trabajadas | Almacén |

Procedimiento y estructura de carpetas propuestos en §5.

## 5. Usuarios y permisos

| # | Pendiente | Depende de |
|---|---|---|
| 17 | Confirmar nómina final de usuarios por perfil | Almacén |

---

## 6. Fotos de productos — estado y procedimiento

### 6.1 Estado actual

Se encontró la carpeta de Drive **"Productos del almacén"**:
`https://drive.google.com/drive/folders/1Cssloa-hhNzlsXj-YjsjWzHbiU_2slO-`

- Carpeta encontrada y accesible.
- Contiene fotos **originales tipo WhatsApp** (sin editar, sin criterio de
  selección aplicado).
- **No son imágenes finales** trabajadas para la web.
- **No se movieron ni borraron** los originales. Se tratan como **respaldo
  bruto**: no tocar hasta completar el procedimiento de §6.2.

### 6.2 Procedimiento pendiente

1. Identificar cada producto fotografiado (pendiente #12).
2. Seleccionar las fotos útiles (pendiente #13).
3. Crear la carpeta de imágenes listas (estructura §6.3).
4. Renombrar las imágenes con nombre o código de producto (regla §6.4).
5. Asociar cada imagen a su producto en la base operativa (`PRODUCTOS`,
   columna `imagen_url`).
6. Editar/optimizar las imágenes para web.
7. Validar las imágenes finales con el Almacén (pendiente #16).

### 6.3 Estructura de carpetas propuesta

```
03_Diseño y recursos visuales
└── productos
    ├── 00_originales_whatsapp
    ├── 01_por_identificar
    ├── 02_aprobadas_para_web
    ├── 03_editadas_web
    └── 99_descartadas
```

Esta estructura es una **propuesta**, no está creada en Drive todavía.

### 6.4 Regla de nombres sugerida

```
prod-001_avena_integral_01.jpg
prod-002_garbanzos_01.jpg
prod-003_lentejas_01.jpg
```

Formato: `prod-{id correlativo}_{nombre en snake_case}_{n° de foto}.jpg`.
Debe alinearse con el `id_producto` real de la hoja `PRODUCTOS`
(`PROD-001…`, ver `docs/TASKS.md` FASE 1) antes de asociar imágenes, para
evitar dos sistemas de identificación de producto en paralelo.
