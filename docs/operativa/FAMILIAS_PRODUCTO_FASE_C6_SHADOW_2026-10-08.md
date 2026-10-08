# C6 — Catálogo familiar shadow y simulador de solo lectura

Fecha:2026-10-08. Rama exclusiva `feature/fase-3a-operativa`. Base C6:`716e8c857db7ea627a403a7fc61b195ceb69fe12`, C5 cerrado/pushed y árbol limpio. [Cierre C5, backups, v25 y rollback](FAMILIAS_PRODUCTO_FASE_C5_TEST_REAL_2026-10-07.md).

## Implementación

- `src/lib/familias/catalogoShadow.ts`: dominio puro de catálogo paralelo y DTO SKU mínimo.
- `src/lib/familias/mapaDryRun.ts`: propuesta JSON/CSV estricta, validación y reporte sin mutar.
- `src/lib/familias/auditoriaIdentidad.ts`: estados de faltantes basados únicamente en datos estructurados/evidencia explícita.
- `src/app/api/admin/familias/shadow/route.ts`: GET TEST + `productos:gestionar`, respuesta privada/no-store. No POST/PATCH/PUT/DELETE.
- `src/app/admin/familias/simulador/page.tsx` y `src/components/admin/FamiliasSimulador.tsx`: lectura, oferta simulada, detalle físico, warnings, mapa local y faltantes comerciales. Fuera de TEST:404. Middleware conserva permisos y firma de sesión actuales.
- `src/components/admin/FamiliasAdmin.tsx`: únicamente enlace al simulador; formularios administrativos existentes no cambian.
- `scripts/auditar-identidad-c6.mjs`: auditoría local reproducible desde captura nativa TEST. Verifica ID/nombre/headers/IDs; escribe solo un informe local.
- `tests/familias-shadow-c6.test.mjs` y `tests/familias-shadow-frontera-c6.test.mjs`:75 pruebas nuevas.

