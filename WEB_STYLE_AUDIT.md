# WEB_STYLE_AUDIT.md
# Auditoría Visual — Almacén Popular Rosa Elena Morales Morales
Fecha: 2026-06-26 | Auditor: Claude Code (análisis estático, sin modificar archivos)

---

## 1. Resumen ejecutivo

El proyecto es un sitio web en **Next.js 14 App Router** con **Tailwind CSS 3.4** y **TypeScript**.
Tiene 6 páginas públicas + 1 panel admin, 2 componentes globales (Navbar y Footer) y un backend
conectado vía Google Apps Script.

El sistema visual tiene una **paleta de colores bien definida** (morado institucional en 3 tonos)
y una **tipografía dual coherente** (Inter sans-serif + Playfair Display serif). Sin embargo, NO
existe aún ningún Design System formal: los estilos están completamente inline como clases de
Tailwind repetidas en cada archivo, sin componentes reutilizables para botones, cards, badges,
formularios ni secciones.

**Nivel de consistencia visual: 6/10.** El sistema de colores y tipografía es sólido, pero la
ejecución es repetitiva y contiene varias inconsistencias técnicas que conviene resolver antes de
escalar el proyecto.

---

## 2. Inventario visual

### 2.1 Estructura del proyecto

```
WEB_Almacen_Popular/
├── src/
│   ├── app/
│   │   ├── globals.css           ← CSS global (solo reset + vars CSS)
│   │   ├── layout.tsx            ← Root layout (fonts, metadata, Navbar, Footer)
│   │   ├── page.tsx              ← Home (5 secciones)
│   │   ├── tienda/page.tsx       ← Catálogo + carrito (fullstack, 'use client')
│   │   ├── rosa-elena/page.tsx   ← Galería + historia
│   │   ├── historia/page.tsx     ← Origen del proyecto
│   │   ├── participar/page.tsx   ← Formas de participar
│   │   ├── admin/page.tsx        ← Panel admin (login + gestión pedidos)
│   │   ├── fonts/
│   │   │   ├── GeistVF.woff      ← ⚠ NO cargado en layout (archivo muerto)
│   │   │   └── GeistMonoVF.woff  ← ⚠ NO cargado en layout (archivo muerto)
│   │   └── favicon.ico
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── lib/
│       └── appsScriptPedidos.ts
├── public/
│   └── images/
│       ├── logo.png              ← Logo principal
│       ├── logo-red.png          ← Logo histórico Red de Abastecimiento
│       ├── rosa-elena-1.jpg      ← Fotografía (usada en Home y en /rosa-elena)
│       ├── rosa-elena-2.jpg      ← Fotografía
│       ├── rosa-elena-3.jpg      ← Fotografía
│       ├── rosa-elena-4.jpg      ← Fotografía
│       └── productos/.gitkeep   ← Directorio vacío (imágenes de productos pendientes)
└── tailwind.config.ts            ← Tokens de color y tipografía definidos aquí
```

**Tecnologías:**
- Framework: Next.js 14 (App Router)
- Lenguaje: TypeScript
- CSS: Tailwind CSS 3.4 (utility-first, sin plugins)
- Fuentes: Google Fonts via `next/font/google` (Inter, Playfair Display)
- Imágenes: `next/image`
- Íconos: SVG inline (estilo Heroicons, 100% autónomos — sin librería externa)
- Backend: Google Apps Script (proxy vía Next.js route handlers)

---

## 3. Identidad encontrada

### 3.1 Logos

| Archivo | Uso actual | Tamaños detectados | Formato |
|---|---|---|---|
| `public/images/logo.png` | Navbar, Footer, Hero Home, Admin login | 40px / 64px / 80px / 160px | PNG |
| `public/images/logo-red.png` | `/historia` únicamente | 200×250px | PNG |

