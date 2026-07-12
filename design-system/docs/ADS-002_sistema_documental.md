# ADS-002 — Sistema documental oficial
## Almacén Popular Rosa Elena Morales

**Documento:** Guía oficial del sistema documental
**Versión:** 0.1
**Fecha:** 2026-07-11
**Estado:** Base aprobada
**Fuente visual:** pilotos HTML v0.2 aprobados el 2026-07-11

---

## 1. Objetivo

Este documento define cómo crear, revisar, versionar y publicar informes del proyecto
sin rediseñar la identidad visual en cada entrega.

El repositorio es la fuente oficial de:

- brandkit documental;
- templates y CSS;
- fuentes Markdown;
- HTML aprobados o conservados como referencia;
- PDF finales, cuando se decida versionarlos.

El sistema es independiente de la aplicación Next.js. No modifica `src/`, no usa
Tailwind como pipeline documental y no requiere ejecutar la web.

## 2. Flujo oficial

```text
Markdown fuente
→ template HTML oficial
→ informe HTML
→ revisión visual
→ PDF final
→ copia publicada en Drive
```

En la versión 0.1, la composición Markdown → HTML todavía es manual y controlada.
No existe aún un generador automático ni se instala una dependencia para hacerlo.

## 3. Tipos de informe

### 3.1 `AVANCE_ALMACEN`

Dirigido al Almacén y a lectores no técnicos. Usa lenguaje accesible y presenta:

- portada y ficha documental;
- resumen ejecutivo;
- tarjetas de estado;
- avance por fases;
- realizado y pendiente;
- próximos pasos;
- síntesis.

Template: `design-system/templates/report-avance-almacen.html`.

### 3.2 `TECNICO_INTERNO`

Dirigido al trabajo técnico interno. Puede incluir:

- arquitectura;
- producción;
- Google Sheets y Apps Script;
- seguridad;
- nombres de variables sin valores;
- evidencia de validaciones;
- riesgos y deuda técnica;
- próximos pasos técnicos;
- síntesis.

Template: `design-system/templates/report-tecnico-interno.html`.

## 4. Metadata obligatoria

Cada fuente Markdown debe declarar al inicio:

```yaml
---
DOCUMENTO: "Nombre legible del documento"
VERSION: "0.1"
FECHA: "YYYY-MM-DD"
ESTADO: "BORRADOR"
FUENTE:
  - "docs/PROJECT_STATE.md"
  - "docs/TASKS.md"
TIPO_INFORME: "AVANCE_ALMACEN"
---
```

Campos obligatorios:

| Campo | Regla |
|---|---|
| `DOCUMENTO` | Nombre humano, no el nombre de archivo. |
| `VERSION` | Versión documental sin fecha. |
| `FECHA` | Formato ISO `YYYY-MM-DD`. |
| `ESTADO` | Estado controlado del documento. |
| `FUENTE` | Uno o más archivos o antecedentes verificables. |
| `TIPO_INFORME` | `AVANCE_ALMACEN` o `TECNICO_INTERNO`. |

Estados documentales permitidos:

- `BORRADOR`;
- `EN_REVISION`;
- `APROBADO`;
- `ENVIADO`;
- `ARCHIVADO`.

La ficha visible del HTML se genera a partir de estos datos. No se mantiene una
segunda versión manual de la metadata.

## 5. Estructura visual fija

La identidad aprobada no se rediseña entre informes. La estructura base es:

1. portada morada institucional;
2. logo en la esquina superior derecha;
3. título y subtítulo;
4. tres tarjetas superiores;
5. ficha de control documental;
6. leyenda de estados;
7. secciones blancas tipo documento;
8. fases con cabecera y badge;
9. tablas, checklists y callouts;
10. próximos pasos;
11. síntesis morada;
12. pie documental.

Referencias visuales aprobadas:

- `reports/html/avance-almacen/preview_2026-07-11_avance-almacen_estado-proyecto_v0.2.html`;
- `reports/html/tecnico-interno/preview_2026-07-11_tecnico-interno_estado-actual_v0.2.html`.

## 6. Separación de CSS

### `design-system/themes/almacen.css`

Es la fuente de identidad visual:

- colores institucionales;
- tipografías;
- escala tipográfica;
- espaciados base;
- radios;
- sombras;
- reset mínimo y utilidades de marca.

### `design-system/themes/reports.css`

Es la capa de componentes documentales:

- portada y hero;
- tarjetas de cabecera;
- ficha documental;
- badges;
- secciones y fases;
- checklists;
- tablas;
- notas y bloques de código;
- próximos pasos;
- síntesis y footer;
- responsive e impresión A4.

Los templates deben cargar primero `almacen.css` y después `reports.css`.

## 7. Componentes oficiales

