# Fases 9–10 — inventario, decisiones y Go/No-Go

**Fecha de corte:** 2026-10-01
**Alcance:** preparación técnica y editorial; producción no autorizada ni tocada.  
**Estado global:** **NO-GO productivo** hasta resolver los bloqueos humanos indicados.

Este documento registra el Go/No-Go F9/F10. El bloque TEST 01/10 está autorizado: roles definitivos, disponibilidad por apertura, migración/catálogo comercial y E2E sintético. No autoriza Producción.

Corte local: roles_aprobados READY, 19 PENDING, 0 FAIL. Asignación 2 Administración/2 Operación/6 Venta y usernames definitivos preparados sin credenciales. Horario 11–15 confirmado. [Evidencia y matrices](operativa/CIERRE_TEST_2026-10-01.md).

## 0. Auditoría ejecutiva F9/F10

| Pendiente | Estado real | Bloquea Producción | Decisión humana | Implementable ahora |
|---|---|---:|---:|---:|
| Identidad individual | Tres actores sintéticos validados localmente, por HTTP y visualmente en Vercel Preview TEST; cuentas finales selladas | SÍ, hasta credenciales/ensayo humano | Asignación cerrada; falta ensayo | Técnica TEST remota CERRADA |
| `legacy-admin` | Aislado a TEST/local; se apaga al configurar cuentas salvo recuperación explícita | SÍ si siguiera como login normal | NO para aislamiento; SÍ para retiro final | CERRADO técnico |
| Protección de login | 5 fallos/15 min por IP+actor, solo memoria de instancia; Vercel Hobby con 0 reglas personalizadas activas; especificación WAF local preparada, no activada | SÍ, falta capa distribuida productiva | Elección/riesgo cerrados; cuota/umbral y publicación pendientes | Local CERRADO; distribuido PREPARADO_PARA_ACTIVACION, no PASS |
| Sesión/secreto | 8 h, HMAC, versión de cuenta, clave actual+anterior, cookie estricta | SÍ, falta configurar secreto/rotación/responsable | SÍ | Código CERRADO |
| Capacidades | Matriz aprobada; todos confirman, solo Operación/Admin cancelan | NO por matriz; SÍ por cuentas sin ensayo | RESUELTA 01/10 | Implementada UI/API; nombres fuera de src |
| CSP/orígenes/headers | CSP, control cross-site, HSTS/COOP y cookies comprobados en Preview TEST | SÍ, validar dominio final | SÍ, dominio | Preview CERRADO; dominio final pendiente |
| Contenido/contactos/derechos | F9-01 a F9-04 pendientes | SÍ | SÍ, Almacén | NO sin fuente/aprobación |
| Stock/precios/costos | 18 GRANEL acreditados; 31 precios corregidos acumulados, 30 costos activos acreditados | SÍ por conteo/variantes/22 costos pendientes | SÍ para faltantes reales | Backup/diff/readback e idempotencia solo TEST |
| Caja/saldos | Corte real no informado | SÍ para caja/abastecimiento | SÍ, Almacén | NO cargar aún |
| Backup/rollback | Procedimiento y manifiesto listos; evidencia productiva no ejecutada | SÍ | SÍ, responsables/ventana | Preparación CERRADA |
| Capacitación/ensayo | Guion preparado; ejecución pendiente | SÍ | SÍ, participantes | NO sin cuentas/datos |
| Go/No-Go | Manifiesto de 20 checks preparado; estado actual PENDING | SÍ | SÍ | Automatización CERRADA |

Clasificación actual: `CERRADO` para QA técnica sintética local, HTTP y visual en Preview;
`SOLO_CORTE_PRODUCTIVO` para habilitar contrato productivo explícito, activar/verificar WAF y dominio/CSP final;
`PENDIENTE_ALMACEN` para credenciales/ensayo humanos, contenido y datos;
`REQUISITO_PUESTA_EN_MARCHA` para carga/corte/capacitación/backup; todo ello es
`BLOQUEANTE_PRODUCCION` mientras no exista evidencia.

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
Horario 11:00–15:00 confirmado; los demás canales/aprobación institucional final siguen pendientes.

**Bloquea producción:** **SÍ** para datos públicos restantes.

## 3. Preparación técnica F10

### SEO e indexación

- Metadata única por página, Open Graph y Twitter sin imagen inventada.
- Canonical, `metadataBase`, sitemap y referencia desde robots dependen de
  `SITE_URL`; sin dominio confirmado no se genera una URL falsa.
- `/admin` declara `noindex`; `robots.txt` excluye `/admin/` y `/api/`.
- Favicon existente conservado. No se añadió structured data porque la entidad
  y sus datos institucionales aún no están aprobados.

