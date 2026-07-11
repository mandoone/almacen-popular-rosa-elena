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

**Revisión:** esta decisión queda precisada por D7. `almacen.css` continúa como único
archivo de tokens de identidad; los componentes documentales se separan en
`reports.css` para evitar duplicación entre templates.

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

**Revisión:** esta decisión queda reemplazada por D10. Las fuentes Markdown y las
referencias visuales aprobadas sí se versionan; los previews descartables y PDF de
prueba no se versionan por defecto.

---

## D7 — Separar identidad y componentes documentales

**Decisión:** `themes/almacen.css` conserva exclusivamente identidad visual y tokens;
`themes/reports.css` contiene los componentes de informes y las reglas de impresión.

**Razón:** los dos pilotos v0.2 aprobados repetían CSS dentro de cada HTML. Separar la
capa documental permite reutilizar el diseño sin cambiar el brandkit ni tocar Next.js.

**Consecuencia:** todos los templates oficiales cargan primero `almacen.css` y luego
`reports.css`. Los pilotos aprobados permanecen intactos como referencia visual.

---

## D8 — Dos tipos oficiales de informe

**Decisión:** se soportan `AVANCE_ALMACEN` y `TECNICO_INTERNO`, cada uno con template
propio y una misma base visual.

**Razón:** el contenido dirigido al Almacén necesita síntesis y lenguaje accesible;
el informe interno necesita arquitectura, validaciones y riesgos técnicos.

**Consecuencia:** no se fuerzan ambos contenidos dentro de una plantilla genérica ni
se crean identidades visuales diferentes.

---

## D9 — El Markdown del repo es la fuente oficial

**Decisión:** las fuentes viven en `reports/sources/`. Drive recibe copias aprobadas,
pero no reemplaza al Markdown versionado en el repositorio.

**Razón:** editar en dos lugares produciría versiones divergentes y perdería trazabilidad.

**Consecuencia:** toda corrección parte en el repo, genera un HTML nuevo y luego una
copia publicada en Drive.

---

## D10 — Política de versionado de artefactos

**Decisión:** se versionan Markdown fuente, templates, CSS, guías y HTML aprobados
como referencia. HTML de prueba descartables y PDF de prueba no se versionan por
defecto. Los PDF finales se versionan solo si se decide conservarlos en el historial.

**Razón:** conservar evidencia relevante sin llenar Git de salidas transitorias.

**Consecuencia:** los dos pilotos v0.2 aprobados forman parte de la base documental;
la publicación en Drive conserva las versiones enviadas.
