# ADS-001 — Brand Kit Técnico
## Almacén Popular Rosa Elena Morales Morales

**Documento:** ADS-001  
**Fecha:** 2026-06-26  
**Versión:** 1.0  
**Fuentes:** `WEB_STYLE_AUDIT.md` · `tailwind.config.ts` · `src/app/globals.css` · `src/app/layout.tsx` · todos los componentes del proyecto  
**Estado:** Referencia cerrada — no modificar sin justificación documentada

---

## Tabla de contenidos

1. [Filosofía visual](#1-filosofía-visual)
2. [Paleta de colores completa](#2-paleta-de-colores-completa)
3. [Tokens principales](#3-tokens-principales)
4. [Tipografía](#4-tipografía)
5. [Escala tipográfica](#5-escala-tipográfica)
6. [Sistema de espaciados](#6-sistema-de-espaciados)
7. [Componentes reutilizables](#7-componentes-reutilizables)
8. [Estilo de botones](#8-estilo-de-botones)
9. [Cards](#9-cards)
10. [Formularios](#10-formularios)
11. [Header / Navbar](#11-header--navbar)
12. [Footer](#12-footer)
13. [Hero de página](#13-hero-de-página)
14. [Iconografía](#14-iconografía)
15. [Uso del logo](#15-uso-del-logo)
16. [Reglas de consistencia](#16-reglas-de-consistencia)
17. [Elementos que no deben modificarse](#17-elementos-que-no-deben-modificarse)
18. [Elementos que pueden evolucionar](#18-elementos-que-pueden-evolucionar)
19. [Reutilización en informes HTML](#19-reutilización-en-informes-html)

---

## 1. Filosofía visual

### Identidad

El Almacén Popular Rosa Elena Morales Morales es un proyecto comunitario sin fines de lucro.
Su identidad visual refleja tres valores simultáneos:

| Valor | Expresión visual |
|---|---|
| **Dignidad popular** | Paleta morada sobria, tipografía con serif de peso, sin frivolidad decorativa |
| **Accesibilidad** | Contraste alto, texto legible en todos los tamaños, sin dependencia de iconos para comunicar acciones |
| **Seriedad institucional** | Jerarquía tipográfica clara, componentes consistentes, ausencia de animaciones llamativas |

### Tono

- **No** es un e-commerce. No tiene estética de "oferta" ni de urgencia de venta.
- **No** es un sitio gubernamental. No es frío ni burocrático.
- **Es** un espacio vecinal digitalizado: cálido pero ordenado, accesible pero serio.

### Paleta como decisión política

El morado (#6B21A8) no es accidental. En la historia latinoamericana es el color asociado al
movimiento feminista y a la memoria de las mujeres víctimas de la dictadura. La identidad visual
honra eso sin nombrarlo explícitamente.

### Principio rector para documentos

> Cuando en duda, usa morado oscuro sobre blanco o crema. Nunca al revés.
> El texto sobre fondos oscuros siempre es blanco puro o lavanda (#C4B5FD), nunca gris.

---

## 2. Paleta de colores completa

### 2.1 Paleta institucional (tokens propios)

| Rol | Nombre | HEX | RGB | Tailwind token |
|---|---|---|---|---|
| Acción principal | Primary | `#6B21A8` | 107 · 33 · 168 | `primary` |
| Fondo suave / borde | Primary Light | `#C4B5FD` | 196 · 181 · 253 | `primary-light` |
| Fondos oscuros / marca | Primary Dark | `#3B0764` | 59 · 7 · 100 | `primary-dark` |
| Fondo de página | Background | `#F9F5FF` | 249 · 245 · 255 | `background` |

### 2.2 Neutros (Tailwind base, sin token propio)

| Nombre | HEX | Uso principal |
|---|---|---|
| Blanco puro | `#FFFFFF` | Cards, navbar, inputs, secciones alternas |
| Texto cuerpo | `#374151` | Párrafos largos (gray-700) |
| Texto secundario | `#6B7280` | Descripciones, captions (gray-500) |
| Texto muted | `#9CA3AF` | Fechas, IDs, placeholders (gray-400) |
| Icono placeholder | `#D1D5DB` | SVG de imagen ausente (gray-300) |
| Borde general | `#E5E7EB` | Divisores, bordes de inputs (gray-200) |
| Fondo hover mínimo | `#F9FAFB` | Hover de links menú (gray-50) |
| Fondo hover visible | `#F3F4F6` | Hover de botones blancos (gray-100) |

### 2.3 Colores de estado (sin token — Tailwind base)

Usados en el panel de administración. **No usar en páginas públicas.**

| Estado | HEX | Clase Tailwind | Contexto |
|---|---|---|---|
| Éxito / Entregado | `#16A34A` | `green-600` | Badge entregado, botón Entregado, botón WhatsApp |
| Advertencia / Listo | `#EAB308` | `yellow-500` | Badge listo, botón Marcar listo |
| Pendiente | `#C2410C` | `orange-700` | Badge pendiente |
| Error / Cancelar | `#DC2626` | `red-600` | Badge cancelado, botón Cancelar, texto Vaciar |

### 2.4 Muestra de paleta institucional

```
┌─────────────────────────────────────────────────────────────────┐
│  PRIMARY DARK    │  PRIMARY         │  PRIMARY LIGHT  │  BG     │
│  #3B0764         │  #6B21A8         │  #C4B5FD        │  #F9F5FF│
│  Hero · Footer   │  Acciones · CTA  │  Bordes · Suave │  Fondo  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tokens principales

Definidos en `tailwind.config.ts`. Estos son los únicos tokens propios del proyecto.
Todo lo demás es Tailwind base.

```typescript
// tailwind.config.ts — extracto
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: "#6B21A8",   // --color-primary
        light:   "#C4B5FD",   // --color-primary-light
        dark:    "#3B0764",   // --color-primary-dark
      },
      background: "#F9F5FF",  // --color-background
    },
    fontFamily: {
      sans:  ["var(--font-inter)",    "sans-serif"],
      serif: ["var(--font-playfair)", "serif"],
    },
  },
},
```

### Equivalencia CSS nativa (para templates fuera de Tailwind)

Ver `design-system/themes/almacen.css` para la equivalencia completa.
Tokens críticos:

| Token Tailwind | Variable CSS DS | Valor |
|---|---|---|
| `primary` | `--color-primary` | `#6B21A8` |
| `primary-light` | `--color-primary-light` | `#C4B5FD` |
| `primary-dark` | `--color-primary-dark` | `#3B0764` |
| `background` | `--color-background` | `#F9F5FF` |
| `font-sans` | `--font-sans` | Inter, sans-serif |
| `font-serif` | `--font-serif` | Playfair Display, serif |

---

## 4. Tipografía

### 4.1 Fuentes

#### Inter — cuerpo y UI

```
Fuente:    Inter
Proveedor: Google Fonts
Carga:     next/font/google (layout.tsx)
Variable:  --font-inter → alias font-sans
Subsets:   latin
Pesos:     400 (regular) · 500 (medium) · 600 (semibold) · 700 (bold)
Uso:       Todo el texto de interfaz, párrafos, botones, metadatos, formularios
```

#### Playfair Display — marca y títulos

```
Fuente:    Playfair Display
Proveedor: Google Fonts
Carga:     next/font/google (layout.tsx)
Variable:  --font-playfair → alias font-serif
Subsets:   latin
Pesos:     700 (bold)
Uso:       Nombre de marca, H1, H2, blockquotes editoriales
```

### 4.2 Combinación tipográfica

La dualidad Inter + Playfair no es cosmética: crea una distinción entre el sistema
(Inter, neutral, funcional) y el contenido institucional (Playfair, editorial, con autoridad).

| Contexto | Fuente | Efecto |
|---|---|---|
| Nombre de marca, títulos de sección | Playfair Display | Identidad, peso editorial |
| Cuerpo, labels, botones, metadatos | Inter | Claridad, legibilidad en pantalla |
| Citas históricas (blockquote) | Playfair Display italic | Peso memorial, diferenciación |

---

## 5. Escala tipográfica

### 5.1 Tamaños

| Nivel | px | rem | Clase Tailwind | Uso en el proyecto |
|---|---|---|---|---|
| XS | 12px | 0.75rem | `text-xs` | IDs de pedido, fechas admin, texto badges, copyright |
| SM | 14px | 0.875rem | `text-sm` | Texto carrito, inputs, botones secundarios, email footer |
| BASE | 16px | 1rem | `text-base` | Links navbar, texto UI general |
| LG | 18px | 1.125rem | `text-lg` | Párrafos de contenido editorial, subtítulos hero |
| XL | 20px | 1.25rem | `text-xl` | Nombre de marca en navbar, subtítulos de sección |
| 2XL | 24px | 1.5rem | `text-2xl` | Subtítulos, nombre en footer, total pedido admin |
| 3XL | 30px | 1.875rem | `text-3xl` | H2 de secciones interiores |
| 4XL | 36px | 2.25rem | `text-4xl` | H1 páginas interiores · H2 Home |
| 5XL | 48px | 3rem | `text-5xl` | H1 hero páginas interiores (desktop) |
| 6XL | 60px | 3.75rem | `text-6xl` | H1 hero Home (solo lg breakpoint) |

### 5.2 Pesos

| Clase | Valor | Uso |
|---|---|---|
| `font-medium` | 500 | Subtextos, links de navegación, datos de contacto |
| `font-semibold` | 600 | Botones principales, nombres de producto, precios |
| `font-bold` | 700 | Títulos H1/H2/H3, totales, badges, nombre de marca |

### 5.3 Jerarquía de títulos

```
H1 HERO HOME
  font-serif · bold · 4xl→5xl→6xl · white · sobre primary-dark
  Ejemplo: "Almacén Popular Rosa Elena Morales Morales"

H1 HERO INTERIOR
  font-serif · bold · 4xl→5xl · white · sobre primary-dark
  Ejemplo: "Nuestra Historia", "Sé parte del Almacén Popular"

H2 SECCIÓN
  font-serif · bold · 3xl→4xl · primary-dark · sobre bg blanco o crema
  Ejemplo: "Un almacén de y para la comunidad"

H3 CARD
  font-sans · bold · xl · primary-dark
  Ejemplo: "Precios justos", "Autogestión"

H4 / LABEL DE SECCIÓN
  font-sans · bold · xs · uppercase · tracking-widest · primary
  Ejemplo: "Nuestra Inspiración"
```

### 5.4 Line heights usados

| Clase | Valor | Contexto |
|---|---|---|
| `leading-tight` | 1.25 | Títulos grandes (H1, H2) |
| `leading-snug` | 1.375 | Subtítulos, blockquotes |
| `leading-normal` | 1.5 | Texto de interfaz |
| `leading-relaxed` | 1.625 | Párrafos de contenido largo |

---

## 6. Sistema de espaciados

Base: **4px** (escala Tailwind por defecto, sin personalizar).

### 6.1 Padding de contenedores (responsivo)

```
Horizontal: px-4 (16px) → sm:px-6 (24px) → lg:px-8 (32px)
Máximo de contenido:
  max-w-3xl  = 768px   (texto largo, 1 columna)
  max-w-4xl  = 896px   (contenido mixto)
  max-w-6xl  = 1152px  (contenido + imagen)
  max-w-7xl  = 1280px  (grids completos, tienda)
  max-w-5xl  = 1024px  (panel admin)
```

### 6.2 Padding vertical de secciones

| Clase | px | Uso |
|---|---|---|
| `py-4` | 16 | Banners de aviso, notificaciones |
| `py-8` | 32 | Contenido admin |
| `py-12` | 48 | Secciones de apoyo menores |
| `py-16` | 64 | Secciones con logo/galería |
| `py-20` | 80 | Secciones de contenido estándar |
| `py-24` | 96 | Heroes, CTAs finales importantes |

### 6.3 Gaps

| Clase | px | Uso típico |
|---|---|---|
| `gap-2` | 8 | Entre elementos inline muy próximos |
| `gap-3` | 12 | Icono + texto en footer, botones small |
| `gap-4` | 16 | Elementos de formulario, items de lista |
| `gap-6` | 24 | Columnas flex compactas |
| `gap-8` | 32 | Grids de cards |
| `gap-12` | 48 | Secciones internas con separación clara |
| `gap-20` | 80 | Columnas de layout mayores (lg) |

### 6.4 Border radius

| Clase | px | Uso semántico |
|---|---|---|
| `rounded-md` | 6px | Botones, inputs, dropdowns |
| `rounded-lg` | 8px | Icon containers, imágenes, cards feature |
| `rounded-xl` | 12px | Cards principales (producto, admin, sidebar) |
| `rounded-full` | 9999px | Badges, pills de filtro, botones +/- circulares |

### 6.5 Sombras

| Clase | Descripción | Uso |
|---|---|---|
| `shadow-sm` | Muy sutil | Cards producto, cards feature |
| `shadow-md` | Moderada | Sidebar carrito (desktop) |
| `shadow-xl` | Notable | Foto retrato en Home |
| `shadow-2xl` | Flotante | Panel carrito móvil (fixed bottom) |

---

## 7. Componentes reutilizables

Estado actual: todos los componentes son **inline** en sus páginas.
Solo Navbar y Footer están extraídos como componentes React formales.

### Mapa de componentes existentes

| Componente | Archivo | Estado |
|---|---|---|
| Navbar | `src/components/Navbar.tsx` | ✅ Componente formal |
| Footer | `src/components/Footer.tsx` | ✅ Componente formal |
| CarritoPanel | Inline en `tienda/page.tsx` | ⚠ Function local |
| ImagenProducto | Inline en `tienda/page.tsx` | ⚠ Function local |
| LoginScreen | Inline en `admin/page.tsx` | ⚠ Function local |
| AdminPanel | Inline en `admin/page.tsx` | ⚠ Function local |
| Spinner (SVG) | Inline en tienda y admin | ⚠ Duplicado |
| EmptyState | Inline en tienda y admin | ⚠ Duplicado |
| ErrorState | Inline en admin | ⚠ Duplicado |
| FeatureCard | Inline en home, historia, participar | ⚠ Triplicado |
| Hero sección | Inline en 4 páginas | ⚠ Cuadruplicado |
| Section wrapper | Inline en ~25 secciones | ⚠ Muy repetido |
| Badge de estado | Inline en admin | ⚠ Sin abstraer |

---

## 8. Estilo de botones

Se detectaron **10 variantes** de botón en uso. Ninguna está abstraída como componente.

### Variante 1 — Primary solid (acción principal)
```
bg-primary text-white font-semibold px-{6|8} py-3 rounded-md
hover:bg-primary-dark transition-colors
Uso: CTA general, "Agregar" producto, "Conocer su historia"
```

### Variante 2 — Primary dark solid (acción en sección clara)
```
bg-primary-dark text-white font-medium px-6 py-3 rounded-md
hover:bg-primary transition-colors
Uso: "¿Cómo funciona?" en sección primary-light
```

### Variante 3 — White on dark (acción primaria en hero oscuro)
```
bg-white text-primary-dark font-semibold px-8 py-3 rounded-md
hover:bg-gray-100 transition-colors
Uso: "Ver productos" en hero, "Ingresar" en admin login
```

### Variante 4 — White outlined on dark (acción secundaria en hero oscuro)
```
border-2 border-white text-white font-semibold px-8 py-3 rounded-md
hover:bg-white/10 transition-colors
Uso: "Conoce nuestra historia" como secundario en hero Home
```

### Variante 5 — White on primary (acción en sección morada)
```
bg-white text-primary font-bold px-8 py-4 rounded-md text-lg
hover:bg-gray-100 transition-colors
Uso: "Quiero participar" en sección bg-primary, CTAs finales
```

### Variante 6 — Green (acción de éxito / WhatsApp)
```
bg-green-600 text-white font-semibold px-6 py-3 rounded-md
hover:bg-green-700 disabled:bg-green-600/60 transition-colors
Uso: "Enviar pedido por WhatsApp", "Escríbenos por WhatsApp"
```

### Variante 7 — Yellow action (acción admin transición)
```
bg-yellow-500 text-white text-sm font-medium px-4 py-2 rounded-md
hover:bg-yellow-600 disabled:opacity-50 transition-colors
Uso: "Marcar listo" en panel admin
```

### Variante 8 — Ghost pill (filtros de listado)
```
px-4 py-2 rounded-full text-sm font-medium transition-colors
  Activo:   bg-primary text-white
  Inactivo: bg-white text-gray-600 border border-gray-200
            hover:border-primary hover:text-primary
Uso: Filtros de estado en panel admin
```

### Variante 9 — Red ghost (acción destructiva)
```
text-sm text-red-500 border border-red-200 px-3 py-2 rounded-md
hover:bg-red-50 disabled:opacity-50 transition-colors
Uso: "Cancelar pedido" en admin
```

### Variante 10 — Text link (acción inline sin peso visual)
```
text-sm text-primary hover:text-primary-dark transition-colors
Uso: "Actualizar", "Cerrar sesión" en navbar admin
Variante roja: text-xs text-red-500 hover:text-red-700
Uso: "Vaciar" carrito
```

### Variante 11 — Round ±  (controles de cantidad)
```
w-{7|9} h-{7|9} rounded-full bg-primary-light text-primary-dark
font-bold text-{sm|lg} flex items-center justify-center
hover:bg-primary hover:text-white transition-colors
Uso: +/- en carrito (sidebar y cards de producto)
```

---

## 9. Cards

Se detectaron **3 variantes** de card en uso.

### Card de producto
```
bg-white rounded-xl shadow-sm overflow-hidden flex flex-col gap-2
│
├── Imagen: w-full aspect-square (o fallback SVG en bg-gray-100)
└── Cuerpo: px-2/4 pb-2/4 flex flex-col gap-2
    ├── Nombre: text-xs/sm font-semibold text-primary-dark leading-tight
    ├── Precio: font-bold text-sm/lg text-primary
    └── Acción: botón "Agregar" o controles +/-
```

### Card feature (características / legado)
```
bg-white rounded-lg shadow-sm p-8 flex flex-col gap-4
│
├── Icono container: w-14 h-14 bg-primary-light/30 rounded-lg
│                   flex items-center justify-center text-primary-dark
│   └── SVG: w-7 h-7 (Heroicons outline, stroke-2)
├── Título: font-bold text-xl text-primary-dark
└── Descripción: text-gray-600 leading-relaxed
```
Variante hover: `hover:shadow-md transition-shadow` (en /rosa-elena, legado).

### Card de pedido (admin)
```
bg-white rounded-xl shadow-sm p-6
│
├── Cabecera flex: nombre + badge estado
│   ├── Nombre: font-semibold text-primary-dark text-lg
│   ├── Teléfono: text-sm text-primary hover:underline (enlace tel:)
│   └── Meta: text-xs text-gray-400 (id · fecha)
├── Detalle (expandible): ul space-y-1.5 border-t border-gray-100 pt-4
└── Pie: flex gap-3 border-t border-gray-100 pt-4
    ├── Total: font-bold text-xl text-primary
    ├── Select estado_pago
    └── Botones de acción
```

---

## 10. Formularios

Se detectaron **4 variantes** de input sin estandarizar.

### Input estándar (carrito)
```
border border-gray-300 rounded-md px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-primary
```

### Input de búsqueda (tienda)
```
bg-white border border-primary-light rounded-lg pl-10 pr-4 py-2.5 text-sm
focus:outline-none focus:ring-2 focus:ring-primary
(+ icono lupa absolute-left)
```

### Input de contraseña (admin login)
```
px-4 py-3 rounded-md text-sm
focus:outline-none focus:ring-2 focus:ring-primary-light
(sin borde explícito)
```

### Select (admin pago)
```
border border-gray-200 rounded-md px-2 py-1 text-xs
focus:outline-none focus:ring-2 focus:ring-primary
disabled:opacity-50
```

### Inconsistencias detectadas

| Parámetro | Variación detectada |
|---|---|
| `border-color` | `gray-300` / `primary-light` / `gray-200` / sin borde |
| `border-radius` | `rounded-md` / `rounded-lg` |
| `padding` | `px-3 py-2` / `pl-10 pr-4 py-2.5` / `px-4 py-3` / `px-2 py-1` |
| `focus:ring-color` | `ring-primary` / `ring-primary-light` |

**Recomendación:** estandarizar en una variante base + modificadores antes de FASE 2.

---

## 11. Header / Navbar

**Archivo:** `src/components/Navbar.tsx`

```
Posición:   sticky top-0 z-50
Fondo:      bg-white
Borde:      border-b border-primary-light
Altura:     h-20 (80px)
Max-width:  max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

### Zona izquierda — marca
```
Logo PNG: w-16 h-16 (64px), object-contain
Nombre:   font-serif text-primary-dark text-xl sm:text-2xl font-bold
Enlace:   /  (toda la zona es clickeable)
```

### Zona derecha — navegación desktop (md:)
```
Links: text-base font-medium transition-colors
  Inactivo: text-gray-700 hover:text-primary-light
  Activo:   text-primary underline underline-offset-4 decoration-2
Separación entre links: space-x-8
```

### Menú móvil (< md)
```
Trigger: botón hamburger / X (SVG 24px, text-primary-dark)
Panel:   border-t border-primary-light, bg-white
Links:   block px-3 py-2 rounded-md text-base font-medium
  Inactivo: text-gray-700 hover:text-primary hover:bg-gray-50
  Activo:   text-primary bg-gray-50 underline underline-offset-4
```

### Páginas detectadas en navegación

```
/ Inicio · /tienda Tienda · /rosa-elena Rosa Elena · /historia Historia · /participar Participar
```

---

## 12. Footer

**Archivo:** `src/components/Footer.tsx`

```
Fondo:      bg-primary-dark
Color base: text-white
Padding:    pt-12 pb-8
Max-width:  max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Layout:     flex flex-col items-center
```

### Estructura de contenido

```
1. Logo PNG: w-20 h-20 (80px), object-contain, mb-4
2. Nombre:  font-serif text-2xl font-bold text-center mb-6
            "Almacén Popular Rosa Elena Morales Morales"
3. Contacto (flex col → md:row, gap-6/12, mb-10):
   ├── Dirección: icono map-pin text-primary-light + texto
   └── Email:     icono envelope text-primary-light + <a> text-sm hover:text-primary-light
4. Social (flex col, gap-4, mb-10):
   ├── WhatsApp: icono filled 24px + "+56950807172"
   └── Instagram: icono filled 24px + "@almacenpopular.rosamoralesm"
5. Divisor: w-full h-px bg-primary-light/30 mb-8
6. Frase + Copyright: text-sm text-primary-light text-center flex flex-col gap-2
```

### Íconos de contacto en footer

Todos SVG inline, `h-5 w-5`, color `text-primary-light`:
- Map pin (dirección)
- Envelope (email)
- WhatsApp path filled
- Instagram path filled

---

## 13. Hero de página

Patrón que se repite en **todas las páginas interiores** (Historia, Rosa Elena, Participar, Tienda).
No existe como componente — está duplicado 4 veces.

### Estructura base

```html
<section class="bg-primary-dark text-white py-24 px-4 sm:px-6 lg:px-8
                flex flex-col items-center justify-center text-center">
  <h1 class="font-serif font-bold text-white text-4xl sm:text-5xl mb-4 [max-w-3xl leading-tight?]">
    Título de la página
  </h1>
  <p class="text-primary-light text-lg sm:text-xl">
    Subtítulo
  </p>
</section>
```

### Variación en Home

El hero de Home es diferente: incluye logo (160px), H1 en 4xl→5xl→6xl, bajada en `text-primary-light`,
y dos CTAs (botón white solid + botón white outlined).

### Variación Tienda

`py-20` en vez de `py-24`. Sin elementos adicionales.

---

## 14. Iconografía

### Sistema: SVG inline (sin librería externa)

Todos los íconos son paths SVG embebidos directamente en JSX. Estilo visual: Heroicons v2 outlined,
`strokeWidth={2}`, `stroke="currentColor"`, `fill="none"`.

Excepción: íconos de WhatsApp e Instagram son SVG filled (`fill="currentColor"`).

### Catálogo de íconos detectados

| Ícono | Descripción | Aparece en | Duplicado |
|---|---|---|---|
| Shopping cart | Carrito de compras | Home, Historia, Tienda (barra móvil), EmptyStates | 4x |
| Shopping bag (box) | Caja/producto sin imagen | Tienda (placeholder imagen) | 1x |
| Map pin | Marcador de ubicación | Footer | 1x |
| Envelope | Email | Footer | 1x |
| Calendar | Calendario/fecha | Home (apertura), Historia | 2x |
| Users | Grupo de personas | Historia | 1x |
| Handshake | Apretón de manos | Home (Autogestión) | 1x |
| Heart | Corazón | Home (Comunidad), Participar | 2x |
| Clock | Reloj | Participar (turnos) | 1x |
| Megaphone | Altavoz / difusión | Participar | 1x |
| Search | Lupa de búsqueda | Tienda (buscador) | 1x |
| Chevron up/down | Flechas direccionales | Tienda (toggle carrito) | 1x |
| Hamburger (≡) | Menú cerrado | Navbar | 1x |
| X close | Menú abierto | Navbar | 1x |
| WhatsApp | Logo WhatsApp | Footer, Tienda, Participar | 3x |
| Instagram | Logo Instagram | Footer, Participar | 2x |

### Tamaños usados

| Contexto | Tamaño clase |
|---|---|
| Íconos de contacto en footer | `h-5 w-5` (20px) |
| Íconos de feature card | `w-7 h-7` (28px) |
| Íconos sociales (WA, IG) | `w-6 h-6` (24px) |
| Íconos en carrito y acciones | `w-5 h-5` (20px) |
| Íconos de estado vacío | `w-12 h-12` (48px) |
| Íconos en placeholder imagen | `w-10 h-10` (40px) |
| Spinner (loading) | `w-8 h-8` / `w-10 h-10` |
| Íconos en navbar (hamburger) | `h-6 w-6` (24px) |

---

## 15. Uso del logo

### Archivos disponibles

| Archivo | Formato | Tamaño | Descripción |
|---|---|---|---|
| `public/images/logo.png` | PNG | 137 KB | Logo principal del Almacén Popular |
| `public/images/logo-red.png` | PNG | 22 KB | Logo histórico Red de Abastecimiento |
| `design-system/brandkit/assets/logo.png` | PNG | copia | Para uso en templates HTML del DS |
| `design-system/brandkit/assets/logo-red.png` | PNG | copia | Para uso en templates HTML del DS |

### Tamaños de uso del logo principal

| Contexto | Tamaño | Prop `sizes` |
|---|---|---|
| Navbar (sticky) | `w-16 h-16` = 64px | `"64px"` |
| Footer | `w-20 h-20` = 80px | `"80px"` |
| Hero Home | `w-40 h-40` = 160px | `"160px"` |
| Admin navbar | `width={40} height={40}` | — |
| Admin login | `width={80} height={80}` | — |
| Templates DS (portada informe) | 100px recomendado | — |

### Reglas de uso del logo

1. Siempre usar `object-contain`, nunca `object-cover` (no recortar).
2. Sobre fondos oscuros (primary-dark) y sobre fondos claros (white, background): ambos OK.
3. El logo no se tinta ni se aplica `grayscale`.
4. No aplicar `opacity` al logo.
5. Tamaño mínimo recomendado: 40px. Por debajo pierde detalle.

### Logo histórico (`logo-red.png`)

Aparece únicamente en la página `/historia` para ilustrar el origen del proyecto.
**No usar** en comunicaciones actuales del Almacén Popular como identidad primaria.
Es un elemento de contenido editorial, no un logo alternativo.

---

## 16. Reglas de consistencia

### 16.1 Color

- El texto sobre fondos oscuros (`primary-dark`) siempre es `white` o `primary-light`. **Nunca gris.**
- Los fondos hero son siempre `primary-dark`. La única excepción es el hero de Home que usa
  el mismo color pero con más altura (`min-h-[80vh]`).
- El color de acción principal es `primary`. No usar `primary-dark` en botones de acción.
- Los colores de estado (green, yellow, orange, red) **solo van en el panel admin**, nunca en páginas públicas.

### 16.2 Tipografía

- Los H1 y H2 de sección son siempre `font-serif`.
- Los H3 de cards y subtítulos de interfaz son siempre `font-sans`.
- El color de H2/H3 sobre fondo claro es siempre `text-primary-dark`.
- El peso de los títulos es siempre `font-bold` (700). No usar semibold en títulos.
- Los `label` de sección (número, categoría) son `text-xs uppercase tracking-widest text-primary`.

### 16.3 Layout

- Los contenedores de contenido siempre tienen `max-w-{xl} mx-auto px-4 sm:px-6 lg:px-8`.
- Las secciones alternan fondo en este orden típico: `primary-dark` → `primary-light` → `white` → `background` → `primary`.
- El padding vertical de secciones estándar es `py-20`. Heroes y CTAs finales usan `py-24`.

### 16.4 Componentes

- Los botones siempre tienen `transition-colors` y un estado hover visible.
- Los botones deshabilitados usan `disabled:opacity-50` o `disabled:bg-{color}/60`.
- Los links de navegación activos siempre tienen `underline underline-offset-4`.
- Los inputs siempre tienen `focus:ring-2 focus:ring-primary` (o `focus:ring-primary-light` en dark bg).

---

## 17. Elementos que no deben modificarse

Estos elementos forman parte de la identidad visual consolidada del proyecto.
Cualquier cambio requiere decisión documentada en `design-system/docs/decisions.md`.

| Elemento | Razón de protección |
|---|---|
| Colores institucionales (`#6B21A8`, `#3B0764`, `#C4B5FD`, `#F9F5FF`) | Identidad definida y aplicada en todo el sitio |
| Fuentes Inter + Playfair Display | Par tipográfico que define el carácter del proyecto |
| Logo principal (`logo.png`) | Imagen institucional — cambio requiere rediseño formal |
| Estructura del Navbar (logo + links + hamburger) | Consistencia de navegación en todas las páginas |
| Estructura del Footer (logo + contacto + social + copyright) | Identidad institucional y datos de contacto |
| Patrón de Hero (`bg-primary-dark` + `text-white` + H1 serif) | Marca visual en todas las páginas interiores |
| Patrón de CTA final (`bg-primary` + botón blanco) | Cierre de secciones de captación |
| Tratamiento de fotografías Rosa Elena (grayscale + hover color) | Elección editorial con carga simbólica |

---

## 18. Elementos que pueden evolucionar

Estos elementos son candidatos a mejora sin afectar la identidad central del proyecto.

| Elemento | Evolución sugerida |
|---|---|
| Variantes de botón (10 no abstraídas) | Extraer componente `Button` con 5 variantes semánticas |
| Variantes de input (4 inconsistentes) | Unificar en 1 variante base + modificadores |
| Hero repetido en 4 páginas | Abstraer como componente `PageHero` |
| Section wrapper repetido ~25 veces | Abstraer como componente `Section` + `Container` |
| Cards feature triplicadas | Abstraer como componente `FeatureCard` |
| Íconos SVG duplicados | Crear barrel `design-system/icons/index.tsx` |
| `alert()` nativo (feedback) | Reemplazar por componente `Toast` |
| Fechas hardcodeadas en Home | Consumir desde CONFIG de Google Sheets |
| WhatsApp number hardcodeado | Extraer a variable de entorno o CONFIG |
| Archivos Geist (woff) muertos | Eliminar o registrar |
| Conflicto `--background` vs `bg-background` | Resolver ambigüedad (ver ADS decisions) |

---

## 19. Reutilización en informes HTML

Esta sección identifica qué patrones del sitio web pueden trasladarse directamente a los
templates HTML del Design System (`design-system/templates/`).

### 19.1 Trasladables tal como están (copiar patrón)

| Patrón web | Equivalente en informe | Notas |
|---|---|---|
| Portada hero (`bg-primary-dark` + logo + h1 serif) | `<header class="cover">` en `report-base.html` | Ya implementado |
| Footer (`bg-primary-dark` + datos contacto) | `<footer class="report-footer">` en `report-base.html` | Ya implementado |
| Label de sección (`text-xs uppercase tracking-widest primary`) | `.section-label` en `report-base.html` | Ya implementado |
| H2 con línea inferior | `.section-title` (serif + border-bottom primary-light) | Ya implementado |
| Badge de estado (pills) | `.badge-done` / `.badge-pending` etc. | Ya implementado |
| Blockquote editorial | `border-l-4 border-primary pl-6 italic` | Disponible para usar |
| Feature card (icono + título + desc) | `.summary-card` en `report-base.html` | Adaptado |

### 19.2 Trasladables con adaptación

| Patrón web | Adaptación para informe | Por qué adaptar |
|---|---|---|
| Product card | No aplica | Contenido de tienda, no de informe |
| Carrito panel | No aplica | Funcionalidad interactiva |
| Admin badge (naranja, amarillo, verde, gris) | Tabla de fases con badges simples | El informe usa estados de proyecto, no de pedido |
| Grid de productos (3-5 col) | Grid de métricas (`.summary-grid`) | Adapta la estructura, no el contenido |
| Steps list (con número circular) | `.steps-list` + `.step-number::before` | Ya implementado en template |

### 19.3 No trasladables (quedan en la web)

| Elemento | Por qué no trasladar |
|---|---|
| Navbar con `usePathname`, `useState` | Requiere React — no aplica en HTML estático |
| Buscador de tienda | Interactividad React |
| Panel admin | Completamente funcional/dinámico |
| CarritoPanel | Específico de la experiencia de compra |
| Íconos de producto placeholder | Contexto de tienda |

### 19.4 Elementos del DS que extienden la web

El DS agrega patrones que la web aún no tiene pero que podría adoptar en fases futuras:

| Elemento DS | Estado en la web | Oportunidad |
|---|---|---|
| `Toast` (reemplaza `alert()`) | No existe — usa `alert()` nativo | FASE 2 o FASE 4 |
| `EmptyState` formal | Inline y duplicado | FASE 4 (DS React) |
| `Spinner` como componente | Inline y duplicado | FASE 4 (DS React) |
| `.callout` (nota destacada) | No existe | Útil para admin y tienda |
| Tabla de datos estilizada | No existe (admin usa divs) | FASE 2 si crece el admin |

---

## Historial de este documento

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-06-26 | Documento inicial — Brand Kit técnico completo |

---

*ADS-001 · Brand Kit Técnico · Almacén Popular Rosa Elena Morales Morales*  
*Generado por análisis estático del proyecto. No se modificó ningún archivo de la web.*
