# Fases 9–10 — inventario, decisiones y Go/No-Go

**Fecha de corte:** 2026-09-22
**Alcance:** preparación técnica y editorial; producción no autorizada ni tocada.  
**Estado global:** **NO-GO productivo** hasta resolver los bloqueos humanos indicados.

Este documento es la fuente de verdad para el cierre de F9/F10. No reabre las
validaciones técnicas de F4–F8 ni autoriza repetir sus E2E de escritura.

## 1. Inventario público F9

| Elemento | Evidencia | Clasificación | Tratamiento |
|---|---|---|---|
| Inicio | funcionamiento, aperturas, propósito, historia y participación | OK técnico | Fechas pasadas ya no se presentan como próximas. |
| Historia | origen 2020, transición, cita y funcionamiento | HUMAN_DECISION_REQUIRED | Hechos, fecha, cita y atribución necesitan aprobación editorial/fuente. |
| Rosa Elena | biografía, cuatro retratos, legado y cita | HUMAN_DECISION_REQUIRED | Biografía, identidad, fecha, cita, créditos y derechos necesitan validación institucional. |
| Participar | compra, difusión, turnos y contacto | HUMAN_DECISION_REQUIRED | No publica calendario de turnos ni aportes monetarios porque no existe procedimiento aprobado. |
| Tienda | orientación, categorías, unidades, apertura, fallback y errores | OK técnico | Se mantuvo intacta la lógica F4–F8; se añadió accesibilidad y reintento de lectura. |
| Navbar/footer | cinco rutas, dirección, correo, WhatsApp e Instagram | CORREGIBLE_AUTOMÁTICAMENTE | Menú móvil, foco y estado de página corregidos; contacto centralizado. |
| Imágenes usadas | `logo.png`, `logo-red.png`, `rosa-elena-1..4.jpg` | HUMAN_DECISION_REQUIRED | No hay créditos/licencias documentados. Se eliminaron pies interpretativos no sustentados. |
| Imágenes disponibles no usadas | no hay archivos de producto en `public/images/productos/` | OK | Se conserva el fallback accesible; no se inventan imágenes. |
| Textos alternativos | logos, retratos y fallback de productos | CORREGIBLE_AUTOMÁTICAMENTE | Los retratos ahora se describen solo por rasgos visuales inequívocos. |
| Datos hardcodeados | contacto, lugar, horario y siete fechas 2026 | OK técnico / humano para cambios | Una fuente compartida evita divergencias; todo cambio requiere confirmación del Almacén. |

No se encontró un corpus histórico independiente en el repositorio que permita
corroborar las afirmaciones biográficas. La repetición entre Home, Historia y
Rosa Elena es principalmente temática; no se eliminó texto cuando hacerlo
podía cambiar el significado editorial.

## 2. Paquete editorial — decisiones F9

### DECISIÓN F9-01

**Problema:** historia, biografía, fechas, cargos y contexto represivo carecen de
fuente aprobada dentro del repo.  
**Evidencia:** `/historia` y `/rosa-elena`; no existe ficha de fuentes o acta de aprobación. La versión previa combinaba “1930” con “tenía 44 años” al 18 de agosto de 1976, datos incompatibles sin una fecha de nacimiento completa; ambos se retiraron sin escoger uno.  
**Opciones:**  
A. Aprobar el texto actual y registrar sus fuentes.  
B. Corregirlo entregando texto institucional definitivo y fuentes.  
C. Retirar temporalmente los pasajes no confirmados.  
**Recomendación:** B; conservar la estructura y reemplazar solo el contenido validado.  
**Impacto:** exactitud histórica, reputación y memoria.  
**Bloquea producción:** **SÍ**.

### DECISIÓN F9-02

**Problema:** cuatro retratos y dos logos no tienen crédito, procedencia ni
permiso de publicación documentados.  
**Evidencia:** `public/images/`; la galería no incluye fuente ni licencia.  
**Opciones:**  
A. Confirmar autorización y crédito exacto para cada archivo.  
B. Sustituir por material con permiso documentado.  
C. Retirar de la publicación los archivos no autorizados.  
**Recomendación:** A si existe respaldo; C para cualquier archivo sin respaldo.  
**Impacto:** derechos de imagen y atribución.  
**Bloquea producción:** **SÍ** para publicar esas imágenes; no bloquea si se retiran.

