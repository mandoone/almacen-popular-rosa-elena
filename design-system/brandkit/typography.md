# Tipografía — Almacén Popular Rosa Elena Morales Morales

Extraído de `src/app/layout.tsx` y `tailwind.config.ts` (auditoría 2026-06-26).

---

## Fuentes registradas

### Inter — fuente principal (sans-serif)
- **Proveedor:** Google Fonts via `next/font/google`
- **Variable CSS en la web:** `--font-inter`
- **Alias Tailwind:** `font-sans`
- **Variable CSS en DS:** `--font-sans`
- **Subsets:** latin
- **Uso:** cuerpo de texto, interfaz, botones, metadatos, formularios

### Playfair Display — fuente de marca (serif)
- **Proveedor:** Google Fonts via `next/font/google`
- **Variable CSS en la web:** `--font-playfair`
- **Alias Tailwind:** `font-serif`
- **Variable CSS en DS:** `--font-serif`
- **Subsets:** latin
- **Uso:** títulos (h1, h2), nombre de marca, blockquotes, elementos editoriales

> Fuentes locales `GeistVF.woff` y `GeistMonoVF.woff` existen en `src/app/fonts/` pero NO
> están cargadas en el proyecto. Se ignoran completamente.

---

## Jerarquía tipográfica

| Nivel | Fuente | Peso | Tamaño (mobile → desktop) | Color | Uso |
|---|---|---|---|---|---|
| H1 hero principal | Playfair Display | Bold (700) | 36px → 48px → 60px | white (sobre dark bg) | Página Home |
| H1 hero interior | Playfair Display | Bold (700) | 36px → 48px | white (sobre dark bg) | Páginas interiores |
| H2 sección | Playfair Display | Bold (700) | 30px → 36px | primary-dark | Títulos de bloque |
| H3 card | Inter | Bold (700) | 20px | primary-dark | Títulos de tarjeta |
| H4 / label | Inter | Bold (700) | 12px uppercase tracking-widest | primary | Etiquetas de sección |
| Cuerpo largo | Inter | Regular (400) | 18px | gray-700 | Párrafos de contenido |
| Cuerpo interfaz | Inter | Regular (400) | 16px | gray-700 | Texto general |
| Texto secundario | Inter | Medium (500) | 14px | gray-500 | Metadatos, captions |
| Texto mínimo | Inter | Regular (400) | 12px | gray-400 | IDs, fechas, badges |

---

## Escala de tamaños (Tailwind → px)

| Clase | px | Uso en el proyecto |
|---|---|---|
| `text-xs` | 12px | Badges, IDs, fechas en admin |
| `text-sm` | 14px | Inputs, botones secundarios, email footer |
| `text-base` | 16px | Links navbar, texto interfaz |
| `text-lg` | 18px | Cuerpo de texto en páginas de contenido |
| `text-xl` | 20px | Nombre de marca navbar, subtítulos hero |
| `text-2xl` | 24px | Subtítulos, nombre footer, total pedido |
| `text-3xl` | 30px | H2 secciones interiores |
| `text-4xl` | 36px | H2 secciones Home, H1 páginas interiores |
| `text-5xl` | 48px | H1 heroes |
| `text-6xl` | 60px | H1 Home desktop |

---

## Pesos tipográficos

| Clase | Peso | Uso |
|---|---|---|
| `font-medium` | 500 | Subtextos, links nav, descripciones |
| `font-semibold` | 600 | Botones primarios, nombres producto, precios |
| `font-bold` | 700 | Títulos, totales, badges, nombre de marca |

---

## Uso en templates HTML

Los templates cargan Inter y Playfair Display directamente desde Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap">
```

Las variables tipográficas están definidas en `../themes/almacen.css`:
- `--font-sans: 'Inter', sans-serif`
- `--font-serif: 'Playfair Display', serif`