Además de esos10 archivos de implementación/pruebas, los8 archivos documentales son `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, `docs/PROJECT_STATE.md`, `docs/TASKS.md`, `docs/TEST_PLAN.md`, `docs/CHANGELOG.md`, esta acta y `docs/operativa/MAPA_COMERCIAL_FAMILIAS_SKU_PROPUESTA_2026-10-08.md`:18 archivos en total. Los documentos vivos enlazan al dueño de cada evidencia. No se modificó Apps Script, setup, transporte, roles, dominio A/C1/C2/C4 ni flujos operativos V1.

## Lectura y fronteras

La ruta usa únicamente `listarFamiliasProductoAdmin`, `listarProductosAdmin` y, con apertura explícita, `listarProductosPorAperturaAdmin`. No añade acciones GAS ni usa endpoints V2 de mutación. Lecturas independientes en paralelo, sin afirmar snapshot ACID; `lectura_en` identifica el diagnóstico. Un fallo de cualquiera descarta la respuesta completa. Contexto inválido se rechaza antes de consultar. Sin apertura, los POR_APERTURA no son elegibles.

`oferta` separa nombre público, categoría, presentación, precio familiar, política/marca pública, referencia de granel, estado y versión. No contiene stock, costos, nombres/marcas físicas, proveedor ni listas de SKU. El diagnóstico admin contiene los integrantes, marca física, presentación/contenido estructurado, elegibilidad y cantidades internas aparte. El simulador muestra explícitamente política pública y familia, sin mezclar cantidades internas con la oferta. VARIABLE y NO_APLICA omiten `marca_publica`; EXPLICITA conserva únicamente la marca pública confirmada. No se genera un nombre a partir del SKU.

La disponibilidad C6 es `familia válida + activa + precio familiar positivo + agregado elegible >0`. Primero se excluyen SKU inactivos, duplicados, incompatibles, inválidos o POR_APERTURA no habilitados. Sus inconsistencias siguen visibles y no eliminan stock de otros SKU válidos. Familia duplicada/inválida, contexto inválido y overflow bloquean disponibilidad. No se infiere equivalencia por nombre; se reutilizan validadores estructurados existentes.

La lectura diagnóstica A sigue intacta: su criterio conservador ante inconsistencias no se reescribe. C6 tiene frontera propia para aplicar el criterio explícito >0. Un decimal positivo menor que paso puede indicar disponibilidad; ello no autoriza una cantidad de pedido inválida. La confirmación futura vuelve a validar cantidad, stock, apertura y bloqueos durables. El simulador no reserva inventario.

Precio exclusivamente `FAMILIAS_PRODUCTO.precio_venta`; cambios de costos/precios SKU no cambian oferta. Granel suma `stock_actual × gramos_unidad_stock` en gramos con rangos seguros:4×250+2×1000=3000g, no6 unidades. Bases100/250/1000 compatibles; D40 y los18 graneles comerciales no cambian.

## Dry-run de mapa

JSON:lista de objetos con exactamente `familia_id` y `producto_id`. CSV mínimo:headers `familia_id,producto_id`, sin campos libres/celdas entre comillas. Límite200.000 caracteres/2000 asociaciones. No admite marca/precio/presentación inventados por el navegador.

Valida existencias únicas, SKU en dos familias, asociación repetida, familia ya distinta, equivalencia, marca, presentación/contenido, precio y apertura. Proyecta cambios solo en copias; no desasocia automáticamente integrantes no mencionados ni permite sobrescribir otra familia. Audita el conjunto resultante, incluidas asociaciones previas, familias sin SKU, inactividad y agotados. Devuelve CUMPLE/ADVERTENCIA/BLOQUEADO, hallazgos y catálogo propuesto. Ningún botón guarda; el cálculo del mapa no hace peticiones HTTP.

## Lectura TEST real y auditoría humana

Metadata nativa reconfirmó ID autorizado y nombre exacto `TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES`. Se ejecutaron4 GET reales:destino F78, familias, productos y habilitación de APE-20991231. Resultado:18 familias QA inactivas,93 SKU totales,0 familias disponibles y0 escrituras. Se excluyen39 fixtures (37 C5 y2 previos); quedan36 envasados y18 graneles comerciales. Evidencia privada:`operativa.local/c6-shadow-test-real.json`/`.log`. Apps Script TEST permanece v25.

La auditoría comercial usa la captura nativa íntegra al cierre C5, excluye IDs QA y los dos fixtures previos documentados por guardrails F78 (`PROD-TEST-DECIMAL` y `PROD-TEST-F78-64C8BE2C22E0`), sin inferir marca por nombre. Reproducción:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/auditar-identidad-c6.mjs operativa.local/c5-final-nativo.json operativa.local/c6-auditoria-identidad.json
```

SHA256 de esa captura:`1b6f0195c6e9c8ab2dfc035eb1ce2bdc12490b54b6bd157825df011422db9a2a`.

| Estado principal | Cantidad | Interpretación |
|---|---:|---|
| YA_ACREDITADO |0|Ningún mapa comercial físico/familiar completo en campos nuevos. |
| FALTA_IDENTIDAD_FISICA |36|SKU envasados sin identidad estructurada suficiente. |
| FALTA_FAMILIA |0|No hay SKU con identidad completa que falte únicamente asociar. |
| NO_REQUIERE_FAMILIA_MULTI_SKU |0|No se inventó una exención; exige evidencia humana explícita. |
| GRANEL_POSTERGADO |18|Se conserva D40; no se activa mapa granel. |

Los54 SKU tienen `falta_familia=true` como ausencia técnica de relación validada. Esto no decide que todos deban migrarse ni que todos necesiten múltiples marcas. Los nombres vigentes del maestro se conservan, incluso marcas escritas en el nombre: no se convierten automáticamente en identidad acreditada.

El informe JSON privado y la propuesta enlazada permiten revisar el mapa futuro sin modificar datos. No se publican costos, stock comercial, contactos de clientes ni datos de compras.

El detalle por los54 SKU y la propuesta de ofertas, presentación, política y acciones futuras viven en [MAPA_COMERCIAL_FAMILIAS_SKU_PROPUESTA_2026-10-08.md](MAPA_COMERCIAL_FAMILIAS_SKU_PROPUESTA_2026-10-08.md). Clasifica7 LISTO_PARA_REVISAR,29 FALTA_IDENTIDAD,18 POSTERGADO_GRANEL y0 NO_REQUIERE_MULTI_SKU. LISTO_PARA_REVISAR acredita una propuesta pública con decisiones de Omar; no acredita automáticamente identidad física ni autoriza asociación. Clorinda es oferta explícita separada sin un SKU actual acreditado en el mapa.

