# Design System — Almacén Popular Rosa Elena Morales Morales

Sistema de diseño liviano para generar documentos e informes con la identidad visual del Almacén.

> Este NO es un sistema de componentes React. Es un kit de referencia visual + templates HTML
> estáticos para producir informes y documentos institucionales sin tocar la web.

---

## Objetivo inicial

Generar informes HTML/PDF de estado de la web usando la misma identidad visual del Almacén Popular:
paleta morada institucional, tipografía Inter + Playfair Display, logos y tono editorial.

---

## Estructura

```
design-system/
├── README.md          ← este archivo
├── brandkit/          ← identidad visual: colores, tipografía, assets
├── docs/              ← auditoría y decisiones de diseño
├── themes/            ← variables CSS nativas para templates
├── templates/         ← templates HTML de informes
├── prompts/           ← instrucciones para Claude para generar informes
└── reports/           ← informes generados (HTML → PDF)
```

---

## Flujo de trabajo

```
1. Pedir a Claude que genere un informe
   → usar prompts/generate-report.md como referencia

2. Claude rellena templates/report-base.html con datos reales

3. Guardar el resultado en reports/YYYY-MM-DD-nombre.html

4. Abrir en browser → Ctrl+P → Guardar como PDF
```

---

## Qué lee de la web (sin modificarla)

| Fuente en la web | Qué aporta al DS |
|---|---|
| `tailwind.config.ts` | Tokens de color y tipografía |
| `src/app/globals.css` | Reset y variables CSS existentes |
| `public/images/logo.png` | Logo principal (copiado en `brandkit/assets/`) |
| `public/images/logo-red.png` | Logo histórico (copiado en `brandkit/assets/`) |

**Regla:** nunca modificar `src/`, `public/`, `tailwind.config.ts` ni `globals.css` desde aquí.

---

## Qué NO hace este DS (todavía)

- No refactoriza componentes React de la web.
- No genera PDFs automáticamente (se hace manual vía browser).
- No tiene pipeline de build propio.
- No reemplaza a Tailwind en la web.
