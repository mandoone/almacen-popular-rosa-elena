# Propuesta comercial familia → SKU para revisión de Omar

Fecha: 2026-10-08. **PROPUESTA, no migración ni autorización de escritura.** No crea IDs/filas remotamente ni modifica PRODUCTOS/FAMILIAS_PRODUCTO. Los IDs definitivos propuestos y el primer mapa local se añadieron en C7-A. [Auditoría y fronteras C6](FAMILIAS_PRODUCTO_FASE_C6_SHADOW_2026-10-08.md).

## Evidencia y criterio

La captura nativa TEST al cierre C5 y los GET C6 acreditan 54 SKU comerciales: 36 envasados y 18 graneles. Se excluyen 39 fixtures: 37 QA C5 y los dos fixtures previos documentados. Ninguno de los36 envasados tiene todavía identidad física estructurada suficiente en los campos nuevos del maestro real. C7-A acredita localmente tres identidades mediante H2, sin escribir esos campos. Los nombres siguientes son etiquetas vigentes, **no prueba de la marca física**.

Fuentes de esta propuesta:

- **H1**: instrucción expresa de Omar de continuación C6, 2026-10-08. Confirma ofertas Económico para Cloro 1 L, Limpiador crema, Aceite vegetal y Desinfectante suelo; Clorinda separada explícita; Fuzol 900 ml y Shampoo/Bálsamo Ballerina 750 ml. Estos datos acreditan la propuesta pública; no acreditan automáticamente qué unidad física corresponde al SKU legado.
- **M1**: maestro PRODUCTOS leído sin mutar, con los IDs/nombres vigentes y ausencia de los campos físicos. Huella y procedimiento reproducible en el acta C6.
- **C1**: [fuentes de catálogo/comanda](FUENTES_CATALOGO_2026-10-01.csv) y [pendientes previos](CATALOGO_PENDIENTES_REALES_2026-10-01.md). La instrucción H1 cierra las presentaciones públicas indicadas arriba; no se reabren como incógnitas. Los pendientes físicos restantes no se completan desde nombres o costos.

Una marca física distinta requiere un SKU interno distinto; una oferta VARIABLE puede agrupar marcas equivalentes. Una oferta EXPLICITA conserva su marca pública y no admite otra marca silenciosamente. Precio futuro: familia/comanda aprobada, nunca costo, promedio o margen automático.

## Actualización C7-A — acreditación sin migración

**H2:** Omar aprobó expresamente identidad física/pública Fuzol900ml para PROD-040 y Ballerina750ml para PROD-046/047 en la instrucción C7-A2026-10-08. Ya no son preguntas pendientes. Cuatro ofertas VARIABLE siguen FALTA_IDENTIDAD_FISICA; Clorinda queda OFERTA_APROBADA_SIN_SKU_ACREDITADO. [IDs/precios/mapa ejecutable CUMPLE y matriz racionalizada](FAMILIAS_PRODUCTO_FASE_C7A_REVISION_MAPA_2026-10-08.md).

| Estado actual de revisión | SKU | Alcance |
|---|---:|---|
| IDENTIDAD_APROBADA_PARA_DRY_RUN |3|Fuzol900ml y Shampoo/Bálsamo Ballerina750ml. Copias locales, ninguna autorización remota. |
| FALTA_IDENTIDAD_FISICA |4|Ofertas Económico aprobadas, identidad física pendiente. |
| FALTA_IDENTIDAD |29|Revisión racionalizada A/B/C/D en acta C7-A. |
| POSTERGADO_GRANEL |18|D40 intacto. |

Hay10 PROPUESTO_NO_REQUIERE_MULTI_SKU para revisión final de Omar, todavía0 exenciones aprobadas automáticamente. La tabla siguiente conserva el cierre C6, no contradice la acreditación posterior H2.

## Clasificaciones al cierre C6 — historia conservada

| Clasificación | SKU actuales | Alcance |
|---|---:|---|
| LISTO_PARA_REVISAR | 7 | Propuesta pública apoyada por H1. **Identidad física aún pendiente**; no está listo para asociar/escribir. |
| FALTA_IDENTIDAD | 29 | Candidato potencial a familia simple conservando la oferta vigente; política/presentación física por acreditar. No decide que necesite multi-SKU. |
| POSTERGADO_GRANEL | 18 | Sin propuesta de asociación real en C6/C7 inicial. Se mantiene D40. |
| NO_REQUIERE_MULTI_SKU | 0 | Requiere decisión humana explícita por SKU; no se deduce automáticamente. |
| Total comercial | 54 | Las clasificaciones de propuesta no reemplazan la auditoría técnica: 36 siguen sin identidad estructurada. |

