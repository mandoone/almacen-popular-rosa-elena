# Prompt: generar informe documental
Almacén Popular Rosa Elena Morales — Sistema documental v0.1

## Objetivo

Crear un HTML a partir de un Markdown real sin cambiar la identidad visual aprobada.
La guía oficial es `design-system/docs/ADS-002_sistema_documental.md`.

## Instrucciones

1. Leer completamente el Markdown fuente en `reports/sources/<tipo>/`.
2. Verificar metadata obligatoria: `DOCUMENTO`, `VERSION`, `FECHA`, `ESTADO`,
   `FUENTE` y `TIPO_INFORME`.
3. Leer `design-system/themes/almacen.css` y `design-system/themes/reports.css`.
4. Elegir template:
   - `AVANCE_ALMACEN` → `design-system/templates/report-avance-almacen.html`;
   - `TECNICO_INTERNO` → `design-system/templates/report-tecnico-interno.html`.
5. Reemplazar todos los placeholders con contenido comprobado.
6. Incluir `{{ROADMAP_COMPLETO_HTML}}` con todas las fases vigentes, no solo las
   ejecutadas. Marcar claramente realizado, prioridad actual y pendiente.
7. Para un HTML dentro de `reports/html/<tipo>/`, usar
   `{{DESIGN_SYSTEM_BASE}} = ../../../design-system`.
8. Guardar usando la convención `YYYY-MM-DD_tipo-descripcion_vN.N.html`.
9. Abrir en navegador y comparar con la iteración compacta v0.2.1.
10. Verificar que no quedan placeholders, rutas rotas ni secretos.

## Reglas por tipo

### Informe para el Almacén

- lenguaje accesible;
- resumen breve;
- tarjetas de estado;
- fases principales;
- información realizada y pendiente;
- próximos pasos y síntesis;
- evitar rutas, commits y detalles técnicos innecesarios.

### Informe técnico interno

- arquitectura y producción;
- Google Sheets y Apps Script;
- seguridad y variables solo por nombre;
- validaciones y riesgos;
- próximos pasos técnicos;
- nunca incluir valores secretos, tokens, credenciales ni datos personales.

## Componentes permitidos

Usar las clases oficiales de `reports.css`: `.report-hero`, `.report-document-control`,
`.report-card`, `.report-phase`, `.report-badge`, `.report-checklist`, `.report-table`,
`.report-callout`, `.report-steps`, `.report-roadmap-grid`, `.report-synthesis` y
`.report-footer`. Mantener `.report-density-compact` en el elemento `<body>`.

No crear una estética nueva, no convertir el informe en landing page y no copiar un
bloque grande de CSS dentro del HTML generado.

## Estado actual

La conversión es manual. No ejecutar ni inventar un pipeline automático. No generar
PDF hasta que el HTML haya sido aprobado visualmente.
