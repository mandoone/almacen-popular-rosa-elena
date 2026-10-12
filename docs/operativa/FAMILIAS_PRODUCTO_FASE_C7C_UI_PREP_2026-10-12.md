# C7-C — Preparación administrativa local

Base: `9318e43b2c0f28a7c17d144bc285851f277b1803`, rama `feature/fase-3a-operativa`.

## Bloque 1 — Oferta pública e identidad física

Página `/admin/familias/preparacion`, solo entorno TEST y capacidad `productos:gestionar`. Usa el manifest C7-B versionado; no lee el maestro real. Los valores operativos del simulador (stock10/costo500/precio SKU600) son sintéticos y están rotulados como MOCK. Categorías no acreditadas también son mocks, no datos a migrar.

Secciones separadas para oferta/familia y SKU/identidad; los tres aprobados muestran sus identidades propuestas, no una asociación ya escrita. Cuatro Económico siguen pendientes Nadia, diez cardinalidades pendientes Omar, variantes sin elección y18 graneles postergados. Estados de revisión local: PENDIENTE, PROPUESTO, APROBADO_PARA_DRY_RUN, BLOQUEADO. No existe aprobación para migrar.

Ejemplos sintéticos: Económico con uno/dos SKU, EXPLICITA y NO_APLICA. Cambiar política pública conserva marca física; el experimento no altera el manifest ni el plan. Imagen branded se bloquea, sin fallback SKU. Proveedor/costo pertenecen a compras; cambio de marca o contenido requiere otro SKU.

Archivos del bloque: `revisionAdminC7c.ts`, `FamiliasPreparacionC7c.tsx`, `C7cEscenarios.tsx`, nueva página y enlace desde simulador, `familias-admin-c7c.test.mjs`.

Verificación del bloque:11 pruebas nuevas +41 regresiones focales PASS, typecheck y lint PASS. Ingesta y preview se completan en el bloque2; recorrido visual/QA final en el bloque3. No escritura TEST ni deploy, v25 preservada. C5/C6/C7-A/C7-B no se reejecutan.

## Bloque 2 — Ingesta, mapa y preview

Carga JSON local (máximo200 KB UTF8), textarea y formulario de identidad/evidencia. Orígenes separados NADIA/OMAR/CONTEO_FISICO/DOCUMENTO_VIGENTE. La fuente es una declaración local que debe acreditarse humanamente antes de una futura migración. No hay edición de IDs, stock, costo ni precio. Template pendiente inicial; botón sintético explícito para ensayar respuesta futura, sin completar la plantilla del repositorio ni afirmar que Nadia respondió.

La UI llama los validadores/proyección C7-B, el dry-run C6/C7-A y el generador de plan existente. Rechaza campos extra, identidades contradictorias, SKU desconocidos o duplicados, marca/formato/evidencia incompletos. Un resultado previo se invalida al cambiar entrada; se descartan respuestas asíncronas obsoletas. No existe botón Aplicar/Guardar ni ruta nueva de API.

Con el template pendiente: CUMPLE,3 familias,3 SKU,3 asociaciones;9 cambios simulados, segunda ejecución0, inverso9.51 SKU sin contrato,20 bloqueados/postergados (18granel+2históricos),10 cardinalidades Omar pendientes. Tabla muestra antes/después/evidencia/estado/hash/precondición por operación. Inverso restaura identidad/asociación y desactiva familias creadas sin borrar historia. Valores esperados completos incluyen saldos MOCK, por lo que este plan local no es ejecutable contra TEST real: una futura tarea deberá generar otra base verificada y autorizada.

Archivos adicionales: `revisionIngestaC7c.ts`, `C7cIngesta.tsx`, `C7cRevisionPlan.tsx`, `familias-ingesta-ui-c7c.test.mjs`.

Verificación del bloque:21 pruebas nuevas,32 C7-C acumuladas y24 C7-B focales PASS; typecheck/lint PASS. Pruebas de rollback/replay mantienen operaciones e identidades en copias. Ningún dato comercial ni respuesta humana se acredita por la simulación.

## Bloque 3 — Walkthrough, explicación y cierre

Recorrido con navegador local IAB, viewport1280×900 y390×844. Harness sin credenciales reales y con red remota bloqueada; cuatro lecturas GET de fixtures en memoria por el dashboard local, cero llamadas Google/Drive/TEST real. No se reejecutó C5 ni se desplegó código. Tab cerrada, viewport restaurado y servidor QA detenido.

| Caso visual / funcional | Resultado |
|---|---|
| Selección Fuzol / Aceite pendiente | Identidad acreditada/propuesta y desconocida diferenciadas; stock/costo/legacy mock separados. |
| Económico uno/dos SKU | Marca pública omitida, marca interna conservada; agregado interno5/13 y oferta Disponible. |
| EXPLICITA / NO_APLICA | Marca QA visible / sin marca artificial. |
| EXPLICITA → Económico local | Conserva marca interna, elimina solo marca pública de la copia; no afecta el plan aprobado. |
| Imagen branded VARIABLE | Placeholder y warning comprensible; no carga la URL bloqueada. |
| Proveedor / marca / formato | Proveedor por compra, sin selector fijo; otra marca/formato exige otro SKU. |
| Carga de archivo JSON pendiente | CUMPLE para tres;9/0/9 cambios en memoria. |
| Ejemplo sintético / formulario con evidencia | Proyección de cuarta oferta solo local; origen DOCUMENTO_VIGENTE explícito, sin fingir respuesta Nadia. |
| Campo precio inyectado | BLOQUEADO; se retira resultado anterior, cero tablas de plan y cero escrituras. |
| Plan/inverso | Antes/después/evidencia/precondiciones legibles;9 acciones de rollback con desactivación sin borrar. |
| Móvil, labels y foco | Ancho documento375 para viewport390; desktop1265 para1280; todos los controles etiquetados y foco visible. |
| Tabla móvil | Scroll horizontal dentro del contenedor con nombre accesible y foco; no desborda la página. |
| Consola / controles | Sin errores; botones solo proponer JSON/validar/ejemplo/restablecer. No Guardar/Aplicar. |