La oferta adicional Clorinda se describe aparte: no incrementa el número de SKU comerciales auditados ni presupone que ya exista un SKU suyo acreditado.

## Ofertas con decisiones públicas acreditadas

El maestro real sigue sin nuevos campos completados. Los tres SKU acreditados por H2 son IDENTIDAD_APROBADA_PARA_DRY_RUN; las cuatro variables siguen FALTA_IDENTIDAD_FISICA. Ninguna fila autoriza una asignación remota.

| Producto actual | Familia pública propuesta | Política propuesta | Presentación pública acreditada | Clase | Acción futura | Evidencia / incertidumbre |
|---|---|---|---|---|---|---|
| PROD-023 · Aceite vegetal | Aceite vegetal Económico | VARIABLE | Por acreditar | FALTA_IDENTIDAD_FISICA | Confirmar contenido y marca física; revisar familia variable sin crear otro SKU por suposición. | H1 acredita Económico; M1 no acredita formato/marca. |
| PROD-033 · Cloro 1 L | Cloro 1 L Económico | VARIABLE | 1 L / 1000 ml | FALTA_IDENTIDAD_FISICA | Acreditar qué marca contiene este SKU y su equivalencia antes de asociarlo. | H1 acredita oferta económica y separación Clorinda; no prueba que PROD-033 sea físicamente Clorinda ni otra marca. |
| PROD-040 · Lavaloza Fuzol | Lavaloza Fuzol 900 ml | EXPLICITA · Fuzol | 900 ml | IDENTIDAD_APROBADA_PARA_DRY_RUN | Proyectar Fuzol/900ml y validar FAM-LAVALOZA-FUZOL-900ML→PROD-040 en copia. | H2 acredita identidad física y pública; no volver a preguntar. |
| PROD-044 · Desinfectante suelo (Todos) | Desinfectante suelo Económico | VARIABLE | Por acreditar | FALTA_IDENTIDAD_FISICA | Acreditar contenido y marca física; conservar histórico/nombre actual hasta migración aprobada. | H1 acredita Económico; “Todos” en el nombre no acredita marca del SKU. |
| PROD-046 · Shampoo Ballerina | Shampoo Ballerina 750 ml | EXPLICITA · Ballerina | 750 ml | IDENTIDAD_APROBADA_PARA_DRY_RUN | Proyectar Ballerina/750ml y validar FAM-SHAMPOO-BALLERINA-750ML→PROD-046 en copia. | H2 acredita identidad física y pública; maestro remoto intacto. |
| PROD-047 · Bálsamo Ballerina | Bálsamo Ballerina 750 ml | EXPLICITA · Ballerina | 750 ml | IDENTIDAD_APROBADA_PARA_DRY_RUN | Proyectar Ballerina/750ml y validar FAM-BALSAMO-BALLERINA-750ML→PROD-047 en copia. | H2 acredita identidad física y pública; separado de Shampoo. |
| PROD-048 · Limpiador crema | Limpiador crema Económico | VARIABLE | Por acreditar | FALTA_IDENTIDAD_FISICA | Acreditar contenido/marca; revisar agrupación únicamente de SKU equivalentes existentes. | H1 acredita Económico; no inferir marca genérica/Wyn por nombre. |

**Oferta separada sin SKU acreditado:** Cloro 1 L Clorinda, política EXPLICITA, marca pública Clorinda, 1 L / 1000 ml (H1/C1). No fusionar con Económico. Antes de un mapa ejecutable, acreditar un SKU físico Clorinda existente o decidir su alta en otra tarea autorizada. No asignar PROD-033 a ambas ofertas, no renombrarlo ni crear SKU/stock virtual.

## Candidatos potenciales a familia simple — falta identidad

Para cada fila: identidad estructurada **insuficiente**, política propuesta **POR DEFINIR** (estado de revisión, no enum para Sheet), presentación **por acreditar**. Conservar la etiqueta pública vigente es una propuesta provisional. La acción futura común es acreditar marca/presentación/contenido, revisar si existe una o varias identidades físicas y resolver política/asociación con Omar; no inferir marcas desde el rótulo. Evidencia M1; H1 no define una agrupación particular para estas filas.

