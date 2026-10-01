# F10 — Readiness operativa y puesta en marcha

Este documento prepara el trabajo; **no autoriza Producción**, no contiene
secretos y no reemplaza el Go/No-Go humano de `GO_NO_GO_FASE_9_10.md`.

## Uso del preflight

1. Copiar `config/f10-readiness.example.json` como
   `config/f10-readiness.local.json` (ignorado por Git).
2. Cambiar cada resultado solo cuando exista evidencia verificable. No registrar
   montos, credenciales, IDs privados, enlaces de Sheets ni nombres de personas.
3. Ejecutar `npm run preflight:f10`. Durante la preparación informa pendientes
   sin habilitar nada. El candidato final usa `npm run preflight:f10 -- --strict`.

El manifiesto **v2** usa el ID fijo de cada check como clave y los campos
`resultado`, `fecha`, `responsable`, `evidencia`, `observaciones` y `referencia`.
`PENDING` significa aún no comprobado; `READY`, comprobado; `FAIL`, diferencia
o bloqueo; `NOT_APPLICABLE`, excepción aprobada por una persona. Para cualquier
resultado distinto de `PENDING` se exigen fecha real, función responsable,
descripción breve y referencia no sensible de la evidencia. Una excepción
exige además justificación en `observaciones`. `fecha_corte` puede ser `null`
durante la preparación, pero necesita fecha real antes de `READY` global.
Migrar cualquier manifiesto local v1 a v2 manualmente, sin promover sus estados
ni inventar referencias. El preflight devuelve `READY`, `PENDING` o `FAIL` y enumera los
checks no listos sin imprimir la evidencia. `READY` valida estructura y estados:
**no equivale a aprobación humana de Go ni verifica por sí solo documentos externos**.

## Evidencias de los 20 checks

Responsables son funciones por asignar, no personas ya designadas. La columna
"Auto" indica qué puede comprobar el preflight o una lectura segura; "humano"
significa que el Almacén debe confirmar la evidencia. Guardar actas y montos en
el repositorio operativo autorizado, no en Git ni en el manifiesto: aquí solo
va una referencia no sensible. `FAIL` significa diferencia sin resolver,
ausencia de respaldo verificable o rechazo del responsable.

| Check | Evidencia esperada y origen | Responsable a designar | PASS / FAIL | Auto / humano |
|---|---|---|---|---|
| `identidad_cuentas` | Registro de actores individuales y ensayo TEST; gestor seguro | Administración | Cada persona autorizada usa cuenta propia / cuenta compartida o acceso no ensayado | Esquema / aprobación humana |
| `roles_aprobados` | Matriz firmada y asignación persona–rol–acceso; acta Almacén | Almacén | Capacidades aceptadas y asignadas / matriz provisional o discrepante | Esquema / humano |
| `contenido_editorial` | Textos y fuentes aprobados; acta editorial | Almacén | Aprobación o corrección aplicada / afirmaciones sin fuente | No / humano |
| `derechos_imagenes` | Permiso/crédito por imagen publicada o retiro; archivo de autorizaciones | Almacén | Cada imagen cubierta / alguna sin permiso | Inventario de archivos / humano |
| `contactos_publicos` | Correo, teléfono, dirección, horario y calendario confirmados; acta | Almacén | Canales vigentes / dato sin confirmar | Comparación / humano |
| `dominio_https` | Dominio, DNS, TLS, `SITE_URL`, canonical, sitemap y headers; navegador/preflight | Técnico + titular dominio | Origen final HTTPS aprobado y probado / URL divergente o TLS fallido | Preflight/HTTP / humano |
| `stock_fisico` | Conteo por producto y unidad, segundo recuento y conciliación; inventario físico/Sheet | Operación + segundo revisor | Sin diferencias abiertas / diferencia o unidad ambigua | Comparación / humano |
| `precios_venta` | Lista vigente, productos extremos y readback; aprobación comercial/Sheet | Almacén | Precios aprobados por producto / valor incorrecto o faltante | Rango/readback / humano |
| `costos_iniciales` | Costos, fecha y respaldo por producto; facturas/Sheet | Operación | Costos trazables / costo ausente o inconsistente | Formato/readback / humano |
| `saldo_efectivo` | Arqueo al corte, caja y gastos pendientes; caja/acta | Tesorería + segundo revisor | Cuadre firmado / diferencia sin resolver | Cálculo / humano |
| `saldo_bancario` | Conciliación y cuentas por cobrar/pagar si aplican; extracto/acta | Tesorería | Cuadre o excepción institucional registrada / desfase | Cálculo / humano |
| `minimos_prioridades` | Mínimos, prioridades y proveedores vigentes; compras/Sheet | Operación | Parámetros y proveedores aprobados / abastecimiento incierto | Rango/readback / humano |
| `backup_sheet` | Copia fechada de todas las pestañas y prueba de lectura; gestor seguro | Técnico + segundo revisor | Copia completa verificable / copia ausente o ilegible | Inventario de pestañas / humano |
| `version_apps_script` | Versión y deployment estable identificados; Apps Script/gestor seguro | Técnico | ID/versiones y lectura TEST verificadas / referencia incierta | Lectura / humano |
| `rollback_web` | Commit/tag estable, deployment y ensayo de recuperación; Git/Vercel | Técnico | Procedimiento reversible y comprobado / referencia no recuperable | Git/metadata / humano |
| `responsable_ventana` | Responsable, suplente, ventana y canal; acta | Almacén | Cobertura y criterio de aborto aceptados / sin responsable | No / humano |
| `capacitacion_venta` | Lista de asistencia y práctica de pedidos/venta; acta TEST | Responsable capacitación | Ejercicio aprobado / operador no preparado | No / humano |
| `capacitacion_operacion` | Práctica de stock, compras, caja, gastos y reportes; acta TEST | Responsable capacitación | Ejercicio aprobado / brecha abierta | No / humano |
| `capacitacion_administracion` | Práctica de productos, precios, usuarios y revocación; acta TEST | Responsable capacitación | Ejercicio aprobado / brecha abierta | No / humano |
| `ensayo_test` | Guion y acta de venta web/presencial, pedido, confirmación, stock, cancelación, compra, caja y cierre; TEST | Almacén + técnico | Flujo completo y rollback observados / fallo o dato real afectado | Checks READ-ONLY / humano |