- No existen versiones SVG de ningún logo.
- No existe un isotipo o favicon personalizado (se usa el `favicon.ico` por defecto de Next.js).
- El logo principal se muestra a 5 tamaños diferentes con `fill + object-contain` (correcto).
- El logo histórico (`logo-red.png`) no tiene equivalente modern-style; aparece solo una vez.

### 3.2 Fotografías

| Archivo | Dónde aparece | Efecto |
|---|---|---|
| `rosa-elena-1.jpg` | Home (sección "Inspiración") + `/rosa-elena` | `grayscale shadow-xl` / `grayscale group-hover:grayscale-0` |
| `rosa-elena-2.jpg` | `/rosa-elena` | `grayscale group-hover:grayscale-0` |
| `rosa-elena-3.jpg` | `/rosa-elena` | `grayscale group-hover:grayscale-0` |
| `rosa-elena-4.jpg` | `/rosa-elena` | `grayscale group-hover:grayscale-0` |

Tratamiento: todas en escala de grises por defecto, con transición a color al hacer hover.
Aspecto: `3/4` (vertical). Las fotos usan `object-cover`.

---

## 4. Colores

### 4.1 Tokens definidos en `tailwind.config.ts`

| Token Tailwind | Valor HEX | Uso semántico |
|---|---|---|
| `primary` / `primary.DEFAULT` | `#6B21A8` | Morado medio — acciones principales, links activos, foco |
| `primary.light` | `#C4B5FD` | Lavanda — bordes, fondos suaves, texto secundario en fondos oscuros |
| `primary.dark` | `#3B0764` | Morado oscuro — fondos hero, footer, texto de marca |
| `background` | `#F9F5FF` | Crema morada muy tenue — fondo de secciones secundarias |

### 4.2 Variables CSS en `globals.css`

```css
:root {
  --background: #ffffff;  /* ⚠ CONFLICTO: distinto de bg-background (#F9F5FF) */
  --foreground: #171717;  /* ⚠ NUNCA usado: el código usa clases Tailwind directas */
}
```

**Problema crítico:** `--background` en CSS vars (`#ffffff`) y `background` en Tailwind (`#F9F5FF`)
tienen el mismo nombre semántico pero valores distintos. La clase `bg-background` del layout aplica
`#F9F5FF`; `var(--background)` en `body` aplica `#ffffff`. Esto crea ambigüedad sin impacto visual
visible actualmente, pero puede causar bugs al escalar.

### 4.3 Colores de Tailwind base usados (sin definir como tokens)

| Clase Tailwind | Uso en el proyecto |
|---|---|
| `white` | Fondos de cards, navbar, secciones alternas |
| `gray-50` a `gray-700` | Textos secundarios, bordes, fondos hover |
| `gray-100` | Hover de botones blancos |
| `red-500`, `red-600`, `red-200`, `red-50` | Errores, cancelación, texto vaciar carrito |
| `green-600`, `green-700` | Botón WhatsApp, botón "Entregado", badge entregado |
| `orange-100`, `orange-700` | Badge "pendiente" |
| `yellow-100`, `yellow-700` | Badge "listo" |
| `yellow-500`, `yellow-600` | Botón "Marcar listo" (admin) |
| `gray-200`, `gray-600` | Badge "cancelado" |

### 4.4 Paleta resumida (colores realmente en uso)

```
Marca:
  #3B0764  primary-dark   (fondos hero, footer, textos principales)
  #6B21A8  primary        (acciones, estados activos, precio, badge contador)
  #C4B5FD  primary-light  (fondos suaves, separadores, textos en oscuro)
  #F9F5FF  background     (fondos de sección)

Neutrales:
  #FFFFFF  white          (cards, navbar, inputs)
  #374151  gray-700       (texto cuerpo)
  #6B7280  gray-500       (texto secundario)
  #9CA3AF  gray-400       (texto muted, iconos placeholder)
  #E5E7EB  gray-200       (bordes generales)
  #F3F4F6  gray-100       (fondos hover)

Estado / semántico (SIN token propio):
  #16A34A  green-600      (éxito/WhatsApp/Entregado)
  #CA8A04  yellow-500     (advertencia/Listo)
  #EF4444  red-500        (error/cancelar/vaciar)
  #EA580C  orange-600     (pendiente — solo en badge)
```