| Producto actual | Familia pública provisional | Presentación | Clase | Acción / evidencia específica |
|---|---|---|---|---|
| PROD-010 · Poroto burro | Poroto burro | Por acreditar | FALTA_IDENTIDAD | Validar identidad física; no reabrir diferencia con Poroto blanco. M1. |
| PROD-020 · Aceite Oliva Vor 250 ml | Aceite Oliva Vor 250 ml | Rótulo 250 ml; falta acreditación física | FALTA_IDENTIDAD | Conservar decisión VDR vigente; este nombre no crea una marca física nueva. M1/C1. |
| PROD-021 · Aceite Oliva Vor 500 ml | Aceite Oliva Vor 500 ml | Rótulo 500 ml; falta acreditación física | FALTA_IDENTIDAD | No agrupar con 250 ml; identidad física por acreditar, sin reabrir VDR. M1/C1. |
| PROD-022 · Aceite Natura | Aceite Natura | Por acreditar | FALTA_IDENTIDAD | Confirmar identidad y contenido; no completar desde costo. M1/C1. |
| PROD-024 · Azúcar | Azúcar | Por acreditar | FALTA_IDENTIDAD | Confirmar unidad física; decidir si oferta simple o variable. M1. |
| PROD-025 · Tallarines Parma | Tallarines Parma | Por acreditar | FALTA_IDENTIDAD | Confirmar identidad/contenido; no deducir marca física. M1. |
| PROD-026 · Fideos Parma | Fideos Parma | Por acreditar | FALTA_IDENTIDAD | Mantener producto separado de Tallarines mientras se acredita equivalencia. M1. |
| PROD-027 · Sal | Sal | Por acreditar | FALTA_IDENTIDAD | No fusionar con Sal de Cáhuil granel. M1. |
| PROD-028 · Salsa de tomate Toddo | Salsa de tomate Toddo | Por acreditar | FALTA_IDENTIDAD | Acreditar identidad física; no asignar variantes mencionadas en fuentes a este ID sin prueba. M1/C1. |
| PROD-029 · Tallarines Luchetti | Tallarines Luchetti | Por acreditar | FALTA_IDENTIDAD | Confirmar identidad/contenido; política pública por revisar. M1. |
| PROD-030 · Fideos Luchetti | Fideos Luchetti | Por acreditar | FALTA_IDENTIDAD | No fusionar con Tallarines por similitud de nombre. M1. |
| PROD-031 · Cloro gel Igenix | Cloro gel Igenix | Por acreditar | FALTA_IDENTIDAD | Confirmar identidad/formato; no agrupar con Cloro 1 L. M1/C1. |
| PROD-032 · Cloro gel Excell | Cloro gel Excell | Por acreditar | FALTA_IDENTIDAD | Confirmar marca/formato; conservar ID histórico. M1/C1. |
| PROD-034 · Manga Swan | Manga Swan | Por acreditar | FALTA_IDENTIDAD | Acreditar presentación/contenido y política pública. M1. |
| PROD-035 · Papel Higiénico 6u Swan | Papel Higiénico 6u Swan | Rótulo 6u; falta acreditación física | FALTA_IDENTIDAD | Validar contenido del pack; no inferir marca desde rótulo. M1. |
| PROD-036 · Detergente 5L | Detergente 5L | Rótulo 5 L; falta acreditación física | FALTA_IDENTIDAD | Preservar diferencia regular/con suavizante ya cerrada. M1. |
| PROD-037 · Detergente 5L con suavizante | Detergente 5L con suavizante | Rótulo 5 L; falta acreditación física | FALTA_IDENTIDAD | No fusionar con regular; completar identidad física. M1. |
| PROD-038 · Detergente concentrado | Detergente concentrado | Por acreditar | FALTA_IDENTIDAD | Acreditar contenido y equivalencia, sin agrupar por nombre. M1. |
| PROD-039 · Jabón 1L | Jabón 1L | Rótulo 1 L; falta acreditación física | FALTA_IDENTIDAD | Confirmar identidad física; no completar costos pendientes. M1/C1. |
| PROD-041 · Pasta Pepsodent (90 g) | Pasta Pepsodent (90 g) | Rótulo 90 g; falta acreditación física | FALTA_IDENTIDAD | Validar unidad física y política; no inferir marca automáticamente. M1. |
| PROD-042 · Toalla Nova x3 | Toalla Nova x3 | Rótulo x3; falta acreditación física | FALTA_IDENTIDAD | Confirmar contenido/presentación de pack. M1/C1. |
| PROD-043 · Toalla Tork | Toalla Tork | Por acreditar | FALTA_IDENTIDAD | Confirmar presentación e identidad física. M1. |
| PROD-045 · Servilletas (300u) | Servilletas (300u) | Rótulo 300u; falta acreditación física | FALTA_IDENTIDAD | Confirmar contenido físico y política pública. M1. |
| PROD-049 · Paños amarillos | Paños amarillos | Por acreditar | FALTA_IDENTIDAD | Confirmar cantidad/unidad y si corresponde oferta simple. M1. |
| PROD-050 · Esponjas | Esponjas | Por acreditar | FALTA_IDENTIDAD | Confirmar cantidad/unidad e identidad; no crear marcas. M1. |
| PROD-051 · Afeitadora desechable | Afeitadora desechable | Por acreditar | FALTA_IDENTIDAD | Confirmar presentación/contenido y política. M1. |
| PROD-052 · B. de basura 70x90 VIRUTEX | B. de basura 70x90 VIRUTEX | Rótulo 70x90; contenido por acreditar | FALTA_IDENTIDAD | Dimensión no equivale a cantidad de pack; no deducir marca física. M1/C1. |
| PROD-053 · Pan de masa madre | Pan de masa madre | Por acreditar | FALTA_IDENTIDAD | Decidir si NO_APLICA y familia simple corresponde; no asumir exención multi-SKU. M1. |
| PROD-054 · Empanadas | Empanadas | Por acreditar | FALTA_IDENTIDAD | Mantener POR_APERTURA; acreditar unidad física, sin alterar regla de habilitación. M1. |

