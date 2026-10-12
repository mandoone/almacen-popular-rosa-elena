# C7-C — Preparación administrativa local

Base: `9318e43b2c0f28a7c17d144bc285851f277b1803`, rama `feature/fase-3a-operativa`.

## Bloque 1 — Oferta pública e identidad física

Página `/admin/familias/preparacion`, solo entorno TEST y capacidad `productos:gestionar`. Usa el manifest C7-B versionado; no lee el maestro real. Los valores operativos del simulador (stock10/costo500/precio SKU600) son sintéticos y están rotulados como MOCK. Categorías no acreditadas también son mocks, no datos a migrar.

Secciones separadas para oferta/familia y SKU/identidad; los tres aprobados muestran sus identidades propuestas, no una asociación ya escrita. Cuatro Económico siguen pendientes Nadia, diez cardinalidades pendientes Omar, variantes sin elección y18 graneles postergados. Estados de revisión local: PENDIENTE, PROPUESTO, APROBADO_PARA_DRY_RUN, BLOQUEADO. No existe aprobación para migrar.

Ejemplos sintéticos: Económico con uno/dos SKU, EXPLICITA y NO_APLICA. Cambiar política pública conserva marca física; el experimento no altera el manifest ni el plan. Imagen branded se bloquea, sin fallback SKU. Proveedor/costo pertenecen a compras; cambio de marca o contenido requiere otro SKU.

Archivos del bloque: `revisionAdminC7c.ts`, `FamiliasPreparacionC7c.tsx`, `C7cEscenarios.tsx`, nueva página y enlace desde simulador, `familias-admin-c7c.test.mjs`.

Verificación del bloque:11 pruebas nuevas +41 regresiones focales PASS, typecheck y lint PASS. Ingesta y preview se completan en el bloque2; recorrido visual/QA final en el bloque3. No escritura TEST ni deploy, v25 preservada. C5/C6/C7-A/C7-B no se reejecutan.