---

## 5. Tipografía

### 5.1 Fuentes registradas

| Variable | Fuente | Subsets | Alias Tailwind | Uso |
|---|---|---|---|---|
| `--font-inter` | Inter (Google Fonts) | latin | `font-sans` | Cuerpo de texto, interfaz |
| `--font-playfair` | Playfair Display (Google Fonts) | latin | `font-serif` | Títulos, branding |
| — | GeistVF.woff (local) | — | **No registrado** | ⚠ Archivo no usado |
| — | GeistMonoVF.woff (local) | — | **No registrado** | ⚠ Archivo no usado |

Fallback en `globals.css body`: `Arial, Helvetica, sans-serif` (sobreescrito por Tailwind `font-sans`
que aplica `--font-inter`). El fallback es correcto pero redundante.

### 5.2 Escala de tamaños utilizada

| Clase Tailwind | px equivalente | Uso en el proyecto |
|---|---|---|
| `text-xs` | 12px | Metadatos admin (id, fecha), texto badge |
| `text-sm` | 14px | Texto carrito, inputs, botones secundarios, email footer |
| `text-base` | 16px | Links navbar desktop |
| `text-lg` | 18px | Cuerpo de texto largo en páginas de contenido |
| `text-xl` | 20px | Nombre de marca en navbar, subtítulos hero |
| `text-2xl` | 24px | Subtítulos, nombre en footer, total pedido |
| `text-3xl` | 30px | Títulos de sección (h2 en interior) |
| `text-4xl` | 36px | Títulos de sección (h2 en home) |
| `text-5xl` | 48px | H1 hero pages interiores |
| `text-6xl` | 60px | H1 hero home (solo desktop, lg breakpoint) |

### 5.3 Pesos utilizados

| Clase | Uso |
|---|---|
| `font-medium` | Subtextos, links, descripciones |
| `font-semibold` | Botones primarios, nombres de producto, precios |
| `font-bold` | Títulos, totales, badges |

### 5.4 Jerarquía de títulos detectada

```
h1 hero:    font-serif, text-4xl→text-5xl→text-6xl, font-bold, text-white (sobre dark bg)
h2 section: font-serif, text-3xl→text-4xl, font-bold, text-primary-dark (sobre bg claro)
h3 card:    font-sans, text-xl, font-bold, text-primary-dark
h4 / label: font-sans, text-sm, font-bold, tracking-widest, uppercase, text-primary
```

Hay coherencia en la jerarquía visual. El patrón `font-serif` para h1/h2 y `font-sans` para
h3/h4 es sólido y distintivo.

---

## 6. Componentes visuales existentes

### 6.1 Navbar (`src/components/Navbar.tsx`)
- Fondo: `bg-white`, borde inferior `border-b border-primary-light`
- Posición: `sticky top-0 z-50`
- Altura: `h-20` (80px)
- Logo: 64px + nombre en `font-serif text-primary-dark text-xl sm:text-2xl font-bold`
- Links: `text-gray-700 hover:text-primary-light` | activo: `text-primary underline`
- Mobile: hamburger SVG → menú desplegable (`border-t border-primary-light`)

### 6.2 Footer (`src/components/Footer.tsx`)
- Fondo: `bg-primary-dark`, texto: `text-white`
- Logo 80px + nombre en `font-serif text-2xl font-bold`
- Dirección + email con SVG inline (map pin, envelope, 20px, `text-primary-light`)
- WhatsApp + Instagram con SVG filled (24px)
- Divisor: `w-full h-px bg-primary-light/30`
- Copyright: `text-sm text-primary-light`

