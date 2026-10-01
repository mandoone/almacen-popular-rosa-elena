# Cutover técnico — dry-run documental, no ejecutado

Estado 01/10: TEST validado; Production NO autorizada. Esta secuencia se ejecuta en otra sesión únicamente tras datos/personas y el texto literal AUTORIZO PRODUCCIÓN. No se ejecutaron backups, cambios de variables, dominio, WAF ni despliegues productivos. [F10](../F10_READINESS_OPERATIVA.md) conserva NO-GO.

Este archivo define orden y evidencia del corte. [Backup/rollback](../OPERACION_BACKUP_ROLLBACK.md) define recuperación; [WAF](../RATE_LIMIT_WAF_RUNBOOK.md) define la regla. No copiar configuraciones de TEST a Production.

## Hallazgo que condiciona el candidato productivo

El candidato vigente es deliberadamente TEST: Next bloquea calendario/venta/caja/compras fuera de TEST; Apps Script exige APP_ENV=TEST y nombre exacto de la Sheet TEST para el diario durable. **Cambiar variables o promover un Preview no habilita producción correctamente.**

Después de autorización, preparar un candidato específico que valide el destino productivo explícito, separado del destino TEST, en ambas capas y diario. Requiere revisión y pruebas de rechazo cruzado, backend equivocado/ausente y readback antes de habilitar escrituras. Los scripts de migración/conteo/E2E TEST siguen bloqueados para Production. No eludir guardrails poniendo APP_ENV=TEST en un backend productivo. Este trabajo pertenece SOLO_CORTE_PRODUCTIVO y no se ejecuta ahora.

## Secuencia y recuperación

Cada fila requiere registro privado de fecha, responsable, segundo revisor, SHA/versiones y referencia de evidencia. Falta de evidencia aborta; no basta con un comando que terminó.

| Momento / responsable | Acción o comando futuro | Evidencia previa | Resultado esperado | Rollback / aborto |
|---|---|---|---|---|
| Antes de ventana / Almacén | Revisar 20 checks, acta de datos, participantes, titular/suplente y autorización literal | Firmas, conteo/costos/saldos, ensayo, contactos/derechos, dominio elegido | Ventana acordada y alcance aprobado | NO-GO; conservar estado vigente |
| Candidato / técnico | Preparar contrato productivo descrito arriba; `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run scan:secrets`; comprobar SHA con `git rev-parse HEAD` | TEST PASS, guardrails cruzados probados sin Production, paquetes auditados | Candidato exacto y recuperable, contrato compatible con granel | No desplegar si falta guardrail o QA; conservar candidato TEST |
| Congelación / Operación + técnico | Suspender toma/confirmación/venta y movimientos por mecanismo operativo acordado; verificar ausencia de operaciones en vuelo | Responsable presente y comunicación de pausa | Corte consistente, ninguna escritura concurrente | Mantener pausa hasta conciliación; no asumir que ocultar un botón detiene el backend |
| Respaldo datos / datos + revisor | Sheet: Archivo → Hacer una copia, nombre fechado, carpeta privada autorizada; abrir copia y comparar todas las pestañas, filas e IDs | Destino correcto y pausa comprobados | Backup completo y legible; enlace solo en gestor privado | Abortar si incompleto; no reemplazar tabla original |
| Respaldo backend / técnico + revisor | Apps Script: registrar deployment/version actual; copiar código de todos los archivos y appsscript.json a carpeta privada; conservar configuración/propiedades en gestor seguro | Proyecto exacto vinculado a Sheet correcta; custodio de secretos | Fuente recuperable y versión estable identificada | No actualizar deployment si fuente/propiedades no recuperables |
| Respaldo web / técnico | Registrar deployment, SHA y build estables en gestor; `git cat-file -t <SHA_ESTABLE>`; crear tag inmutable aprobado con `git tag -a <TAG_CORTE> <SHA_CANDIDATO> -m 'Candidato de corte aprobado'` | SHAs reales, evidencia QA, compatibilidad datos/credenciales | Código estable/candidato localizables | No mover tags; preparar build de recuperación con configuración vigente |
| Configuración / custodio + revisor | Vercel proyecto correcto → Settings → Environment Variables; cargar SOLO scope Production listado abajo; Apps Script propiedades y destino productivo verificados | Autorización, registro humano validado, secretos nuevos bajo custodia | Valores sin impresión; Preview/TEST separados; backend confirma destino | Restaurar configuración segura registrada; jamás bajar session_version ni reactivar clave retirada |
| Esquema y corte datos / datos + técnico | Revisar diff explícito por ID; adaptar migración al contrato productivo autorizado, primero dry-run; aplicar esquema aditivo y conteo/costos/precios/saldos revisados; readback completo | Backup legible, acta/hash, pausa, bases históricas compatibles | ID/historia/snapshots preservados; saldos reales concilian | Ante parcial: preservar Sheet y diario, reconciliar IDs/keys; compensar con acta; no borrar ni reejecutar a ciegas |
| Backend / técnico | Apps Script → Deploy → Manage deployments → Edit deployment existente → New version → Deploy; anotar versión/fuente/hash | Diff revisado, datos compatibles, contrato productivo validado | Misma URL estable, backend correcto, lectura no mutante PASS | Volver a versión compatible registrada; bloquear escrituras si contrato anterior no soporta granel |
| Web / técnico | Vercel → deployment del candidato exacto → revisar proyecto/target/variables/build → desplegar en Production según flujo autorizado | Backend correcto, checks y build PASS; nunca promover Preview TEST sin reconstruir configuración | SHA exacto, configuración Production correcta, health/lecturas PASS | Rebuild de código estable compatible con secretos/registro actuales; no restaurar snapshots revocados |
| Dominio / titular DNS + técnico | Vercel Settings → Domains; configurar dominio aprobado/DNS, verificar TLS; SITE_URL=origen HTTPS puro en nuevo build | Titular y origen elegidos; snapshot DNS seguro | HTTPS/redirección, canonical/sitemap/robots y CSP coinciden; admin noindex | Restaurar DNS/asignación registrados bajo autorización; cerrar acceso si origen divergente |
| WAF / técnico + Almacén | Seguir runbook WAF: cuota/costo, diff completo, observación Log, ensayo sintético acotado y publicación autorizada | Host correcto, umbral aceptado, recuperación y responsable | IP/región observado; 429 correcto sin bloquear red compartida; local IP/actor conservado | Restaurar versión WAF previa y publicar solo con aprobación; revisar login/429/cuota |
| Smoke / técnico + Operación | Ejecutar checklist siguiente; registrar IDs, antes/después, responsables y hora | Pausa aún activa; no usar stock/dinero falso como prueba comercial | Lecturas, identidad/capacidades y entorno correctos; prueba escrita solo con fixture autorizado y reversión auditada | Abortar ante autorización indebida, precio/stock incorrecto, fallo o respuesta ambigua; consultar key/diario |
| Reapertura / Almacén | Firmar resultado, `npm run preflight:f10 -- --strict` con manifiesto de evidencia actualizado; levantar pausa | Veinte READY o excepción humana válida; fecha_corte real; smoke/conciliación PASS | GO autorizado, suplente y canal presentes | PENDING/FAIL mantiene NO-GO |
| +15 min, +1 h, primer cierre / Operación + técnico | Revisar errores, pedidos/stock/caja, sesiones/deployments viejos, 429/falsos positivos y cuota; firmar cierre | Línea base del corte e IDs de primeras operaciones | Saldos y movimientos concilian; logs sin secretos | Pausar nuevas escrituras y aplicar recuperación correspondiente |

