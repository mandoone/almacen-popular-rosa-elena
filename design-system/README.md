# Design System — Almacén Popular Rosa Elena Morales

Sistema de diseño liviano para producir documentos e informes con la identidad
visual institucional del Almacén.

> No es un sistema de componentes React. No modifica la aplicación Next.js.

## Documentos oficiales

- `docs/ADS-001_brandkit_analysis.md`: identidad visual y reglas de marca.
- `docs/ADS-002_sistema_documental.md`: guía operativa del sistema documental.
- `docs/decisions.md`: decisiones técnicas del Design System.

## Estructura

```text
design-system/
├── brandkit/          identidad visual y assets
├── docs/              guías, auditorías y decisiones
├── themes/
│   ├── almacen.css    tokens de identidad
│   └── reports.css    componentes documentales
├── templates/
│   ├── report-avance-almacen.html
│   └── report-tecnico-interno.html
└── prompts/           instrucciones reutilizables

reports/
├── sources/           Markdown fuente
├── html/              HTML generado y referencias aprobadas
└── pdf/               PDF finales cuando corresponda
```

## Flujo oficial

```text
Markdown fuente
→ template HTML oficial
→ informe HTML
→ revisión visual
→ PDF final
→ copia publicada en Drive
```

La versión 0.1 todavía usa composición manual controlada. No existe un pipeline
automático Markdown → HTML → PDF y no se han instalado dependencias para crearlo.

## Tipos de informe

| Tipo | Template | Audiencia |
|---|---|---|
| `AVANCE_ALMACEN` | `templates/report-avance-almacen.html` | Almacén y lectores no técnicos. |
| `TECNICO_INTERNO` | `templates/report-tecnico-interno.html` | Trabajo técnico interno. |

## CSS

- `themes/almacen.css`: colores, tipografías, espaciados, radios, sombras y tokens.
- `themes/reports.css`: portada, ficha, tarjetas, badges, fases, checklists, tablas,
  callouts, síntesis, pie y reglas A4.

Los templates cargan ambos archivos en ese orden.

## Referencias visuales aprobadas

- `reports/html/avance-almacen/preview_2026-07-11_avance-almacen_estado-proyecto_v0.2.html`.
- `reports/html/tecnico-interno/preview_2026-07-11_tecnico-interno_estado-actual_v0.2.html`.

Estas referencias se conservan intactas para comparar futuros informes. No se
rediseñan sin una decisión documentada.

## Relación con la web

El Design System documental puede leer tokens y assets de la web como referencia,
pero nunca modifica `src/`, `public/`, `tailwind.config.ts` ni `globals.css` desde
este flujo.

## Estado de automatización

- HTML: composición manual desde Markdown y templates.
- Revisión: apertura directa en navegador.
- PDF: exportación manual pendiente de habilitación.
- Pipeline automático: pendiente de decisión e implementación.