### 6.3 Botones detectados (8 variantes sin abstraer)

| Variante | Clases base | Contexto |
|---|---|---|
| Primary solid | `bg-primary text-white rounded-md hover:bg-primary-dark` | CTA general, agregar producto |
| Primary dark solid | `bg-primary-dark text-white rounded-md hover:bg-primary` | CTA en secciones `primary-light` |
| White on dark | `bg-white text-primary-dark rounded-md hover:bg-gray-100` | Hero oscuro (ver productos) |
| White outlined on dark | `border-2 border-white text-white rounded-md hover:bg-white/10` | Hero oscuro (secundario) |
| White on primary | `bg-white text-primary font-bold rounded-md hover:bg-gray-100` | Sección bg-primary |
| Green action | `bg-green-600 text-white rounded-md hover:bg-green-700` | WhatsApp, "Entregado" |
| Yellow action | `bg-yellow-500 text-white rounded-md hover:bg-yellow-600` | "Marcar listo" (admin) |
| Ghost outline | `border border-gray-200 text-gray-600 rounded-full hover:border-primary` | Filtros admin |
| Red ghost | `text-red-500 border border-red-200 rounded-md hover:bg-red-50` | Cancelar (admin) |
| Text link | `text-primary hover:text-primary-dark` (sin borde/bg) | "Actualizar", "Cerrar sesión" |
| Round +/- | `w-7 h-7 rounded-full bg-primary-light text-primary-dark hover:bg-primary hover:text-white` | Contador carrito |

### 6.4 Cards detectadas (3 variantes sin abstraer)

| Variante | Clases | Contenido |
|---|---|---|
| Product card | `bg-white rounded-xl shadow-sm overflow-hidden` | Imagen aspect-square + nombre + precio + acción |
| Feature card | `bg-white rounded-lg shadow-sm p-8` (o `rounded-xl`) | Icono 56px + título + descripción |
| Admin pedido | `bg-white rounded-xl shadow-sm p-6` | Cabecera + detalle expandible + acciones |

Variación adicional: `bg-white p-8 rounded-lg shadow-sm hover:shadow-md` en legado RosaElena.

### 6.5 Formularios / Inputs

| Tipo | Clases base |
|---|---|
| Text / tel (carrito) | `border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary` |
| Password (admin login) | `px-4 py-3 rounded-md text-sm focus:ring-2 focus:ring-primary-light` |
| Search (tienda) | `border border-primary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary` |
| Select (admin pago) | `border border-gray-200 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-primary` |

Inconsistencias: 4 variantes de input con distintos `border-color`, `padding`, `rounded` y
`focus:ring-color`. No existe un token de input estandarizado.

### 6.6 Badges de estado (admin)

| Estado | Clases |
|---|---|
| pendiente | `bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full` |
| listo | `bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full` |
| entregado | `bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full` |
| cancelado | `bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full` |
| contador | `bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full` |

### 6.7 Estados de carga / vacío / error

| Estado | Implementación |
|---|---|
| Loading | SVG spinner `animate-spin` + texto "Cargando..." (color `text-primary`) |
| Error | Texto `text-red-600` + descripción `text-gray-500` + botón "Reintentar" |
| Empty | SVG icono gris 48px + texto `text-gray-400` |
| Empty search | Texto `text-gray-500 py-16` centrado |

Cada uno implementado inline en la página correspondiente. No existe un componente compartido.

### 6.8 Layout de secciones (patrón repetido)

Todas las páginas usan el mismo patrón de secciones:
```tsx
<section className="bg-{color} py-{20|24} px-4 sm:px-6 lg:px-8">
  <div className="max-w-{3xl|6xl|7xl} mx-auto">
    {/* contenido */}
  </div>
</section>
```

Este patrón se repite literalmente ~25 veces sin abstraer en ningún componente.

### 6.9 Hero de página (patrón repetido)