**Checklist de dominio/CSP final, sin activación:** el Almacén debe elegir el
dominio HTTPS canónico, titular DNS y host permitido para administración. Tras
ello, el equipo técnico puede derivar `SITE_URL` (solo origen, sin ruta ni
credenciales), canonical, `metadataBase`, sitemap, robots, origen de cookies y
el host de la política de acceso; debe verificar DNS/TLS, redirección HTTPS,
HSTS, `form-action 'self'`, `frame-ancestors 'none'`, `connect-src 'self'`,
callbacks si se incorporan y lectura del backend TEST/Production correcto.
Hoy la CSP no agrega orígenes externos en el navegador: Apps Script se consume
del lado servidor. `solicitudAdminMismoOrigen` compara el `Origin` con el URL
recibido; todavía falta definir y probar cómo impedir login admin por URLs
históricas de deployment productivo. `check:go-no-go` ya exige un origen HTTPS
puro; no configura dominio ni cambia Production.

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

- Cookie admin `httpOnly`, `Secure` en producción, `SameSite=Strict`, expiración
  de ocho horas y firma HMAC. El payload contiene actor, rol, versión de cuenta,
  versión de secreto, emisión y expiración; el middleware revalida la cuenta.
- Identidad individual sin proveedor externo: registro de entorno con hashes
  PBKDF2, revocación y rotación de secreto actual+anterior. No hay personas
  hardcodeadas. `legacy-admin` queda solo para TEST/local.
- Login con límite local de cinco fallos por ventana para IP y actor, respuesta
  genérica, límite de body y `Retry-After`. Las mutaciones admin rechazan origen
  cross-site. Esta defensa por instancia no sustituye rate limiting distribuido.
- Auditoría 2026-09-27: `proteccionLogin.ts` usa un `Map` por proceso; serverless
  puede repartir solicitudes entre instancias. El dashboard del proyecto Hobby
  mostró cero reglas personalizadas activas. El diseño concreto, límites,
  riesgos, umbral candidato y runbook de activación futura viven en
  `RATE_LIMIT_WAF_RUNBOOK.md`. No se creó borrador ni publicó regla en este
  bloque; la existencia de borradores previos no quedó verificada por CLI.

**Decisión definitiva 2026-10-01 — protección distribuida:**

Primer lanzamiento: Vercel WAF por IP + limitador local por IP y actor. La elección y la aceptación del riesgo residual están cerradas. WAF cuenta requests y regiones por separado; no sustituye un contador global exacto de fallos por actor. Si posteriormente se exige esa semántica, corresponde otro bloque con contador central.

La especificación se clasifica PREPARADO_PARA_ACTIVACION. No hay protección WAF publicada en este bloque. Cuota/umbral y activación requieren el gate de Producción; F9 global sigue abierta por los demás gates humanos.

- Headers: `nosniff`, anti-clickjacking, referrer policy, permissions policy,
  COOP, HSTS y CSP limitada a `self`/recursos locales inventariados.
- `check:go-no-go` exige en entorno productivo dominio HTTPS, cuentas
  individuales, al menos una administración activa, secreto/versionado válido y
  recuperación legacy deshabilitada. Fuera de ese entorno informa PENDING en
  vez de confundir preparación incompleta con READY; aun con READY técnico
  falta aprobación humana.
- CI tiene `contents: read`, instalación reproducible, QA, secrets scan y audit
  crítico. No ejecuta E2E remoto ni deploy.
- Pendiente antes de producción: asignar y validar cuentas humanas en TEST,
  confirmar responsables de
  revocación/rotación y activar rate limiting distribuido en la plataforma
  elegida. Antes de cuentas humanas también se debe probar revocación frente a
  URLs históricas de deployment. Las variables sintéticas se configuraron solo
  en Preview de la rama; Production conservó sus variables originales.

**Pendiente humano F10-02:** la arquitectura técnica, identidad multiusuario y
matriz definitiva y asignación 2/2/6 están aprobadas, pero faltan credenciales,
QA TEST de las cuentas humanas finales y
protección distribuida de intentos de login. Los actores sintéticos ya pasaron
su QA técnica local, remota por HTTP y visual; no constituyen la asignación humana.
**Bloquea producción: SÍ**.

### Vulnerabilidades npm

| Paquete | Severidad | Tipo / superficie | Impacto real | Solución | ¿Bloquea? |
|---|---|---|---|---|---|
| `minimatch` | alta derivada | transitiva, desarrollo | npm la marca por brace-expansion | mantenimiento transitivo junto con brace-expansion | NO para TEST actual; revisar antes del corte productivo |
| `brace-expansion` | alta | transitiva, desarrollo | DoS por patrones hostiles; la app no recibe patrones | Audit 01/10 agrega nuevos advisories contra los overrides existentes 1.1.18/5.0.9; mantenimiento pendiente | NO para TEST actual; revisar parche transitivo antes del corte productivo |
| `postcss` incluido por Next | alta | transitiva de dependencia directa, build | lectura de sourcemaps/CSS hostiles; no hay subida de CSS por usuarios | requiere versión de Next que incorpore PostCSS corregido | NO con el modelo actual; vigilar |
| `next` | moderada derivada | directa, runtime/build | npm la marca por el PostCSS incluido | auditoría 01/10 propone Next 16.3.8 (major) | NO por sí sola; migración separada |