## Verificación

75 pruebas nuevas PASS:disponibilidad, exclusiones y warnings, precio independiente, marcas, granel/overflow, parsers/duplicados/inmutabilidad, estados humanos y frontera de permisos/entorno/GET/no-store/errores. Suite completa1125 PASS/0 skipped/0 fail. Lint, typecheck, build aislado sin servicios, scan de secretos, diff check y auditoría diferencial V1 PASS.

Verificación visual local final en desktop1280×900 y móvil390×844:fuentes/componentes/ruta/middleware reales, transporte Sheets en memoria y red remota bloqueada. Sesión local sintética; no usuarios ni formularios reales. Oferta Económico:$650/Disponible sin marca; política VARIABLE explícita y detalle físico:A4+B7=11, contenido1000ml. Clorinda explícita separada, Shampoo750ml disponible con aviso comprensible por miembro1L excluido, granel3000g. JSON/CSV del mapa producen bloqueo para inexistencia/incompatibilidad sin una petición de escritura. Consola sin errores/warnings. No hay botones para guardar/mutar; solo Actualizar lectura y Validar sin guardar. Móvil sin desborde del documento, tablas con desplazamiento interno. Evidencia:`operativa.local/c6-desktop-final.png`, `c6-mobile-final.png` y `visual-c6-llamadas.json` (6 GET de transporte en memoria/0 mutaciones en la revisión final).

QA reproducible: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/familias-shadow*.test.mjs`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `node scripts/qa-build-aislado.mjs`, `npm run scan:secrets`, `git diff --check` y `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/auditar-v1-familias.mjs`. Evidencia privada final:`operativa.local/qa-c6-*-cierre.log`; no contiene credenciales publicadas. El build aislado se ejecutó después de cerrar el helper visual, sin servicios remotos.

La frontera API→Apps Script se acreditó con GET TEST reales por separado; la revisión de navegador usó mocks, no credenciales ni formularios TEST. No se afirma un deploy web nuevo ni una revisión visual humana por Omar.

V1:23 archivos operativos sin cambios desde base auditada,187 funciones GAS iguales salvo guards C5 acreditados,47 acciones V1 y51 funciones de transporte iguales;6 diferenciales de unidad/granel100/250/1000/compra/venta iguales. Contra base C6:Apps Script y todo dominio operativo existente intactos. Huellas nativas/comerciales de C5 conservadas; C6 no hizo escrituras Sheet ni deploy. F10 sigue sin cambio.

## Límites y próximo paso

No migración comercial, familias/marcas/SKU reales, edición de stock/costo/precio, cambios de fotos, catálogo/carrito V2 público ni pedidos familiares públicos. No deploy GAS ni promoción web productiva. No backup nuevo necesario para C6, porque no existen mutaciones remotas; se conservan todos los backups/rollbacks C5.

Pendiente humano:acreditar identidad física de los36 envasados y revisar la propuesta comercial ya entregada (qué SKU agrupar y qué ofertas de marca conservar separadas). Los formatos públicos Fuzol900ml y Ballerina750ml y las ofertas económicas indicadas por Omar ya se incorporaron a la propuesta, sin exigir un nuevo levantamiento de esos datos aprobados. No se reabre D50, categorías, D40, contactos, horario, dirección, calendario, roles ni permisos. Revisión visual humana y plan de activación siguen separados de F10.

Siguiente paso exacto C7:Omar revisa la propuesta versionada, acredita la identidad física pendiente y aprueba el mapa concreto; preparar IDs familiares/precios explícitos y validarlo primero en este dry-run. C7 remoto no se inició. Una futura tarea de migración TEST requiere backup/readback y autorización de alcance, sin activar automáticamente `/tienda` ni carrito. Granel real continúa postergado.

Main, Production y Sheet productiva intactos. TEST no tuvo cambios durante C6; C5 conservó exclusivamente su esquema/fixtures autorizados y0 operaciones QA bloqueantes.
