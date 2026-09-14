# WEB Almacén Popular Rosa Elena Morales

Sitio público, tienda de pedidos anticipados y panel operativo del Almacén Popular Rosa Elena Morales. La aplicación usa Next.js; los datos operativos se mantienen en Google Sheets mediante un backend Google Apps Script.

## Desarrollo local

Requisitos: Node.js 20 o superior y npm.

```bash
npm ci
npm run dev
```

La configuración se recibe exclusivamente por variables de entorno. Los archivos `.env*.local`, credenciales OAuth e identificadores clasp están ignorados y nunca deben versionarse.

Valores reconocidos por `NEXT_PUBLIC_APP_ENV`: `local`, `demo`, `test` y `production`. TEST exige las variables con sufijo `_TEST`; el código bloquea el fallback y también bloquea que TEST coincida con producción.

## Calidad

```bash
npm test
npm run lint
npm run build
git diff --check
```

La integración continua ejecuta estas comprobaciones sin secretos. Los E2E remotos se ejecutan de forma explícita y separada porque escriben datos identificados en TEST.

El chequeo consolidado local (`npm run preflight:tecnico`) exige un worktree limpio e incluye auditoría crítica de dependencias. `npm run preflight:test` agrega el dry-run de Apps Script TEST y el E2E read-only; requiere que la sesión ya tenga únicamente la configuración TEST necesaria.

## E2E Fase 5/6 — solo TEST

```bash
npm run test:e2e:fase56:idempotencia:preflight
npm run test:e2e:fase56:idempotencia
npm run test:e2e:fase56
```

Las escrituras requieren el opt-in definido por el runner. No se cargan archivos env automáticamente, no existe cleanup remoto y producción queda fuera de este flujo.

## Apps Script TEST

```bash
npm run apps-script:test:dry-run
npm run apps-script:test:deploy
```

El dry-run es el modo predeterminado. El segundo comando exige confirmaciones adicionales, conserva la configuración remota y actualiza únicamente el deployment TEST ya identificado. Nunca se debe reutilizar para producción. Consulta `docs/APPS_SCRIPT_PEDIDOS.md` y el propio script de despliegue antes de operar.

## Estructura y documentación

- `src/app/`: páginas y rutas API Next.js.
- `src/lib/`: reglas de negocio puras y clientes de backend.
- `scripts/apps-script-pedidos.gs`: backend versionado.
- `tests/`: pruebas con `node --test`.
- `docs/`: modelo, decisiones, planes y evidencia de validación.

El modelo de datos está en `docs/DATA_MODEL.md`; la configuración inicial de Sheets, en `docs/GOOGLE_SHEET_SETUP.md`; y el procedimiento de respaldo/rollback, en `docs/OPERACION_BACKUP_ROLLBACK.md`.

## Ramas y despliegue

El trabajo técnico se integra en `feature/fase-3a-operativa`. Un despliegue productivo requiere un Go/No-Go humano separado: backup, revisión de variables, pruebas TEST verdes, versión Apps Script recuperable y verificación posterior. Ningún comando E2E o clasp TEST autoriza cambios en producción.