### DECISIÓN F9-03

**Problema:** turnos, aportes y funcionamiento comunitario se describen en
términos generales; no existe procedimiento vigente documentado.  
**Evidencia:** `/participar` invita a contactar, pero no define inscripción,
responsables, frecuencia ni aportes monetarios/materiales.  
**Opciones:**  
A. Aprobar el texto general actual.  
B. Entregar un procedimiento concreto para publicarlo.  
C. Limitar la página a compra, difusión y contacto.  
**Recomendación:** A para un lanzamiento inicial y B cuando el procedimiento exista.  
**Impacto:** claridad de expectativas y carga de coordinación.  
**Bloquea producción:** **SÍ**, porque requiere aprobación institucional del llamado público.

### DECISIÓN F9-04

**Problema:** correo, WhatsApp, Instagram, dirección, horario y calendario deben
ser confirmados como canales públicos vigentes.  
**Evidencia:** fuente compartida `src/lib/fase9/contenidoPublico.ts`; la fecha
2026-09-19 ya se oculta por haber pasado.  
**Opciones:**  
A. Confirmar todos los datos actuales.  
B. Corregir los que hayan cambiado.  
C. Publicar solo los canales confirmados.  
**Recomendación:** C hasta contar con confirmación explícita.  
**Impacto:** contacto y asistencia a aperturas.  
**Bloquea producción:** **SÍ**.

## 3. Preparación técnica F10

### SEO e indexación

- Metadata única por página, Open Graph y Twitter sin imagen inventada.
- Canonical, `metadataBase`, sitemap y referencia desde robots dependen de
  `SITE_URL`; sin dominio confirmado no se genera una URL falsa.
- `/admin` declara `noindex`; `robots.txt` excluye `/admin/` y `/api/`.
- Favicon existente conservado. No se añadió structured data porque la entidad
  y sus datos institucionales aún no están aprobados.

**Pendiente humano F10-01:** confirmar el dominio HTTPS definitivo y configurar
`SITE_URL`. **Bloquea producción: SÍ** para indexación correcta.

### Resiliencia y observabilidad

- 404, error global y loading accesible presentes.
- Tienda conserva fallback visual, comunica error de catálogo y permite reintentar.
- `/api/health` entrega únicamente liveness, entorno normalizado y hora; no
  consulta ni modifica backend y no expone configuración.
- Diagnóstico de Apps Script ya sanitiza respuestas no JSON. No se integró un
  proveedor externo de monitoreo.

Opción futura: alertas de disponibilidad y captura de excepciones con retención
y tratamiento de datos aprobados. No es requisito para el primer despliegue si
existe monitoreo manual y responsable asignado.

### Seguridad focalizada

- Cookie admin `httpOnly`, `Secure` en producción, `SameSite=Lax`, expiración de
  ocho horas y firma HMAC; el payload validado contiene actor, rol, emisión y
  expiración. Middleware protege páginas y APIs por capacidad.
- Headers: `nosniff`, anti-clickjacking, referrer policy y permissions policy.
- CSP no se agregó sin inventariar primero scripts/estilos de Next y orígenes
  productivos; una política especulativa podría romper el sitio.
- CI tiene `contents: read`, instalación reproducible, QA, secrets scan y audit
  crítico. No ejecuta E2E remoto ni deploy.
- Pendiente antes de producción: confirmar secreto de sesión fuerte, contraseña
  administrada, responsable de rotación y mitigación de intentos repetidos de login.

**Pendiente humano F10-02:** la arquitectura técnica y la matriz provisional de
roles están preparadas en TEST, pero falta confirmación del Almacén, asignación
de personas, identidad multiusuario real y protección de intentos de login.
**Bloquea producción: SÍ**.

### Vulnerabilidades npm