Todas las páginas interiores usan el mismo bloque hero:
```tsx
<section className="bg-primary-dark text-white py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
  <h1 className="font-serif font-bold text-white text-4xl sm:text-5xl mb-4">...</h1>
  <p className="text-primary-light text-lg sm:text-xl">...</p>
</section>
```

Aparece exactamente igual (con ligeras variaciones de py y tamaño h1) en: Historia, RosaElena,
Participar, Tienda. No es un componente, es código duplicado.

### 6.10 Componentes ausentes / no implementados

Los siguientes elementos del UI visual NO existen aún como código:
- Modal / Drawer
- Tabla de datos
- Paginación
- Breadcrumbs
- Tooltip
- Toast / Snackbar (hoy se usan `alert()` nativos del browser)
- Skeleton loader
- Avatar / imagen de usuario
- Progress bar
- Accordion

---

## 7. Sistema de espaciados

### 7.1 Padding de contenedores

```
Horizontal (responsive): px-4   sm:px-6   lg:px-8  (16px → 24px → 32px)
Max widths: max-w-3xl (768px) | max-w-4xl (896px) | max-w-6xl (1152px) | max-w-7xl (1280px)
```

### 7.2 Padding vertical de secciones

| Clase | Equivalente | Uso |
|---|---|---|
| `py-4` | 16px | Aviso/banner pequeño |
| `py-8` | 32px | Panel admin contenido |
| `py-12` | 48px | Secciones menores |
| `py-16` | 64px | Sección próximos sábados, galería |
| `py-20` | 80px | Secciones de contenido estándar |
| `py-24` | 96px | Heroes de página, CTAs finales |

### 7.3 Gaps en grids y flex

Usados: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`, `gap-12`, `gap-20` — sin escala semántica.

### 7.4 Border radius

| Clase | Uso |
|---|---|
| `rounded-md` | Botones, inputs (mayoría) |
| `rounded-lg` | Cards feature, icon container, imágenes |
| `rounded-xl` | Cards principales (producto, admin), sidebar carrito |
| `rounded-full` | Botones pill (filtros), botones +/-, badges |

Sin definición semántica: mismo tipo de elemento puede usar `rounded-lg` o `rounded-xl` según la página.

### 7.5 Sombras

| Clase | Uso |
|---|---|
| `shadow-sm` | Cards producto, feature cards |
| `shadow-md` | Sidebar carrito (desktop) |
| `shadow-xl` | Foto hero Home |
| `shadow-2xl` | Panel carrito móvil |

### 7.6 Breakpoints (Tailwind por defecto)

| Prefijo | px | Uso en el proyecto |
|---|---|---|
| `sm:` | 640px | Flex column→row, texto más grande |
| `md:` | 768px | Grid 1→2/3 columnas, menú desktop aparece |
| `lg:` | 1024px | Grid 1→3 col productos, carrito sidebar aparece, texto xl |

---

## 8. Iconografía

**Sin librería externa.** Todos los íconos son SVG inline con path de Heroicons (outlined, strokeWidth=2).

| Ícono | Dónde aparece |
|---|---|
| Shopping cart | Home, Historia, carrito móvil, empty states |
| Map pin | Footer |
| Envelope / email | Footer |
| Calendar | Home, Historia |
| Users / Handshake | Home |
| Heart | Home, Participar |
| Clock | Participar |
| Megaphone / diffusion | Participar |
| Search / lupa | Tienda |
| Shopping bag (box) | Producto sin imagen |
| Chevron up/down | Toggle carrito móvil |
| Hamburger / X close | Navbar móvil |
| WhatsApp (filled) | Footer, tienda, participar |
| Instagram (filled) | Footer, participar |

Total: ~15 íconos distintos. Todos embebidos directamente como `<svg>` en JSX.

**Problema:** cada icono SVG está duplicado en múltiples archivos. WhatsApp aparece 3 veces con
el mismo path. Instagram aparece 2 veces. Cart aparece 4 veces.

---

## 9. Estado general del proyecto

### 9.1 Problemas encontrados

| Severidad | Problema |
|---|---|
| Alta | `--background` (globals.css `#ffffff`) y `background` (Tailwind `#F9F5FF`) son distintos. Misma semántica, valores distintos. |
| Alta | Fuentes `GeistVF.woff` y `GeistMonoVF.woff` existen en `/fonts/` pero NO están cargadas. Archivos muertos. |
| Alta | `--foreground` definido en globals.css pero nunca usado. |
| Media | 8 variantes de botón sin abstraer: clases repetidas en ~30 lugares. |
| Media | Patrón `<section>` + `<div className="max-w-Xxl mx-auto">` repetido ~25 veces. |
| Media | Hero de página duplicado en 4 archivos distintos (Historia, RosaElena, Participar, Tienda). |
| Media | 4 variantes de input (`border-gray-300`, `border-gray-200`, `border-primary-light`, sin borde) con distinto `focus:ring`. |
| Media | Íconos SVG duplicados: WhatsApp x3, Instagram x2, Cart x4, etc. |
| Media | `alert()` nativo del browser para feedback al usuario (pedido confirmado, error, cancelar) — sin componente toast/modal. |
| Baja | `border-radius` inconsistente: cards usan `rounded-lg` o `rounded-xl` sin criterio semántico. |
| Baja | Sombras sin escala semántica: `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xl` mezcladas. |
| Baja | WhatsApp number `56950807172` hardcodeado en 2 archivos (tienda, footer). |
| Baja | Fechas de apertura hardcodeadas en Home ("9 y 23 de mayo"). |
| Baja | Admin tiene su propio mini-navbar (distinto al Navbar global) — no reutiliza componentes. |