## Configuración futura: nombres, nunca valores

Web Production: NEXT_PUBLIC_APP_ENV=production; SITE_URL; GOOGLE_SCRIPT_PEDIDOS_URL y GOOGLE_SCRIPT_ADMIN_TOKEN del backend correcto; ADMIN_USERS_JSON validado; ADMIN_SESSION_SECRET y ADMIN_SESSION_SECRET_VERSION. ADMIN_LEGACY_RECOVERY_ENABLED=false; ninguna clave legacy como acceso humano. ADMIN_SESSION_SECRET_PREVIOUS/ADMIN_SESSION_SECRET_PREVIOUS_VERSION solo durante rotación acordada y retirar al vencer ventana (sesión máxima 8 h). Variables _TEST permanecen en su scope Preview de rama, sin trasladar credenciales sintéticas.

Apps Script: destino/ID de Sheet, token admin y marca de entorno acorde con el contrato productivo que se prepare después de autorización. No reutilizar token TEST. Segunda persona verifica separación sin publicar valores.

Cambiar variables del proyecto exige un nuevo deployment para incorporarlas. Un rollback instantáneo reutiliza configuración del deployment anterior; por eso hay que revisar identidades/secreto/contrato antes de usarlo. [Variables Vercel](https://vercel.com/docs/environment-variables), [rollback Vercel](https://vercel.com/docs/instant-rollback). Apps Script conserva versiones; actualizar un deployment a otra versión conserva su identidad. [Deployments Apps Script](https://developers.google.com/apps-script/concepts/deployments).

## Smoke y criterios de aborto

1. GET /api/health: entorno esperado y 200; liveness no demuestra acceso a Sheet. Abrir Home, Historia, Rosa Elena, Participar, Tienda: sin 404/500, horario 11–15, contactos aprobados y banners correctos.
2. GET /api/productos con apertura autorizada: GRANEL referencias 1 kg/100 g/250 g, UNIDAD intacta, histórico inactivo ausente, POR_APERTURA únicamente habilitado. Granel libre con Arroz 250 g = $338; nunca pedir un SKU comercial como prueba ficticia.
3. Login de titulares autorizados, /me, logout; Venta cancelar DENY, Operación editar precio DENY, Admin capacidad correcta. Cookie de actor revocado/version vieja DENY y URLs históricas retiradas/bloqueadas.
4. Confirmar destino del backend con mecanismo productivo preparado, lectura de stock/caja sin cambiar APERTURAS; source/hash/version y base de stock coinciden.
5. Revisar headers, HTTPS, canonical, sitemap y robots; login cross-site DENY; WAF/local y recuperación según ensayo autorizado. No generar carga ni gasto externo automáticamente.
6. Escritura de smoke solo si el acta la autoriza y define fixture, devolución/compensación y cierre; confirmación/replay/cancelación una vez, precio de autoridad y restauración verificada. Una respuesta ambigua se investiga por ID/key antes de repetir.

## Compatibilidad de rollback

TEST v17 introdujo GRANEL y snapshots; v18 conserva contrato y añade precisión/control de stock. No volver a v16 ni a una web previa a granel después de habilitar este modelo: podrían interpretar gramos como unidades y precio de referencia como precio unitario. Recuperación requiere código compatible, base de stock original, datos/historia actuales y registro/secretos vigentes. Si no existe candidato compatible comprobado, mantener escrituras cerradas y corregir hacia adelante. Restaurar backup completo después de ventas perdería historia y requiere conciliación y aprobación explícitas; no es el rollback ordinario.

Dry-run técnico de esta sesión: existen comandos/scripts de QA, TEST v18 recuperable desde backup v17, granel/idempotencia probados, plantilla/dry-run sin stock inventado y registro de cuentas monotónico validado. Pendientes de ejecución: datos finales, personas, autorización y verificaciones productivas del corte; ninguna fila de la tabla se marca realizada por esta preparación.
