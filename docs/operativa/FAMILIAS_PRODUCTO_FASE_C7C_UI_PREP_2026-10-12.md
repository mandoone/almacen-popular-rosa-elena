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