| Componente | Clase base |
|---|---|
| Portada | `.report-hero` |
| Logo de portada | `.report-hero-logo` |
| Tarjetas superiores | `.report-meta-grid`, `.report-meta-card` |
| Ficha documental | `.report-document-control` |
| Sección | `.report-section` |
| Tarjetas de estado | `.report-cards`, `.report-card` |
| Fase | `.report-phase` |
| Badge | `.report-badge` |
| Checklist | `.report-checklist` |
| Tabla | `.report-table` |
| Nota | `.report-callout` |
| Código/referencia | `.report-code-block` |
| Próximos pasos | `.report-steps`, `.report-step` |
| Síntesis | `.report-synthesis` |
| Pie | `.report-footer` |

## 8. Estados visuales

Los estados se aplican como modificadores de `.report-badge`:

| Clase | Uso |
|---|---|
| `.is-done` | Realizado, validado o cerrado. |
| `.is-pending` | Pendiente sin urgencia especial. |
| `.is-info` | Información o meta. |
| `.is-priority` | Próxima prioridad. |
| `.is-medium` | Riesgo medio. |
| `.is-high` | Riesgo alto. |
| `.is-critical` | Riesgo crítico. |

El color nunca reemplaza el texto: todo badge debe incluir una etiqueta legible.

## 9. Reglas para PDF

- Tamaño A4 con margen de 14 mm.
- Activar gráficos de fondo al imprimir.
- Usar escala 100 %, salvo ajuste visual explícitamente aprobado.
- No imprimir encabezados ni pies automáticos del navegador.
- Usar `.report-page-break` solo cuando una sección deba comenzar en página nueva.
- Usar `.report-avoid-break` para bloques cortos que no deben partirse.
- Revisar manualmente tablas largas, fases y síntesis antes de aprobar el PDF.
- No generar PDF si el HTML todavía está en `BORRADOR` o no fue revisado visualmente.

## 10. Convención de nombres

Mismo nombre base para Markdown, HTML y PDF:

```text
YYYY-MM-DD_tipo-descripcion_vN.N.ext
```

Ejemplos:

```text
2026-07-11_avance-almacen_estado-proyecto_v1.0.md
2026-07-11_avance-almacen_estado-proyecto_v1.0.html
2026-07-11_avance-almacen_estado-proyecto_v1.0.pdf
2026-07-11_tecnico-interno_estado-actual_v1.0.md
```

Los archivos `preview_*` son maquetas o referencias visuales. No se consideran
versiones enviadas aunque hayan sido aprobados como base de diseño.

## 11. Relación entre repo y Drive

### Repositorio

Es la fuente de verdad para contenido y sistema:

- Markdown fuente;
- CSS y templates;
- guía y decisiones;
- referencias HTML aprobadas;
- historial de cambios.

### Drive

Contiene copias de distribución y trabajo con el Almacén:

- HTML aprobado, si se necesita conservarlo;
- PDF final enviado;
- versiones entregadas o archivadas;
- materiales de metodología y roadmap.

Una copia en Drive no reemplaza ni se edita como fuente principal. Los cambios se
hacen primero en el Markdown del repo y luego se vuelve a generar/publicar.

## 12. Qué se versiona y qué se publica

| Artefacto | Git | Drive |
|---|---|---|
| Markdown fuente | Sí | Opcional como copia de respaldo. |
| Templates, CSS y guías | Sí | Sí, en recursos visuales si se necesita compartir. |
| HTML de preview no aprobado | No por defecto | No. |
| HTML aprobado como referencia visual | Sí | Opcional. |
| HTML de una entrega aprobada | Según relevancia histórica | Sí, si corresponde. |
| PDF final enviado | Según decisión del proyecto | Sí, obligatorio como versión enviada. |
| PDF de prueba | No | No. |

Nunca se publican secretos, valores de variables de entorno, tokens, credenciales,
IDs privados ni datos personales de pedidos.

## 13. Flujo de trabajo v0.1

1. Crear o actualizar el Markdown en `reports/sources/<tipo>/`.
2. Validar metadata, fuentes y ausencia de secretos.
3. Elegir el template por `TIPO_INFORME`.
4. Sustituir los placeholders y adaptar Markdown a los componentes oficiales.
5. Guardar HTML en `reports/html/<tipo>/`.
6. Abrir el HTML en navegador y compararlo con las referencias aprobadas.
7. Corregir contenido o paginación sin cambiar el brandkit.
8. Marcar como aprobado.
9. Generar PDF manualmente cuando el proyecto lo autorice.
10. Copiar la versión aprobada a Drive.

## 14. Pendiente de automatización

La versión 0.1 no define todavía la herramienta definitiva para convertir Markdown
a HTML. Antes de automatizar se debe decidir entre una herramienta externa, como
Pandoc, o un generador Node aislado del runtime de Next.js.

La automatización futura deberá:

- validar metadata;
- elegir template por tipo;
- convertir tablas y checklists;
- resolver rutas de assets;
- detectar placeholders sin reemplazar;
- generar HTML reproducible;
- ejecutar controles de impresión;
- generar PDF solo después de aprobación.

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-07-11 | Base documental consolidada desde los dos pilotos v0.2 aprobados. |