### 9.2 Fortalezas

- Paleta de colores coherente y bien nombrada en `tailwind.config.ts`
- Tipografía dual (Inter + Playfair) aplicada consistentemente
- Patrón de Hero uniforme en todas las páginas interiores (buena base para abstraer)
- Patrón de Feature Card uniforme en Historia, RosaElena, Participar
- Imágenes con `next/image` correctamente configurado (fill, sizes, priority)
- SVG íconos inline = 0 dependencias externas de íconos
- Layout responsive bien trabajado en navbar y carrito

### 9.3 Componentes reutilizables actuales

| Componente | Archivo | ¿Bien abstraído? |
|---|---|---|
| Navbar | `src/components/Navbar.tsx` | ✅ Sí |
| Footer | `src/components/Footer.tsx` | ✅ Sí |
| CarritoPanel | inline en `tienda/page.tsx` | ⚠ Necesita extraerse |
| ImagenProducto | inline en `tienda/page.tsx` | ⚠ Necesita extraerse |
| LoginScreen | inline en `admin/page.tsx` | ⚠ Reutilizable en futuro |
| AdminPanel | inline en `admin/page.tsx` | ⚠ Candidato a descomponer |

---

## 10. Oportunidades

1. **Extraer un componente `PageHero`** — elimina ~40 líneas duplicadas en 4 archivos.
2. **Extraer un componente `Section`** — envuelve el patrón `<section>` + `<div className="max-w-Xxl">`.
3. **Abstraer `Button`** con variantes — elimina la repetición de clases en ~30 instancias.
4. **Abstraer `Card`** en 2 variantes (feature card y content card) — 3 páginas lo usan.
5. **Abstraer `Badge`** — reutilizable en tienda (stock bajo) y admin (estados).
6. **Crear `Input`** con variante estándar — unifica los 4 estilos de input actuales.
7. **Crear `Spinner`** y `EmptyState`** — eliminan código duplicado en tienda y admin.
8. **Crear componente `Icon`** o barrel de SVG — elimina los íconos duplicados.
9. **Reemplazar `alert()` por `Toast`** — mejora UX de confirmaciones y errores.
10. **Resolver el conflicto de `--background` vs `background` token** — evita bugs futuros.
11. **Eliminar archivos Geist (woff)** o registrarlos — sanear el directorio `/fonts/`.