La protección distribuida de login, monitoreo y secretos productivos se revisan
además en el Go/No-Go técnico: los 20 estados no los sustituyen. Para cualquier
`NOT_APPLICABLE`, registrar la decisión humana y su referencia; nunca usarlo
para ocultar un requisito crítico sin una alternativa aprobada.

## Vista operativa de los 20 checks

Revisión completa con resuelto/faltante exacto y clasificación: [20 checks al cierre 01/10](operativa/REVISION_F10_2026-10-01.md). 1 técnico resuelto, 15 gates humanos y 4 solo corte productivo; cero pendiente técnico ejecutable en TEST. NO-GO sigue vigente.

Corte 2026-10-01: manifiesto local v2 válido, **1 READY / 19 PENDING / 0 FAIL**. roles_aprobados READY: jerarquía, confirmar/cancelar y asignación 2/2/6 aprobadas con referencia Confirmación Almacén/Omar 2026-10-01. El ejemplo versionado conserva sus veinte PENDING para una instalación nueva.

| Grupo | Checks / trabajo siguiente |
|---|---|
| RESUELTO | roles_aprobados; usernames y distribución definidos, sin credenciales |
| NECESITA_ALMACEN | identidad_cuentas (credenciales/ensayo), contenido_editorial, derechos_imagenes/fotos, contactos restantes (horario 11–15 confirmado), stock_fisico/unidades, precios_venta ambiguos, costos_iniciales incompletos, saldo_efectivo, saldo_bancario, minimos_prioridades, responsable_ventana |
| HUMAN_GATE_REUNION | Tres capacitaciones y ensayo_test con titulares en TEST; no necesitan Production |
| SOLO_CORTE_PRODUCTIVO | dominio_https, backup_sheet, version_apps_script, rollback_web; después de datos/personas y autorización |

Datos comerciales parciales aplicados solo en TEST; [cierre operativo](operativa/CIERRE_TEST_2026-10-01.md). Ninguna fuente reconstruye stock físico ni saldos. Identidad usa los diez actores definidos; no volver a pedir usernames, roles ni horario.

## Secuencia operativa

### 1. Identidad, roles y canales públicos

- La QA con `test-admin`, `test-operacion` y `test-venta` es solo
  `PROVISORIO_TEST`: las contraseñas aleatorias se descartan al terminar y
  el archivo local ignorado conserva solo hashes/secreto TEST. No representa
  cuentas humanas ni sustituye un ensayo visual autenticado con usuarios reales.
  Los tres actores pasaron QA HTTP en Vercel Preview de la rama operativa y
  `test-admin` pasó QA visual autenticada. El deployment con la credencial de
  QA fue retirado y las cuentas finales quedaron selladas. Detalle en
  `TEST_PLAN.md`.
- El Almacén ya aprobó la matriz y asignación 2/2/6 el 2026-10-01.
- Se crean actores técnicos individuales con `npm run auth:credential -- --actor
  <id> --role <rol>`; el comando pide la contraseña sin mostrarla.
- Se verifica login, trazabilidad, revocación y cierre de sesión de cada rol en TEST.
- Se aprueban textos, derechos de imágenes, contactos, calendario y dominio HTTPS.

#### Procedimiento de identidad real (preparado; no ejecutado)

