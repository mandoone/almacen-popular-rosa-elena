# Activación de cuentas humanas — procedimiento listo

Estado: PREPARADO, no ejecutado. Matriz aprobada: dos Administración, dos Operación y seis Venta. Actor_id/roles ya definidos: no volver a pedirlos. Los diez nombres y comandos específicos están en operativa.local/PROCEDIMIENTO_CUENTAS.md; checklist nominal ignorada en ACTIVACION_10_CUENTAS.csv. No existen contraseñas/hashes humanos creados por esta sesión.

## Preparación y orden

Custodio de credenciales y suplente ejecutan desde la rama operativa validada, en terminal privada sin transcripción/pantalla compartida. Primero ambas cuentas Administración, luego Operación, finalmente Venta. Verificar matriz sin credenciales:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/validar-matriz-cuentas.mjs
git check-ignore operativa.local/PROCEDIMIENTO_CUENTAS.md operativa.local/ACTIVACION_10_CUENTAS.csv
```

Nombre visible: el aprobado en la matriz privada, sin caracteres de control, máximo 120 caracteres; actor_id permanece estable. Si falta nombre legal, usar el nombre visible ya acordado; no completarlo de memoria.

Para **cada persona, el día de activación**, generar una contraseña única de 14–256 caracteres en el gestor seguro y pegarla dos veces en el prompt sin eco. No poner contraseña en argumento, variable shell, archivo de texto o clipboard compartido. El comando guarda únicamente un hash PBKDF2-SHA256, 310.000 iteraciones, salt aleatorio; nunca imprime hash con --output.

```powershell
npm run auth:credential -- --actor <actor_aprobado> --role <rol_aprobado> --name '<nombre_visible>' --output operativa.local/cuentas/hashes/<actor_aprobado>.json
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/preparar-registro-cuentas.mjs --assemble operativa.local/cuentas-humanas.json --directory operativa.local/cuentas/hashes --output operativa.local/cuentas/registro-test-v1.json --encode operativa.local/cuentas/registro-test-v1.base64url
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/preparar-registro-cuentas.mjs --validate operativa.local/cuentas/registro-test-v1.json
```

Los comandos completos de las diez personas están listos en el procedimiento privado. --output/--encode solo permiten archivos nuevos dentro de operativa.local, comprueban gitignore y rechazan enlaces que salgan de ese directorio. Ningún comando activa cuentas ni modifica variables remotas. Un archivo existente no se sobrescribe: usar nueva versión tras revisar el registro anterior.

## Incorporación únicamente TEST

1. Preservar el registro vigente en gestor seguro; verificar roles/active/session_version sin mostrar hashes. Las tres cuentas test-* son sintéticas, no pertenecen al registro humano. Si existe una cuenta humana previa, no reemplazarla por versión 1: mantenerla, subir versión cuando cambie seguridad y usar --previous.
2. En Vercel del proyecto ya verificado, editar ADMIN_USERS_JSON **solo Preview y rama feature/fase-3a-operativa**, usando el contenido base64url del archivo privado. Mantener NEXT_PUBLIC_APP_ENV=test, variables backend sufijo _TEST y ADMIN_LEGACY_RECOVERY_ENABLED=false. No seleccionar Production ni modificar sus valores.
3. El deployment necesita tomar ese nuevo snapshot de variables. En el dashboard seleccionar el Preview TEST de esa rama y Redeploy, comprobar SHA/entorno/backend; esta es una acción futura de activación, no ejecutada ahora. Retirar/bloquear los previews históricos que conservarían credenciales previas. No copiar sintéticos a un entorno final.
4. Entregar la contraseña a su titular por canal privado individual y registrar solo «entregada», fecha y función del custodio. Nunca agregar claves/hashes/cookies al acta o Git. Identidad sigue PENDING hasta login real de cada titular.

## Verificación por persona

- Login en /admin/login con actor propio; /api/admin/auth/me muestra actor/nombre/rol aprobados, sin secreto.
- Venta: confirma y entrega, registra presencial, ve stock; intento directo de cancelación/stock/precios/caja obtiene 403.
- Operación: además cancela y gestiona stock/compras/caja/gastos/reportes; productos/precios/configuración obtiene 403.
- Administración: gestión de productos/precios y oferta POR_APERTURA; usuarios/configuración se mantienen mediante registro seguro y custodio técnico, no existe una pantalla de usuarios que haga esa gestión.
- Logout con «Cerrar sesión»; navegación privada/reconsulta de /me debe dar 401 y exigir login. El logout elimina la cookie del navegador; revocación/versionado es el mecanismo para invalidar una sesión copiada.
- Registrar PASS/FAIL, fecha, rol, evidencia no sensible y revisor. No marcar READY por tener un hash o por aprobar una prueba sintética.

## Revocación, pérdida, rotación y rollback

Revocar: conservar actor en registro con active=false y session_version actual + 1. Cambiar contraseña o rol: nuevo hash/rol y versión + 1. Reactivar: versión mayor que la revocada. No reducir versiones ni eliminar actor para «limpiar» historia. La validación rechaza esos retrocesos:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/preparar-registro-cuentas.mjs --validate operativa.local/cuentas/registro-test-v2.json --previous operativa.local/cuentas/registro-test-v1.json --encode operativa.local/cuentas/registro-test-v2.base64url
```

Tras cada cambio, editar solo el entorno autorizado, tomar nuevo snapshot de deployment y verificar cookie antigua 401, nuevo login y cada URL histórica retirada. Si se perdió contraseña: confirmar identidad por canal previamente acordado, revocar/versionar primero, generar otra en el gestor seguro, entregar al titular, validar login. No recuperar ni volver a entregar la clave antigua.

Rotación de secreto: nueva ADMIN_SESSION_SECRET y ADMIN_SESSION_SECRET_VERSION; ventana previa acotada con SECRET_PREVIOUS/PREVIOUS_VERSION. Retirar anterior al terminar ventana. Para invalidación inmediata/emergencia, no mantener anterior. Conservar evidencia de custodia y comprobar token antiguo/nuevo; clave y valores viven en gestor seguro.

Rollback: restaurar código estable con **registro y secretos vigentes**, nunca un deployment que reinstale cuentas/secretos revocados. Si registro nuevo falla, cerrar acceso admin y corregir configuración validada; rollback de registro conserva versiones monotónicas y revocaciones. No abrir legacy como sustituto.

## Validación técnica ya disponible

Tests fase9-identidad-hardening y fase9-roles-session-auth cubren los tres roles, password hash, revocación, incremento de versión, rotación, firma y escalamiento. QA sintética HTTP previa de login/logout y revocación consta en TEST_PLAN. Esta sesión agrega seis pruebas de transición segura/salida privada: 31 focales PASS. No se repitió el E2E caro ya cubierto. El gate identidad_cuentas espera solamente generación/entrega y login práctico de las diez personas, siguiendo este procedimiento.
