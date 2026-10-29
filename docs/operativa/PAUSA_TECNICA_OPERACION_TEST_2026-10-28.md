# Pausa y recuperación controlada — Operación TEST usable

Fecha de continuidad:28/10/2026 (America/Santiago). **Recuperación terminada; sprint detenido.** Solo se hicieron lecturas/validaciones remotas y documentación/respaldo local. No se reanudó el E2E, no hubo deploy, push ni nueva escritura TEST en esta recuperación.

## Git y conservación

- Repositorio real: `C:/Users/omarq/Dropbox/WEB ALMACEN POPULAR ROSA ELENA MORALES/web_almacen_popular`.
- Rama: `feature/fase-3a-operativa`.
- HEAD local íntegro: `3af0d6d2ef39f56e35f0442fe64bcce148bcaa2a`.
- HEAD remoto comprobado con ls-remote: `9200139c365483ab3fb18b85219f2c36dd9e8e64`.
- Un commit local sin push: `3af0d6d feat: preparar turno web TEST con inventario y arqueo durable`;43 archivos,1146 inserciones/154 eliminaciones. Contiene toda la fuente GASv26 desplegada; scripts/apps-script-pedidos.gs y runtime-caja-turno.gs no difieren de ese checkpoint.
- No se creó otro commit durante la recuperación: código/harness y documentación posterior permanecen locales. No se fuerza un checkpoint de un E2E bloqueado.
- main y origin/main siguen en `f203e0c1f1d74ffd9e826032a8c0a60df4ce6c3f`.
- Respaldo privado ignorado verificado: `operativa.local/recuperacion-20261028-015710/`. Guarda los10 archivos pendientes encontrados al recuperar, sus SHA256 y working-tree.diff. Cada copia se comparó con el original. El maestro del usuario continúa untracked, intacto; no fue incorporado a Git.
- `tsconfig.json` tiene cambios automáticos del servidor Next: formato/include hacia un build temporal. Se preservaron; no se confirman como configuración definitiva. Revisar tras finalizar los servidores QA, sin descartar otros cambios.

## Matriz del sprint

COMPLETO se limita a la evidencia indicada; **el turno administrativo extremo a extremo no está completo**.

| Componente | Estado | Evidencia / faltante |
|---|---|---|
| Continuidad, backup y conciliación | COMPLETO | HEAD/rama, respaldo local, backup Sheet legible y comparación exacta de filas preexistentes. |
| Login, actor y roles | PARCIAL | Login HTTP real con tres identidades sintéticas efímeras y /me PASS; tests de spoofing/roles. Falta primer acceso humano Omar y cierre del recorrido/logout remoto del ensayo. |
| Inventario físico | PARCIAL | UI, conversión, CAS, key/readback, recuperación de sesión y tests implementados. Interacción visual solo en memoria;0 ajustes reales del sprint. |
| Alta física unidad | COMPLETO acotado | Ruta Next real creó un SKU sintético inactivo/stock0, con auditoría. No equivale a alta comercial ni a validación humana de UX. |
| Alta física granel | BLOQUEADO |409 Modelo de granel incompleto. Causa del DTO descrita abajo; no se creó ese SKU. |
| Compras / reposición | PARCIAL | Selector/líneas/g/kg/costo kg, actor y readback locales. Ninguna compra nueva remota; E2E pendiente. |
| Actor de sesión | COMPLETO en código/test | Backend firmado y DTOs excluyen suplantación; UI sin responsable manual en compra/gasto/POS. |
| Apertura QA | PENDIENTE | APE-20261028 no se creó. No modificar aperturas comerciales existentes. |
| Venta presencial | PARCIAL | V1 conservado, granel/actor UI mejorados; ensayo nuevo aún no llegó a vender. |
| Tienda/carrito/pedido/confirmar/pagar/cancelar | PARCIAL | Servicios V1 conservados y suite local PASS. Nuevo ciclo remoto no ejecutado. |
| Gastos asociados | PARCIAL | Metadatos explícitos GASTO_CAJA_V1, actor/readback y bloqueo de cierre implementados;0 gastos nuevos remotos. |
| Arqueo/cierre financiero | PARCIAL | Dominio, UI, runtime GASv26 y tabla aditiva instalados. Tests de CAS/replay/fallos PASS;0 cierres reales, E2E pendiente. |
| Historiales/reportes | PARCIAL | V1 preservado y nuevo historial de cierres preparado; falta prueba del turno persistido. |
| Granel compartido | PARCIAL | Input g/kg,±100g, atajos/subtotal y D40 preservados; falta visual completa/E2E y corregir alta granel. |
| Configuración inicial | PARCIAL | Pantalla informativa TEST y permisos implementados, sin promover F10. Falta Preview/revisión humana final. |
| Preview / guía / visual | PARCIAL | Guía en borrador y harness con red bloqueada. Preview remoto sigue en base9200139; no se publicó este sprint. Visual desktop/móvil no finalizada. |
| Cuenta individual Omar | BLOQUEADO humano | Procedimiento seguro existente; no se generó ni entregó una credencial humana. No afirmar activación. |
| Cleanup | PARCIAL seguro | Único fixture real inactivo/stock0/sin familia; sin efectos de inventario ni operaciones nuevas pendientes. Se conserva auditoría; no se borró evidencia. |