1. Usar la matriz privada definida en operativa.local/cuentas-humanas.json.
   Diez actores únicos validados y comandos exactos en PROCEDIMIENTO_CUENTAS.md;
   designar titular y suplente para revocar. No guardar nombres/credenciales en Git.
2. Mantener los actor_id y roles aprobados; no volver a elegirlos.
   Crear una credencial inicial con `npm run auth:credential -- --actor <id>
   --role <rol>` en terminal privada: el comando pide la clave sin eco, pero
   muestra el hash; evitar grabaciones, logs y pantalla compartida. Entregar la
   contraseña al titular por canal separado; acordar y verificar su reemplazo.
3. Construir el registro **completo** `ADMIN_USERS_JSON` en gestor seguro,
   conservando cuentas vigentes y versiones monotónicas; validarlo antes de
   cargarlo. Sustituirlo solo en el entorno autorizado y desplegar sin mezclar
   Preview/Production. Nunca trasladar las cuentas sintéticas a Producción.
4. Ensayar en TEST login, `/me`, capacidad positiva/negativa, logout y rastro
   de actor. No activar personas reales en Producción sin autorización expresa.
5. Para revocar o retirar: `active=false` e incrementar `session_version`;
   para cambiar rol o contraseña: reemplazar rol/hash e incrementar también
   `session_version`. Restaurar una cuenta jamás reduce esa versión. Registrar
   quién aprobó y cuándo, sin valores sensibles.
6. Rotar secreto de sesión con versión nueva, ventana anterior acotada y prueba
   TEST; retirar la clave anterior al cierre. Una emergencia puede exigir
   invalidación completa de sesiones y coordinación fuera de horario.
7. Cada deployment conserva su snapshot de variables. Al revocar una cuenta,
   verificar también URLs/deployments históricos que aún podrían aceptar su
   credencial; acordar host canónico admin y política de retiro/bloqueo antes
   de usar identidades humanas. El sellado de TEST requirió retirar su Preview
   antiguo. Esto sigue `BLOQUEANTE_PRODUCCION` hasta ensayo específico.

### 2. Datos iniciales y corte

- Congelar altas/cambios mientras se realiza el corte y anotar hora de referencia.
- Contar stock físico por producto y unidad; una segunda persona revisa diferencias.
- Validar precios de venta, incluidos extremos; registrar costos iniciales y fecha.
- Confirmar mínimos/prioridades antes de usar recomendaciones de abastecimiento.
- Conciliar efectivo y saldo bancario al mismo corte. Los montos viven solo en el
  sistema operativo autorizado, no en este repositorio ni en el manifiesto.
- Ejecutar readback y resolver toda diferencia antes de habilitar pedidos/ventas.

### 3. Capacitación y ensayo

- Venta: login propio, pedido, confirmación, listo, entrega, pago/presencial y comanda; cancelación denegada.
- Operación: lo anterior más stock, compras, abastecimiento, caja, gastos y reportes.
- Administración: usuarios, productos, precios, configuración, revocación y rotación.
- Ensayar en TEST un turno completo con cuentas individuales; conservar las dos
  operaciones históricas `REQUIERE_REVISION` sin borrarlas ni maquillarlas.

### 4. Backup, rollback y ventana

- Seguir `OPERACION_BACKUP_ROLLBACK.md`: copia verificada de Sheet, versión de
  Apps Script, commit/tag, deployment web estable y variables en gestor seguro.
- Nombrar responsable, segundo revisor, ventana, canal de coordinación y criterios
  de abortar. Una escritura ambigua se investiga por ID/key antes de repetirla.
- Definir rollback independiente para web, Apps Script y datos; probar lecturas
  después de cada reversión.

## Criterio Go/No-Go

Solo puede proponerse **GO** cuando los 20 checks del manifiesto están `READY` o
`NOT_APPLICABLE`, el preflight estricto pasa desde el commit candidato limpio y
existe autorización explícita de Producción. Cualquier `PENDING`, `FAIL`,
preflight fallido, diferencia de inventario/caja, identidad compartida o ausencia
de backup verificable implica **NO-GO**.

## Próxima intervención del Almacén

Roles, usernames, asignación 2/2/6 y horario 11:00–15:00 cerrados. Matriz nominativa local ignorada. Faltan credenciales privadas/ensayo, validadores de textos/contactos/fotos/derechos, conteo/unidades, ambigüedades SKU/costos, arqueo/conciliación, mínimos/prioridades, reunión/capacitaciones y responsable/suplente/ventana. No se envió ningún mensaje a terceros.

Primer lanzamiento: WAF por IP + local IP/actor, riesgo residual regional aceptado. Sin activación ni contador global por actor. Dominio, cuota/umbral, publicación WAF, secretos, backup/rollback finales solo ante gate de Producción.