Se ajustó fecha de evidencia a texto explícito AAAA-MM-DD: el control nativo no quedó completado por la automatización; HTML valida patrón y C7-B valida fecha real. No se relajó esa validación. También se bloquea revisión mientras se lee el archivo y se limpia el formulario al restablecer template.

Limitación visual: el harness offline muestra fuente de reserva; se verificó disposición, flujo, texto, foco y dimensiones, no fidelidad tipográfica de un Preview desplegado. No se alteraron fuentes globales. Capturas privadas locales conservadas bajo `operativa.local/c7c-*`; solo contienen datos sintéticos y no entran a Git.

La [explicación para el Almacén](EXPLICACION_MARCAS_Y_SKU_PARA_ALMACEN_2026-10-12.md) describe oferta/SKU/proveedor/imagen sin pedir respuestas nuevas. La [guía Omar](GUIA_PRUEBA_OMAR_TEST_2026-10-12.md) incorpora este recorrido. [Alcance vigente de imágenes](AUDITORIA_IMAGENES_CATALOGO_VARIABLE_2026-10-12.md): Omar ya revisó cobertura y Carolina completa/corrige/entrega carpeta final. No inspección general adicional ni backlog paralelo.

## Archivos y límites

- Dominio local: `src/lib/familias/revisionAdminC7c.ts`, `revisionIngestaC7c.ts`.
- UI: `src/app/admin/familias/preparacion/page.tsx`; `src/components/admin/FamiliasPreparacionC7c.tsx`, `C7cEscenarios.tsx`, `C7cIngesta.tsx`, `C7cRevisionPlan.tsx`; enlace aditivo en `FamiliasSimulador.tsx`.
- Tests: `tests/familias-admin-c7c.test.mjs`, `familias-ingesta-ui-c7c.test.mjs`.
- Documentación: esta acta, explicación Almacén, alcance auditoría imágenes, guía Omar/estado pre-lanzamiento y cinco documentos vivos.

Sin nueva API, puerto Sheets, localStorage o persistencia del formulario. Autenticación usa el GET de sesión existente; middleware exige capacidad de administración y página retorna404 fuera de TEST explícito. No cambió `FamiliasAdmin` operativo ni las acciones de Apps Script. El simulador C6 mantiene su lectura original.

No se modificaron manifest/template C7-B, contratos C1/C2/C4/C5, fotografías, /tienda, carrito, pedido, confirmación, cancelación, compras, POS, stock o D40. No se agregaron dependencias. F10 permanece igual; los tests no promueven gates humanos. C5 sigue cerrado716e8c8 y GAS TESTv25 por cierre acreditado; no se consultó/desplegó el servicio remoto en C7-C.

## Próximo paso y HUMAN_GATES

Al llegar respuestas Nadia: guardar fuente/fecha en canal autorizado, cargar JSON local, validar identidad/mapa y revisar hallazgos/previews. Las cuatro Económico mantienen política pública aprobada y marca física pendiente; variantes siguen sin elegir/fusionar. Las diez propuestas de cardinalidad requieren Omar; Clorinda sigue sin SKU acreditado,18graneles postergados. Fotos/derechos quedan en el flujo Carolina, sin ampliar preguntas.

Una tarea futura deberá autorizar explícitamente la migración TEST, capturar una base real nueva, generar un plan con precondiciones reales y disponer backup/readback/rollback. Este plan de UI con saldos MOCK no se aplica contra Sheets. Catálogo/carrito/pedido/POS familiar permanecen desactivados. Production no está autorizada.

## QA final y checkpoints

- Checkpoint1 `e343348`: modelo/admin/UI oferta-SKU,11 pruebas focales nuevas, typecheck/lint/diff y diferencial V1 PASS.
- Checkpoint2 `b5e68b6`: ingesta/mapa/plan/inverso,21 pruebas focales nuevas (32 acumuladas), regresiones C7-B y typecheck/lint/diff PASS.
- Checkpoint3 de cierre: walkthrough, fecha explícita, protección de lectura de archivo, documentación y dos pruebas adicionales de página real TEST/roles.34 pruebas C7-C PASS.
- Suite completa final: **1224 PASS,0 fail,0 skipped**. Lint, typecheck, build aislado sin servicios remotos, scan secretos (411 archivos) y `git diff --check` PASS.
- Auditoría V1:23 archivos operativos conservados,47 acciones V1 y51 funciones de transporte iguales; seis diferenciales locales (pedido/unidad, granel100/250/1000, compra legado y POS granel) idénticos.187 funciones GAS iguales salvo guards ya acreditados C5. Diff adicional contra9318e43: cero cambios en scripts/GAS, API, tienda, transporte, fases operativas o manifest/template C7-B.
- F10 local mantiene bytes:SHA256 `56fd599dfd1fe4162cb004d3adbba71f956d8556d107458df7e159a906b0aed9`. No READY/PENDING promovido. Main/origin-main conservan `f203e0c1f1d74ffd9e826032a8c0a60df4ce6c3f`.

No lecturas ni escrituras reales de TEST durante C7-C,0 deploys; Apps Script TEST siguev25 según cierre C5. Sheet productiva/Production intactas. Sin familias comerciales cargadas, SKU asociados, cambios stock/costo/precio o activación familiar pública. Todos los commits/pushes de esta sesión corresponden exclusivamente a `feature/fase-3a-operativa`.
