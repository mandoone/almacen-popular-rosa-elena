# Prompt: Generar informe de estado de la web
Almacén Popular Rosa Elena Morales Morales — Design System

---

## Cuándo usar este prompt

Cuando quieras generar un informe HTML con el estado actual de la web: progreso del proyecto,
componentes existentes, deudas técnicas, próximos pasos, etc.

El informe resultante se guarda en `reports/YYYY-MM-DD-descripcion.html` y puede exportarse
a PDF desde el browser (Ctrl+P → Guardar como PDF).

---

## Instrucciones para Claude

Eres el diseñador y documentador técnico del proyecto **Almacén Popular Rosa Elena Morales Morales**.

Tu tarea es generar un informe HTML completo usando el template `design-system/templates/report-base.html`
como base y los estilos de `design-system/themes/almacen.css`.

### Pasos

1. Leer `design-system/templates/report-base.html` para entender la estructura.
2. Leer `design-system/themes/almacen.css` para las variables CSS disponibles.
3. Leer `design-system/docs/WEB_STYLE_AUDIT.md` como fuente de verdad del estado visual.
4. Leer `docs/PROJECT_STATE.md` y `docs/TASKS.md` del proyecto para el estado funcional.
5. Generar el informe rellenando el template con datos reales.
6. Guardar el resultado en `design-system/reports/YYYY-MM-DD-estado-web.html`.

### Qué debe incluir el informe

- **Portada:** nombre del proyecto, fecha, logo
- **Resumen ejecutivo:** 3-4 bullets del estado actual
- **Estado por fase:** FASE 0, FASE 1 (completadas), FASE 2+ (pendientes)
- **Inventario visual:** colores, tipografía, componentes existentes
- **Deudas técnicas:** lista priorizada
- **Próximos pasos recomendados**
- **Pie de página:** datos de contacto, fecha de generación

### Reglas de formato

- El HTML debe ser autocontenido (sin dependencias externas salvo Google Fonts y la ruta relativa al CSS).
- Usar las variables de `themes/almacen.css` para todos los colores y tipografías.
- El logo se referencia desde `../brandkit/assets/logo.png` (ruta relativa desde `reports/`).
- El informe debe verse bien impreso (usar clases `page-break`, `avoid-break`, `no-print` según corresponda).
- Tono: institucional pero accesible. El lector puede ser un vecino del barrio o un técnico.

### Qué NO hacer

- No inventar datos de contacto o estados del proyecto.
- No incluir precios de costo ni datos sensibles de la planilla.
- No incluir la URL ni el token de Apps Script.
- No modificar el template base ni el CSS del tema.

---

## Variables a rellenar en el template

```
{{FECHA}}           → fecha del informe (ej: 26 de junio de 2026)
{{VERSION}}         → número de versión o etapa (ej: FASE 1 completa)
{{RESUMEN}}         → 2-3 frases del estado general
{{ESTADO_FASE_0}}   → completado / en progreso / pendiente
{{ESTADO_FASE_1}}   → completado / en progreso / pendiente
{{ESTADO_FASE_2}}   → completado / en progreso / pendiente
```

---

## Ejemplo de invocación

> "Genera un informe de estado de la web con fecha de hoy. Usa el template base del DS y
>  rellénalo con el estado real del proyecto según PROJECT_STATE.md y TASKS.md."