| Paquete | Severidad | Tipo / superficie | Impacto real | Solución | ¿Bloquea? |
|---|---|---|---|---|---|
| `brace-expansion` | alta | transitiva, desarrollo | DoS al procesar patrones hostiles; la app no recibe patrones | override a versiones corregidas 1.1.18/5.0.9 | NO, resuelta |
| `js-yaml` | alta | transitiva, desarrollo (ESLint) | DoS al parsear YAML hostil; no ocurre en runtime | override 4.3.2 | NO, resuelta |
| `postcss-selector-parser` | baja | transitiva, build (Tailwind) | recursión con CSS hostil; CSS es del repo | override 6.1.3 | NO, resuelta |
| `postcss` incluido por Next | alta | transitiva de dependencia directa, build | lectura de sourcemaps/CSS hostiles; no hay subida de CSS por usuarios | requiere versión de Next que incorpore PostCSS corregido | NO con el modelo actual; vigilar |
| `next` | moderada derivada | directa, runtime/build | npm la marca por el PostCSS incluido | hoy propone Next 16.3.5 (major) | NO por sí sola; migración separada |

Resultado actual esperado: **2 alertas (1 alta, 1 moderada), 0 críticas**. No se
migró a Next 16.

### Backup y rollback

El procedimiento operativo está en `OPERACION_BACKUP_ROLLBACK.md`. Requiere
backup verificado de Sheet, versión/deployment de Apps Script, commit y tag Git,
deployment web identificado, responsables, rollback por componente y verificación
posterior. Ningún paso productivo fue ejecutado.

### Preflight único

`npm run preflight:go-no-go` valida de forma reproducible el lockfile con un
`npm ci --dry-run`, y ejecuta diff check,
secrets scan, configuración, tests, lint, build, audit completo, dry-run de Apps
Script TEST y preflight integral read-only del backend TEST. Los dos últimos son
informados como `PENDING` si falta conectividad/configuración; nunca habilita
escrituras ni despliegues. Durante desarrollo se admite
`npm run preflight:go-no-go -- --allow-dirty --skip-npm-ci`.

## 4. Datos reales pendientes

| Dato | Estado | ¿Bloquea producción? |
|---|---|---|
| Stock físico | BLOCKED | SÍ: disponibilidad y pedidos reales. |
| Cuatro precios extremos | HUMAN_DECISION_REQUIRED | SÍ: cobro correcto de esos productos. |
| Costos | HUMAN_DECISION_REQUIRED | SÍ para compras/márgenes; no para catálogo si precios de venta se validan aparte. |
| Venta física real `PROD-001–019` | HUMAN_DECISION_REQUIRED | SÍ para activar venta presencial de esos productos. |
| Imágenes, derechos y créditos | HUMAN_DECISION_REQUIRED | SÍ para publicar cada imagen; se puede lanzar sin ellas. |
| Stock mínimo y prioridades | PENDING | NO para catálogo/pedidos; SÍ para recomendaciones de abastecimiento fiables. |
| Saldo bancario y efectivo | PENDING | NO para sitio público; SÍ antes de usar caja/abastecimiento productivo. |
| Modelo de roles | PREPARADO_TEST / HUMAN_DECISION_REQUIRED | SÍ: falta aceptación y asignación de personas. |

## 5. Checklist final

### READY

- F4 cerrada técnicamente en TEST; F5/F6 y F7/F8 cerradas en TEST.
- Piloto operativo integral PASS y estado TEST restaurado.
- Rutas públicas, responsive técnico, foco, menú móvil, alt text objetivo y
  fallbacks revisados.
- Metadata por página, robots, sitemap configurable, 404, error, loading y health.
- Headers, sesión admin, rutas admin, CI mínimo, secrets scan y preflight consolidados.
- Arquitectura F9-A de roles, autorización, DTOs, IDs y diario durable validada
  en TEST con Apps Script v15 y Next local `43a51a9`; retest focalizado PASS.
  F9 global sigue abierta. No se declara atomicidad ACID multitabla.
- Procedimiento de backup/rollback preparado sin ejecutarlo.

### PENDING

- Resolver dos advisories npm ligados a Next 15 cuando exista una corrección sin
  migración mayor aceptada, o planificar la migración separada.
- Completar mínimos/prioridades, saldo/efectivo y observabilidad externa opcional.

### BLOCKED

- Go productivo, migraciones/deploys productivos y carga de datos reales.
- Uso productivo de catálogo/venta/abastecimiento hasta validar los datos que
  corresponden a cada flujo.

### HUMAN_DECISION_REQUIRED

- F9-01 a F9-04.
- Dominio `SITE_URL`, asignación humana de roles/protección de login, datos reales y
  responsables/ventana de backup y rollback.