## Granel postergado

Cada fila mantiene D40, gramos libres y referencia de precio vigente. Familia pública propuesta y política: **postergadas**, no hay mapa real. Identidad por lote/marca/proveedor no se inventa. Acción futura: una tarea específica posterior, fuera de C7 inicial. Evidencia M1 y decisión H1 de postergación.

| SKU actual | Producto / oferta vigente | Presentación | Clase |
|---|---|---|---|
| PROD-001 | Arroz | Granel D40 | POSTERGADO_GRANEL |
| PROD-002 | Arroz integral | Granel D40 | POSTERGADO_GRANEL |
| PROD-003 | Avena Integral | Granel D40 | POSTERGADO_GRANEL |
| PROD-004 | Carne vegetal | Granel D40 | POSTERGADO_GRANEL |
| PROD-005 | Garbanzos | Granel D40 | POSTERGADO_GRANEL |
| PROD-006 | Harina | Granel D40 | POSTERGADO_GRANEL |
| PROD-007 | Harina Integral | Granel D40 | POSTERGADO_GRANEL |
| PROD-008 | Lentejas | Granel D40 | POSTERGADO_GRANEL |
| PROD-009 | Poroto blanco | Granel D40 | POSTERGADO_GRANEL |
| PROD-011 | Quínoa | Granel D40 | POSTERGADO_GRANEL |
| PROD-012 | Sal de Cáhuil | Granel D40 | POSTERGADO_GRANEL |
| PROD-013 | Mote | Granel D40 | POSTERGADO_GRANEL |
| PROD-014 | Té | Granel D40 | POSTERGADO_GRANEL |
| PROD-015 | Pimienta | Granel D40 | POSTERGADO_GRANEL |
| PROD-016 | Ají de color | Granel D40 | POSTERGADO_GRANEL |
| PROD-017 | Bicarbonato | Granel D40 | POSTERGADO_GRANEL |
| PROD-018 | Orégano | Granel D40 | POSTERGADO_GRANEL |
| PROD-019 | Aliño completo | Granel D40 | POSTERGADO_GRANEL |

## Plan al cierre C6 — preservado, supersedido parcialmente por C7-A

Omar revisa las siete ofertas apoyadas por H1 y las incertidumbres físicas de los 36 envasados. La revisión debe acreditar cada SKU, sin renombrar IDs históricos ni reasignar compras/stock antiguos. Después se podrá preparar un mapa ejecutable con IDs de familias aprobados, contenido normalizado, política/marca pública y precio explícito de comanda; validarlo localmente con el dry-run C6.

La propuesta amplia C6 **no es un JSON/CSV importable**: contiene pendientes que bloquearían cualquier migración. NO_REQUIERE_MULTI_SKU solo se marcará con evidencia expresa por SKU. Una eventual migración TEST necesita otra tarea autorizada con backup/readback; no implica activar tienda/carrito V2. C7 remoto no se ejecutó.

Estado actual: el JSON C7-A de solo tres asociaciones sí es ejecutable en dry-run y dio CUMPLE. Las aprobaciones H2 no se vuelven a solicitar. El resto permanece propuesta/revisión, con preguntas mínimas agrupadas; no migración.