Detalle dueño: [auditoría de mantenimiento](operativa/AUDITORIA_DEPENDENCIAS_2026-10-01.md), con versiones instaladas/corregidas, rutas, siete GHSA/CVE y exposición comprobada. Resultado al 2026-10-01: **4 alertas (3 altas, 1 moderada), 0 críticas**. Los overrides de js-yaml/postcss-selector-parser son correcciones históricas y no alertas abiertas de este audit.
Audit al umbral crítico PASS. No se modificaron dependencias en este bloque: el nuevo
hallazgo es transitivo de desarrollo sin entrada de patrones del usuario; el PostCSS
interno de Next requiere evaluar una migración separada. Registrar mantenimiento
antes del corte productivo; no ejecutar npm audit fix --force.

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

El readiness operativo complementario vive en `F10_READINESS_OPERATIVA.md`.
`npm run preflight:f10` valida un manifiesto local v2 ignorado por Git y distingue
READY/PENDING/FAIL con los nombres de checks no listos; `--strict` exige READY.
Las excepciones `NOT_APPLICABLE` requieren decisión humana con fecha, responsable,
referencia y justificación. El ejemplo versionado permanece íntegramente
`PENDING`; un READY estructural no reemplaza
la revisión de evidencia ni la aprobación de Producción.

## 4. Datos reales pendientes

| Dato | Estado | ¿Bloquea producción? |
|---|---|---|
| Stock físico | BLOCKED | SÍ: disponibilidad y pedidos reales. |
| Precios/SKU/unidades pendientes | PENDING; última comanda base aprobada, actualización parcial TEST | SÍ para productos ambiguos. |
| Costos | HUMAN_DECISION_REQUIRED | SÍ para compras/márgenes; no para catálogo si precios de venta se validan aparte. |
| Modelo granel `PROD-001–019` | Resuelto para 18 granel, Poroto burro histórico NO (D40) | NO por modelo; SÍ por conteo/costos reales restantes. |
| Imágenes, derechos y créditos | HUMAN_DECISION_REQUIRED | SÍ para publicar cada imagen; se puede lanzar sin ellas. |
| Stock mínimo y prioridades | PENDING | NO para catálogo/pedidos; SÍ para recomendaciones de abastecimiento fiables. |
| Saldo bancario y efectivo | PENDING | NO para sitio público; SÍ antes de usar caja/abastecimiento productivo. |
| Modelo de roles | READY; aprobación/asignación definitivas 01/10 | NO por roles; identidades requieren credenciales/ensayo. |

## 5. Checklist final

### READY

- F4 cerrada técnicamente en TEST; F5/F6 y F7/F8 cerradas en TEST.
- Piloto operativo integral PASS y estado TEST restaurado.
- Rutas públicas, responsive técnico, foco, menú móvil, alt text objetivo y
  fallbacks revisados.
- Metadata por página, robots, sitemap configurable, 404, error, loading y health.
- Headers, sesión admin, rutas admin, CI mínimo, secrets scan y preflight consolidados.
- Identidad individual, revocación/rotación, CSP, control de origen y rate limit
  local preparados y probados sin cuentas reales; tres actores sintéticos
  también pasaron QA HTTP y visual en Vercel Preview de la rama operativa.
- Arquitectura F9-A de roles, autorización, DTOs, IDs y diario durable validada
  en TEST con Apps Script v15 y Next local `43a51a9`; retest focalizado PASS.
  F9 global sigue abierta. No se declara atomicidad ACID multitabla.
- Procedimiento de backup/rollback preparado sin ejecutarlo.

### PENDING

- Cuatro alertas npm abiertas (3 altas/1 moderada/0 críticas), exposición y rutas auditadas; [upgrade separado](operativa/AUDITORIA_DEPENDENCIAS_2026-10-01.md). No dependencias modificadas en esta sesión; reauditar al corte.
- Completar mínimos/prioridades, saldo/efectivo y observabilidad externa opcional.
- Activar la WAF por IP elegida solo con gate productivo y ejecutar QA TEST de las cuentas
  humanas finales, incluida revocación frente a deployments históricos.

### BLOCKED

- Go productivo, migraciones/deploys productivos y carga de datos reales.
- Uso productivo de catálogo/venta/abastecimiento hasta validar los datos que
  corresponden a cada flujo.

### HUMAN_DECISION_REQUIRED

- F9-01 a F9-04.
- Dominio SITE_URL, credenciales/ensayo humanos, activación WAF bajo gate productivo,
  datos físicos/ambigüedades comerciales y responsables/ventana de backup/rollback.
