# Implementación del calendario admin en TEST

> Alcance: Fase 3B, bloque `APERTURAS` + calendario admin. Este procedimiento
> opera únicamente sobre la copia TEST. No autoriza cambios en producción ni
> requiere registrar en el repositorio la URL, el token o el ID reales de TEST.

## 1. Qué quedó preparado en código

- `scripts/apps-script-pedidos.gs` incorpora:
  - preparación idempotente de la hoja `APERTURAS`;
  - las siete semillas 2026;
  - `listarAperturas`, `obtenerApertura`, `crearApertura`,
    `actualizarApertura` y `cambiarEstadoApertura`;
  - validaciones de estructura, enums, fecha/horario, ID y solapamiento;
  - `LockService`, claves de idempotencia y bloqueo optimista mediante
    `actualizado_en_esperado`;
  - auditoría de creación y actualización.
- Next.js incorpora las rutas admin y la UI para listar, crear, editar y cerrar
  aperturas.
- El calendario conectado se bloquea salvo que `NEXT_PUBLIC_APP_ENV=test`.
- Las acciones de calendario del Apps Script se bloquean salvo que la propiedad
  de script `APP_ENV` sea exactamente `TEST`.
- `/admin?demo=1` conserva su componente aislado y no llama a estas rutas.

No se agregaron rutas públicas de calendario, pedidos anticipados completos ni
modo presencial. La lógica de stock y pedidos existentes no cambió.

## Validación final local + TEST (hito completado)

La integración quedó validada exclusivamente sobre TEST:

- La hoja TEST `APERTURAS` fue creada y quedó operativa con las siete aperturas
  oficiales.
- Apps Script TEST quedó desplegado como versión 2 y `listarAperturas` respondió
  `ok: true`.
- Next.js local se validó con `NEXT_PUBLIC_APP_ENV=test`: login admin y
  `/api/admin/aperturas` funcionaron correctamente.
- Se comprobó el ciclo autenticado crear → editar → cerrar con la apertura
  temporal `APE-20261226`. La fila temporal fue eliminada después desde la
  Sheet TEST; el panel `/admin` volvió a mostrar solo las siete aperturas
  oficiales.
- El ajuste visual posterior de fechas y horas quedó incorporado en el commit
  `dad9542`; no requirió modificar ni volver a desplegar Apps Script TEST.
  `/admin` local muestra fecha `19-09-2026`, horario `11:00–15:00` y cierre
  `17-09-2026 23:59`, sin fechas base `1899-12-30` ni marcas ISO largas en las
  tarjetas.
- Los dos checks de Vercel finalizaron correctamente para este hito.

Producción, sus variables y su Apps Script permanecen fuera de alcance.

## 2. Preparar físicamente `APERTURAS` en la Sheet TEST

Esta acción manual ya fue ejecutada en el proyecto Apps Script TEST. Se conserva
el procedimiento como referencia de preparación para una copia TEST nueva.

1. Abrir exclusivamente el proyecto Apps Script asociado a la copia TEST.
2. Confirmar visualmente que no es el proyecto productivo.
3. En **Configuración del proyecto → Propiedades del script**, crear o actualizar:

   ```text
   APP_ENV = TEST
   ```

4. Copiar el contenido actualizado de `scripts/apps-script-pedidos.gs` al
   proyecto TEST. Conservar en ese proyecto los valores TEST ya configurados de
   `SPREADSHEET_ID` y `ADMIN_TOKEN`; no copiarlos al repositorio ni a una salida
   de terminal.
5. Seleccionar y ejecutar manualmente:

   ```text
   prepararHojaAperturasTest
   ```

6. Autorizar la ejecución si Google lo solicita.
7. Revisar el valor devuelto por la ejecución. La función:
   - crea `APERTURAS` solo si no existe;
   - exige los 15 encabezados exactos si ya existe;
   - agrega únicamente semillas cuyo `apertura_id` todavía no existe;
   - no borra ni reemplaza filas existentes.
8. Verificar en la Sheet TEST las siete filas esperadas y completar `lugar`
   antes de guardar una semilla como `programada` o `activa` desde la UI. Las
   semillas no se exponen públicamente en esta pasada porque no se implementó
   una ruta pública de aperturas.

La función rechaza la ejecución si falta `APP_ENV=TEST`; por diseño no existe
un modo equivalente para producción.

## 3. Desplegar el Apps Script TEST

El despliegue TEST fue actualizado y quedó funcionando como versión 2. Se
conserva el procedimiento de referencia para cambios futuros del script:

1. En el proyecto Apps Script TEST, abrir **Implementar → Administrar
   implementaciones**.
2. Editar únicamente la implementación Web App TEST existente.
3. Seleccionar **Nueva versión** y desplegar.
4. No cambiar quién ejecuta la Web App, permisos, URL ni configuración del
   proyecto productivo.
5. Mantener la URL TEST únicamente en la variable local ya existente; no
   pegarla en documentación, commits, tickets ni salida de terminal.

Si el despliegue TEST no se actualiza, Next.js recibirá “acción no reconocida”
o “no existe la hoja APERTURAS”; eso no debe resolverse apuntando a producción.

## 4. Prueba local contra TEST

La prueba local autenticada contra TEST se completó correctamente, sin abrir ni
imprimir `.env.local`. Los pasos siguientes quedan como checklist reproducible:

```powershell
npm.cmd run dev
```

Luego:

1. Abrir `/admin` e iniciar sesión con la sesión admin TEST habitual.
2. Confirmar que el bloque muestra la insignia `TEST` y lista las siete
   aperturas.
3. Crear una apertura temporal `por_confirmar`, con lugar vacío.
4. Editarla: completar lugar, horario, cierre y pasarla a `programada`.
5. Cerrar esa misma apertura con **Cerrar apertura**.
6. Recargar y verificar que los cambios persisten y que la auditoría se
   actualizó en la Sheet TEST.
7. En una segunda pestaña, editar la misma apertura; guardar primero en una y
   comprobar que la otra recibe conflicto `409` al intentar sobrescribir la
   versión anterior.
8. Abrir `/admin?demo=1` en desarrollo y confirmar que siguen apareciendo los
   datos simulados, sin llamadas a `/api/admin/aperturas`.
9. Sin sesión, comprobar que `GET /api/admin/aperturas` responde `401`.

Pruebas automáticas locales:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

## 5. Límites de esta pasada

- No se implementó el endpoint público de apertura relevante.
- No se implementaron cambios completos de pedidos anticipados, modo
  presencial, QR ni venta asistida.
- No se modificó ninguna variable de entorno ni la lógica actual de stock.
- No se realizó ni se autoriza ninguna intervención productiva.