---

## 11. Propuesta de estructura Design System

A continuación se propone la estructura de carpetas para incorporar un Design System dentro
del proyecto. **Esta estructura NO ha sido creada aún** — es solo la propuesta para revisar.

```
src/
├── design-system/
│   │
│   ├── tokens/
│   │   ├── colors.ts        # Constantes semánticas: brand, neutral, state, surface
│   │   ├── typography.ts    # Escala tipográfica: tamaños, pesos, line-height
│   │   ├── spacing.ts       # Escala de espaciado (4px base)
│   │   ├── radius.ts        # Border radius: sm, md, lg, xl, full
│   │   └── shadows.ts       # Sombras: subtle, default, elevated, floating
│   │
│   ├── components/
│   │   │
│   │   ├── ui/              # Átomos — piezas mínimas reutilizables
│   │   │   ├── Button.tsx   # Variantes: primary | secondary | ghost | danger | icon
│   │   │   ├── Badge.tsx    # Variantes: pendiente | listo | entregado | cancelado | count
│   │   │   ├── Input.tsx    # Variantes: default | search | password (con icono)
│   │   │   ├── Select.tsx   # Select estandarizado con estilos del DS
│   │   │   ├── Spinner.tsx  # Loading state (tamaños sm, md, lg)
│   │   │   ├── Icon.tsx     # Wrapper SVG + todos los iconos como exportaciones
│   │   │   └── Avatar.tsx   # Imagen circular con fallback inicial/icono
│   │   │
│   │   ├── feedback/        # Retroalimentación al usuario
│   │   │   ├── Toast.tsx    # Reemplaza alert() — variantes: success, error, info
│   │   │   ├── EmptyState.tsx  # Ícono + título + descripción + acción opcional
│   │   │   └── ErrorState.tsx  # Error + botón reintentar
│   │   │
│   │   ├── layout/          # Moléculas de estructura
│   │   │   ├── Section.tsx  # Wrapper con bg + py + px responsive estandarizados
│   │   │   ├── Container.tsx # max-w-{size} mx-auto (sizes: sm|md|lg|xl|full)
│   │   │   └── PageHero.tsx # Hero de página: bg-primary-dark + h1 + subtítulo
│   │   │
│   │   └── cards/           # Moléculas de contenido
│   │       ├── FeatureCard.tsx  # Icono + título + descripción (Historia, Participar)
│   │       └── ProductCard.tsx  # Imagen + nombre + precio + acción (Tienda)
│   │
│   ├── icons/
│   │   └── index.tsx        # Todos los SVG como componentes nombrados (CartIcon, etc.)
│   │
│   └── index.ts             # Barrel: re-exporta todo el DS
│
├── app/                     # Sin cambios estructurales
├── components/              # Navbar, Footer (se actualizan para usar DS)
└── lib/
```

### Criterios de la propuesta

- **Sin romper lo existente:** las páginas actuales siguen funcionando mientras se migra gradualmente.
- **Barrel único (`design-system/index.ts`):** las páginas importan de un solo lugar.
- **Tokens primero:** los cambios visuales se hacen en `tokens/`, no buscando clases en archivos.
- **Compatibilidad Tailwind:** los componentes siguen usando clases Tailwind internamente — no se
  introduce CSS-in-JS ni StyleSheet nuevo. Los tokens generan constantes de string que
  los componentes usan como className.
- **Portable:** si en el futuro se quiere sacar el DS a un paquete propio, la carpeta es
  auto-contenida.
```

---

*Fin del documento. Generado por análisis estático de los archivos fuente del proyecto.*
*No se modificó ningún archivo durante esta auditoría.*
