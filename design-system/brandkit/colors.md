# Colores — Almacén Popular Rosa Elena Morales Morales

Extraído de `tailwind.config.ts` y `src/app/globals.css` (auditoría 2026-06-26).

---

## Paleta institucional (tokens definidos)

| Nombre | Token Tailwind | Valor HEX | Variable CSS DS |
|---|---|---|---|
| Morado principal | `primary` | `#6B21A8` | `--color-primary` |
| Lavanda suave | `primary-light` | `#C4B5FD` | `--color-primary-light` |
| Morado oscuro | `primary-dark` | `#3B0764` | `--color-primary-dark` |
| Fondo crema | `background` | `#F9F5FF` | `--color-background` |

### Uso semántico

| Color | Cuándo usarlo |
|---|---|
| `primary` (#6B21A8) | Acciones principales, precio, links activos, foco |
| `primary-light` (#C4B5FD) | Bordes suaves, fondos de sección, texto sobre fondo oscuro |
| `primary-dark` (#3B0764) | Fondos hero, footer, navbar links, texto de marca |
| `background` (#F9F5FF) | Fondo de secciones secundarias, fondo de páginas admin |

---

## Neutros (sin token propio — Tailwind base)

| Nombre | Clase Tailwind | HEX aproximado | Uso |
|---|---|---|---|
| Blanco | `white` | `#FFFFFF` | Cards, navbar, inputs, secciones alternas |
| Texto cuerpo | `gray-700` | `#374151` | Párrafos, contenido largo |
| Texto secundario | `gray-500` | `#6B7280` | Descripciones, captions |
| Texto muted | `gray-400` | `#9CA3AF` | Fechas, placeholders, íconos |
| Borde general | `gray-200` | `#E5E7EB` | Bordes de inputs, divisores |
| Fondo hover | `gray-100` | `#F3F4F6` | Hover de botones blancos |
| Fondo mínimo | `gray-50` | `#F9FAFB` | Hover de links en menú móvil |

---

## Colores de estado (sin token propio)

Usados principalmente en el panel de administración de pedidos.

| Estado | Clase Tailwind | HEX | Uso |
|---|---|---|---|
| Éxito / Entregado | `green-600` | `#16A34A` | Badge entregado, botón WhatsApp, botón Entregado |
| Advertencia / Listo | `yellow-500` | `#EAB308` | Badge listo, botón "Marcar listo" |
| Pendiente | `orange-700` | `#C2410C` | Badge pendiente |
| Error / Cancelar | `red-500` | `#EF4444` | Badge cancelado, texto vaciar, botón cancelar |

---

## Advertencias de inconsistencia detectadas

> Ver `docs/WEB_STYLE_AUDIT.md` sección 4.2 para detalle completo.

1. `--background` en `globals.css` vale `#ffffff` pero el token `background` de Tailwind vale `#F9F5FF`.
   Mismo nombre semántico, distinto valor. El DS usa `#F9F5FF` (el token Tailwind) como canónico.

2. `--foreground` (`#171717`) está definido en `globals.css` pero nunca se usa en el código.
   En el DS se ignora; se usan las clases Tailwind directas.

---

## Uso en templates HTML

Los templates usan las variables del archivo `../themes/almacen.css`, no las clases Tailwind.
Referencia cruzada: cada token tiene su equivalente en `--color-*` en ese archivo.
