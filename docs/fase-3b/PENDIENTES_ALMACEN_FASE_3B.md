# PENDIENTES_ALMACEN_FASE_3B.md — Respuestas y pendientes del Almacén

> Estado al 2026-09-09. Consolida las respuestas recibidas en “Avances PAGINA
> ALMACÉN”. Las respuestas parciales se registran sin completar ni normalizar
> datos que el Almacén no haya confirmado. Este documento no autoriza cambios
> en producción, Google Sheets ni Apps Script.

---

## 1. Respondido parcialmente por el Almacén

### 1.1 Catálogo

Quedan confirmadas como categorías **visibles**: `Granel`, `Alimento` e
`Higiene`. El orden `Granel → Alimento → Higiene` es un **supuesto operativo
propuesto**, no una decisión confirmada.

**Granel — formatos informados:**

| Formato | Productos |
|---|---|
| 500 g / 1 kg | Arroz; Arroz integral; Avena Integral; Carne vegetal; Garbanzos; Harina; Harina integral; Lentejas; Poroto blanco; Quínoa; Sal de Cáhuil; Mote |
| 250 g | Té |
| 100 g | Pimienta; Ají de color; Bicarbonato; Orégano; Aliño completo |

**Alimento — unidad informada:**

| Producto informado | Unidad |
|---|---|
| Aceite Oliva VDR 500 ml | `ML` |
| Aceite Oliva VDR 250 ml | `ML` |
| Aceite Natura | `ML` |
| Aceite vegetal | `ML` |
| Azúcar | `KILO` |
| Tallarines Parma | `PAQUETE` |
| Fideos Parma | `PAQUETE` |
| Sal | `KILO` |
| Salsa de tomate Vergel | `PAQUETE` |
| Tallarines Luchetti | `PAQUETE` |
| Fideos luchett | `PAQUETE` |

**Higiene — unidad informada:**

| Producto informado | Unidad |
|---|---|
| Cloro gel Excel | `ENVASE` |
| Cloro 1 L | `ENVASE` |
| Manga Swan | `MANGA` |
| Papel Higienico 6u | `PAQUETE` |
| Detergente 5L | `ENVASE` |
| Detergente 5L con suavi | `ENVASE` |
| Esponjas lavaplatos | `UNIDAD` |
| Jabón líquido | `ENVASE` |
| Lavaloza 1 Fuzol | `ENVASE` |
| Pasta Pepsodent (90 g) | `UNIDAD` |
| Toalla Nova | `PAQUETE` |
| Toalla Tork | `PAQUETE` |
| Desinfectante suelo | `ENVASE` |
| Servilletas (300u) | `PAQUETE` |
| Shampoo Sedal | `ENVASE` |
| Limpiador crema Wyn | `ENVASE` |
| Paños Amarillos | `UNIDAD` |
| shampoo ballerina | `ENVASE` |
| bálsamo ballerina | `ENVASE` |
| B. de basura 70x90 virutex | `ROLLO` |

El Almacén indica que **no habría productos solo presenciales**: el catálogo
sería el mismo para venta virtual y presencial, sujeto a disponibilidad. Esto
cierra la pregunta de catálogo diferenciado, pero no cambia todavía ninguna
lógica de stock ni código.

### 1.2 Próximas aperturas 2026

El Almacén informó como vigentes: `2026-09-19`, `2026-10-03`, `2026-10-17`,
`2026-11-07`, `2026-11-21`, `2026-12-05` y `2026-12-19`.

Para preparar TEST se aplica el horario informado `11:00–15:00` y la regla
técnica vigente de cierre el jueves anterior a las `23:59`. Las semillas y
sus estados iniciales propuestos viven en
`docs/fase-3b/COLUMNAS_PROPUESTAS_FASE_3B.md` §1.3.

---

## 2. Pendientes abiertos

| # | Pendiente | Depende de |
|---|---|---|
| 1 | Confirmar si el orden oficial es `Granel → Alimento → Higiene` | Almacén |
| 2 | Confirmar `Fideos luchett` / `Fideos Luchetti` | Almacén |
| 3 | Confirmar `Cloro gel Excel` / `Cloro gel Excell` | Almacén |
| 4 | Confirmar `Aceite Oliva VDR` / `Aceite Oliva VOR` | Almacén |
| 5 | Confirmar mayúsculas de `shampoo ballerina` / `Shampoo Ballerina` | Almacén |
| 6 | Confirmar mayúsculas y tilde de `bálsamo ballerina` / `Bálsamo Ballerina` | Almacén |
| 7 | Confirmar `Papel Higienico` / `Papel Higiénico` | Almacén |
| 8 | Validar o corregir textos públicos actuales | Almacén |
| 9 | Entregar o validar la historia del Almacén | Almacén |
| 10 | Definir texto sobre comunidad, participación y aportes | Almacén |
| 11 | Confirmar responsable final de contenidos públicos | Almacén |
| 12 | Identificar y seleccionar fotos de productos; indicar descartes | Almacén / Omar |
| 13 | Editar, asociar y validar imágenes finales para la web | Omar / Almacén |
| 14 | Confirmar nómina final de usuarios por perfil | Almacén |
| 15 | Confirmar criterios para aperturas especiales | Almacén |
| 16 | Confirmar el lugar/punto de retiro de cada apertura semilla | Almacén |

Los nombres inconsistentes se conservan **textualmente como fueron enviados**
hasta recibir confirmación. No deben normalizarse silenciosamente en la Sheet.

---

## 3. Fotos de productos — procedimiento pendiente

La carpeta de Drive “Productos del almacén” contiene originales tipo WhatsApp.
No se movieron, borraron ni trataron como imágenes finales.

1. Identificar cada producto fotografiado.
2. Seleccionar fotos útiles y descartes.
3. Trabajar en carpetas separadas: `00_originales_whatsapp`,
   `01_por_identificar`, `02_aprobadas_para_web`, `03_editadas_web` y
   `99_descartadas`.
4. Nombrar con el `id_producto` real, por ejemplo
   `prod-001_avena_integral_01.jpg`.
5. Asociar la imagen final en `PRODUCTOS.imagen_url`.
6. Optimizar para web y validar con el Almacén.

---

## 4. Riesgos de datos

- Normalizar nombres antes de confirmarlos puede crear duplicados o asociar
  stock/precios al producto equivocado.
- `ML` como unidad para aceites puede describir la dimensión de venta, pero no
  aclara por sí sola la cantidad seleccionable; la implementación debe respetar
  la presentación del producto y no inferir fraccionamiento.
- Publicar las fechas sin completar `lugar` o sin revisión humana puede mostrar
  información incompleta.
- Compartir catálogo entre web y presencial aumenta la competencia por el mismo
  stock; ambos canales deben reutilizar una única operación atómica.
