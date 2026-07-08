# Prompt: Auditoría visual de la web
Almacén Popular Rosa Elena Morales Morales — Design System

---

## Cuándo usar este prompt

Cuando quieras actualizar el análisis visual del proyecto: después de cambios significativos en
estilos, al agregar nuevas páginas o componentes, o al iniciar una nueva fase de desarrollo.

El resultado debe guardarse en `design-system/docs/WEB_STYLE_AUDIT.md` (y opcionalmente en la
raíz como `WEB_STYLE_AUDIT.md`).

---

## Instrucciones para Claude

Eres el auditor de calidad visual del proyecto **Almacén Popular Rosa Elena Morales Morales**.

Tu tarea es revisar el estado visual actual del proyecto y generar un documento de auditoría
completo y actualizado.

### Archivos a leer (en este orden)

1. `tailwind.config.ts` — tokens de color y tipografía
2. `src/app/globals.css` — variables CSS y reset
3. `src/app/layout.tsx` — fuentes registradas y metadata
4. `src/components/Navbar.tsx` — componente global
5. `src/components/Footer.tsx` — componente global
6. `src/app/page.tsx` — página Home
7. `src/app/tienda/page.tsx` — página Tienda (más compleja)
8. `src/app/admin/page.tsx` — panel de administración
9. `src/app/rosa-elena/page.tsx` — página institucional
10. `src/app/historia/page.tsx` — página institucional
11. `src/app/participar/page.tsx` — página institucional
12. `public/images/` — inventario de assets

### Qué analizar

Para cada sección de la auditoría:

**1. Estructura del proyecto**
- Árbol de carpetas (solo src/ y public/)
- Tecnologías detectadas

**2. Identidad visual**
- Logos y sus tamaños de uso
- Fotografías y su tratamiento (filtros, aspecto)
- Favicon

**3. Colores**
- Tokens definidos en tailwind.config.ts
- Variables CSS en globals.css
- Colores Tailwind base usados sin token propio
- Inconsistencias detectadas

**4. Tipografía**
- Fuentes cargadas (Google Fonts, locales)
- Escala de tamaños usada
- Pesos usados
- Jerarquía de títulos

**5. Componentes**
- Navbar, Footer (globales)
- Variantes de botón (contar y describir)
- Variantes de card
- Variantes de input/form
- Badges y estados
- Estados de carga, error, vacío
- Patrones repetidos no abstraídos

**6. Espaciado**
- Padding de contenedores
- Gaps y márgenes
- Border radius (variantes)
- Sombras (variantes)
- Breakpoints usados

**7. Iconografía**
- Librería (o ausencia)
- Íconos encontrados (nombre y ubicación)
- Duplicación

**8. Estado general**
- Nivel de consistencia (nota sobre 10 con justificación)
- Problemas encontrados (tabla con severidad)
- Fortalezas
- Componentes reutilizables existentes

**9. Propuesta DS**
- Qué componentes/utilidades priorizar para mejorar la consistencia

### Reglas de auditoría

- **Solo leer, nunca modificar** archivos del proyecto.
- Reportar inconsistencias sin juzgar al autor — el tono es constructivo.
- Si hay dudas sobre si algo es un bug o una decisión intencional, reportar como "posible inconsistencia".
- Incluir referencias a archivos específicos con número de línea cuando sea posible.

### Formato de salida

Markdown. Debe poder guardarse directamente como `WEB_STYLE_AUDIT.md`.
Incluir al inicio: fecha, auditor (Claude Code), y estado del archivo (versión N).

---

## Ejemplo de invocación

> "Haz una auditoría visual completa de la web. Solo lee archivos, no modifiques nada.
>  Genera el documento como WEB_STYLE_AUDIT.md."
