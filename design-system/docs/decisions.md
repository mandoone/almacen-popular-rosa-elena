# Decisiones de diseño — Design System
Almacén Popular Rosa Elena Morales Morales

---

## D1 — Scope del DS: documentos, no componentes React

**Decisión:** El Design System inicial cubre exclusivamente templates HTML estáticos e informes.
No incluye componentes React, no refactoriza la web y no introduce dependencias nuevas en el proyecto Next.js.

**Razón:** El objetivo inmediato es generar informes de estado de la web con la identidad visual
del Almacén. Construir un DS de componentes React requeriría refactorizar la app completa,
que está en producción y funcionando.

**Consecuencia:** en una fase futura, el DS puede expandirse hacia componentes React usando
los mismos tokens como base.

---

## D2 — CSS nativo en templates (no Tailwind)

**Decisión:** Los templates HTML usan `themes/almacen.css` con custom properties CSS nativas,
no clases de Tailwind.

**Razón:** Los templates son archivos HTML estáticos que se abren directamente en el browser.
No tienen pipeline de build de Tailwind (no hay `npx tailwindcss`, no hay `next build`).
CSS nativo funciona sin herramientas adicionales.

**Consecuencia:** los valores de los tokens deben mantenerse sincronizados manualmente entre
`tailwind.config.ts` (web) y `themes/almacen.css` (DS). Si cambia la paleta en la web, hay que
actualizar el CSS del DS.

---

## D3 — Un solo archivo de tema (`almacen.css`)

**Decisión:** Todos los tokens (colores, tipografía, espaciado, bordes, sombras) van en un único
archivo `themes/almacen.css`. No se divide por tipo de token.

**Razón:** El DS es liviano. La complejidad de múltiples archivos de tokens no está justificada
para el volumen actual. Un solo import lo resuelve todo.

**Revisión:** si el DS crece a más de 3 templates con necesidades distintas, se divide.

---

## D4 — Assets copiados (no enlazados)

**Decisión:** `logo.png`, `logo-red.png` y `favicon.ico` se copian a `brandkit/assets/`.
Los templates referencian esas copias locales.

**Razón:** Los templates HTML viven en `design-system/` y se abren localmente sin servidor.
No pueden leer de `public/images/` de Next.js (que es una ruta de servidor, no un path relativo).
Una copia local garantiza que el template funciona offline y sin `npm run dev`.

**Consecuencia:** si el logo cambia en la web, hay que actualizar también la copia en `brandkit/assets/`.

---

## D5 — `WEB_STYLE_AUDIT.md` original conservado en raíz

**Decisión:** El archivo `WEB_STYLE_AUDIT.md` de la raíz del proyecto se conserva intacto.
Se copia en `design-system/docs/WEB_STYLE_AUDIT.md` pero no se mueve ni elimina el original.

**Razón:** Fue generado como documento de proyecto en la raíz. Moverlo afectaría referencias
existentes y el flujo de trabajo del proyecto web. La copia en `docs/` es para que el DS sea
autónomo y referenciable desde sus propios prompts.

---

## D6 — Informes en `reports/` no se commitean automáticamente

**Decisión:** `reports/` tiene un `.gitkeep` para que la carpeta exista en git, pero los archivos
HTML/PDF generados no se commitean por defecto.

**Razón:** Los informes son documentos de trabajo con fecha. El usuario decide cuáles guardar
en el historial. Commitear todos generaría ruido en el repo.

**Convención de nombres:** `reports/YYYY-MM-DD-descripcion.html`