## Estado remoto acreditado

TEST exacto: `1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM`, nombre `TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES`,20 pestañas actuales.

Backup completo anterior: [BACKUP TEST OPERACION USABLE 2026-10-28T18-07-00Z](https://docs.google.com/spreadsheets/d/1_jeHvpqSdxdE7b8exFFkGV3ZgpPs_nDasBQFYZ8jh_I/edit).19 pestañas legibles; antes de migrar se verificaron valores/fórmulas/formatos/validaciones/notas idénticos. No se reemplazó ese backup.

Apps Script TEST **v26 confirmado nuevamente** mediante dry-run/clasp: deployment y proyecto exactos, HEAD remoto y versión desplegada coincidentes, configuración TEST preservada; sin push ni deploy durante la recuperación. Log seguro: `operativa.local/recuperacion-preflight-v26.log`.

Rollback v25 privado: `operativa.local/backups/apps-script-test-v25-5f30117568314d11850e38d0d2aa4ac6/`, legible y con Código.js+appsscript.json. SHA256 Código.js `2f0bb4123d5abf76107b879d78859428f3a380123a96a1082313e61d35e4eff7`; manifest `ddd4762fab1423c2081502cec5758a38840ba0dd06bd901e7d897b4f38a1a023`. No imprimir su contenido: conserva configuración privada. Ningún secreto se agrega a Git/logs.

### Escrituras del sprint anterior a la recuperación

1. Nueva hoja CIERRES_CAJA,18 headers, **0 filas**; ninguna columna/valor histórico rellenado.
2. Un SKU: `PROD-TEST-WEB-90cbfde8cd54c0e13353e156570719e5`, nombre ENSAYO-TEST unidad turno, inactivo NO, stock0, costo sintético500, precio sintético1000, familia vacía.
3. Una auditoría `AUD-20261028-151809-6f9000c1`, acción crear, actor `qa-sprint-administracion`, referencia `TURNO-USABLE-20261028-ALTA-U`.
4. Deploy autorizado TEST v25→v26, ya versionado en3af0d6d.

**Corrección del informe incompleto anterior:** el ensayo sí superó posteriormente los login HTTP y creó esa unidad; no quedó detenido definitivamente antes de cualquier fixture. Los logs y el readback son la fuente de este estado.

El nuevo readback de recuperación confirma: las filas previas de las19 hojas conservan exactamente valores/fórmulas/formatos/validaciones/notas;54 SKU comerciales intactos,18 familias QA inactivas,0 familias comerciales asociadas. Solo aparecen las dos filas nuevas indicadas. **0 compras,0 ventas,0 pedidos,0 gastos,0 movimientos y0 operaciones nuevas;0 cierres.** No hubo descuento de inventario.

Las dos operaciones legacy REQUIERE_REVISION `OPE-20260924-233415-1ca1a5b3` y `OPE-20260924-235720-04b91125` ya estaban en el baseline, acreditadas por30e047e. No se repite su remediación ni se presentan como operaciones nuevas del sprint. No hay nuevos bloqueos QA.

## Bloqueo exacto y reanudación futura

Último ensayo: `operativa.local/sprint-e2e-web-6.log`; estado durable del arnés local: `operativa.local/e2e-turno-web-20261028.json`. Solo tiene el paso alta_unidad acreditado. Último resultado: **409 Modelo de granel incompleto** al intentar alta_granel.

**Errata acreditada en la reanudación posterior:** la recuperación atribuyó incorrectamente el fallo a un campo omitido en DTO. CAMPOS_PRODUCTO contiene gramos_unidad_stock tanto en9200139 como localmente, y la regresión integral demuestra que llega intacto a GAS. La causa real es el payload del formulario/arnés: unidad_medida=kg con base250g, combinación que validarModeloGranel_ rechaza correctamente. kg requiere base1000; bases100/250 usan unidad nativa unidad. La validación también admite unidad con base1000; no se restringe el modelo histórico. El arreglo posterior corrige la construcción del payload, no el DTO ni celdas/GAS. Ver evidencia actualizada en el informe del sprint; este documento conserva el estado de pausa original.

Orden para la próxima tarea autorizada:

1. Leer esta continuidad y verificar rama/HEAD/status. Preservar todos los pendientes y el maestro untracked. No reiniciar C5/C6/C7 ni el sprint.
2. Verificar que no haya E2E remoto en ejecución. Hay un servidor **solo mocks** PID2368, localhost3106, comando qa-visual-turno.mjs --local-mocks al recuperar; no hay listener3108 ni escritor remoto activo. Revalidar PID/command antes de detenerlo. Nunca matar procesos Node indiscriminadamente.
3. Resolver el include temporal generado de tsconfig solo tras preservar la copia y terminar el servidor QA. No confundirlo con cambio funcional del proyecto.
4. Corregir y probar **solo el contrato de creación granel** para conservar base100/250/1000; edición histórica debe seguir protegiendo la base. Añadir regresión DTO→ruta→GAS. No implementado aún.
5. Revalidar destino/backups y leer el SKU unidad existente y la ausencia del granel antes de cualquier nuevo POST. Conservar actor/key/ID; no crear otra unidad. El rechazo del granel no produjo una fila acreditada.
6. Continuar el arnés desde **alta_granel**, usando su estado/key originales después de conciliar. Después conteo→compra→apertura→POS→pedido→confirmación→pago→cancelación→reposición→gasto→arqueo→cierre→cleanup. No ejecutar ese comando en la presente recuperación.
7. Completar readback de autoría/cantidades/idempotencia y comparación comercial contra backup, visual1280×900/390×844, QA final/build tras transporte, guía/Preview y acceso humano. Solo después evaluar nuevos commits/push/deploy según la autorización de esa tarea.

Un primer intento de arnés tuvo403 por origen custom localhost; otro500 por registro QA JSON con dólares/dotenv. Se corrigieron **solo en el arnés** usando origen coherente y registro base64url; logins de tres roles PASS. Los builds de dev aislados requirieron node_modules en el padre de build, porque Next limpia el dist; corrección local preparada en ambos scripts. Un HTML inicial502 durante alta_granel no se asumió como éxito: se leyó la Sheet y se conservó la misma clave. Posteriormente el rechazo409 acreditó el fallo de contrato. No hubo restauraciones generales.

## QA realmente ejecutado antes de la recuperación

| Evidencia local | Resultado real | Límite |
|---|---|---|
| sprint-suite-4.log |1272 PASS,0 FAIL,0 skipped |Checkpoint local/caja. |
| sprint-suite-6.log |1280 PASS,0 FAIL,0 skipped |Incluye transporte TEST posterior sin commit. |
| sprint-transporte-focal.log |184 PASS,0 FAIL,0 skipped |C4+8 pruebas nuevas de transporte; no sumarlas otra vez al total. |
| sprint-focal-4.log |39 PASS |21 inventario+18 caja; después se añadió1 test de esquema y el total pasó a40 focales. |
| sprint-build-2.log |Build aislado PASS |Anterior al transporte posterior y últimos cambios del arnés; build final pendiente. |
| typecheck/lint/scan/diff |PASS en los puntos registrados del sprint |No se repitió suite/build en esta recuperación. tsconfig tiene ahora include temporal. |
| auditar-v1-turno-usable.mjs |PASS |244 declaraciones GAS,7 adiciones exactas y12 archivos críticos preservados. |
| E2E HTTP real |PARCIAL |Login/me tres roles y alta unidad; bloqueo de granel antes de inventario/compra. |
| Visual local |PARCIAL |Inventario cargado y preview congelado, aplicación solo en memoria; sin afirmar walkthrough completo ni móvil PASS. |

Esta recuperación ejecutó únicamente validación Git/archivos/backups, preflight read-only y readback. No se corrieron tests extensos nuevos. Hash F10 permanece `56fd599dfd1fe4162cb004d3adbba71f956d8556d107458df7e159a906b0aed9`; no se promovieron gates.

## Archivos pendientes de confirmar al recuperar

Modificados: src/lib/appsScriptPedidos.ts; tests/familias-durable-c4.test.mjs; tests/fase9-precondiciones-observabilidad.test.mjs; tsconfig.json.

Nuevos: src/lib/appsScriptTransporteTest.ts; tests/operacion-usable-transporte.test.mjs; scripts/e2e-turno-web-test.mjs; scripts/qa-visual-turno.mjs; docs/operativa/GUIA_OMAR_TURNO_COMPLETO_TEST_2026-10-27.md; maestro WEB_ALMACEN_POPULAR_ROSA_ELENA_MORALES_CONTINUIDAD_MAESTRA_2026-10-28.md (aportado por usuario).

Esta recuperación añade el presente documento y actualiza mínimamente PROJECT_STATE, TASKS, informe del sprint y nota de borrador de la guía. Permanecen sin commit, con el resto de los cambios preservados. Los43 archivos del checkpoint se consultan íntegros con git show --stat3af0d6d; no son43 pendientes adicionales.

Variables revisadas solo por nombre en .env.local/.env.development.local: referencias GOOGLE_SCRIPT productivas y sufijo_TEST, NEXT_PUBLIC_APP_ENV, ADMIN_USERS_JSON, ADMIN_SESSION_SECRET/versiones/previas, ADMIN_PANEL_PASSWORD y ADMIN_LEGACY_RECOVERY_ENABLED. Los wrappers eliminan referencias productivas y usan solo TEST; no se cambiaron variables ni se imprimieron valores.

## Límites vigentes

Sin main/Production/Sheet o Apps Script productivos. Sin familias comerciales, migración, catálogo/carrito/POS familiar. Sin cambio de stock/costo/precio comercial. La cuenta Omar, respuestas Nadia, fotos Carolina, conteo/saldos reales y capacitación siguen sus gates existentes. El fixture inactivo no autoriza F10 READY. **Detenerse después de entregar este informe; no empezar implementación ni E2E.**
