# C7-A — Primer mapa comercial concreto, exclusivamente dry-run

Fecha:2026-10-08. Rama `feature/fase-3a-operativa`; base `90cee2e34b9f6cfdf88d134ee567e7f883da7887`. C5/C6 permanecen cerrados. Apps Script TEST v25 sin deploy. No lectura remota nueva ni escritura Sheet: se usa la captura nativa conservada de C5 y el validador C6 sin modificarlo.

## Acreditación, IDs y precios

**H2:** instrucción expresa de Omar C7-A,2026-10-08: aprueba identidad física/pública Fuzol900ml, Shampoo Ballerina750ml y Bálsamo Ballerina750ml, exclusivamente para dry-run. Supersede su pendiente físico en la propuesta C6, sin llenar el maestro real. Marca explícita exacta, presentación legible, contenido numérico y unidadml se proyectan en copias.

Los precios coinciden con las filas PRECIO de [FUENTES_CATALOGO_2026-10-01.csv](FUENTES_CATALOGO_2026-10-01.csv), última comanda acreditada según D38/[consolidación](CATALOGO_PENDIENTES_REALES_2026-10-01.md). El runner verifica los ocho pares fila/precio; no usa COSTO. Categoría/modo/unidad/decimal/paso de los tres SKU se conservan de la captura: Limpieza/Higiene, UNIDAD (ausencia histórica interpretada como V1), unidad/NO/1. Stock/costo/precio SKU nunca se proyectan ni sincronizan.

| SKU | Familia definitiva propuesta | Marca física/pública | Presentación/contenido | Precio familia CLP | Comanda | Estado |
|---|---|---|---|---:|---|---|
| PROD-040 | FAM-LAVALOZA-FUZOL-900ML | Fuzol | 900ml;900+ml |1000|fila52|IDENTIDAD_APROBADA_PARA_DRY_RUN |
| PROD-046 | FAM-SHAMPOO-BALLERINA-750ML | Ballerina | 750ml;750+ml |1400|fila58|IDENTIDAD_APROBADA_PARA_DRY_RUN |
| PROD-047 | FAM-BALSAMO-BALLERINA-750ML | Ballerina | 750ml;750+ml |1400|fila59|IDENTIDAD_APROBADA_PARA_DRY_RUN |

Los tres contratos familiares son EXPLICITA/activoSI/version_oferta1 proyectados y válidos; los IDs cumplen formato FAM y son distintos entre sí y de los fixtures existentes. Son IDs propuestos para una futura aprobación/migración, no filas remotas.

| Oferta aprobada, sin asociación ejecutable | ID definitivo propuesto | Política | Precio CLP / fila | Pendiente real |
|---|---|---|---|---|
| Cloro 1 L Económico | FAM-CLORO-1L-ECO | VARIABLE |650/45|Marca física de PROD-033; no volver a preguntar formato público1000ml. |
| Aceite vegetal Económico | FAM-ACEITE-VEGETAL-ECO | VARIABLE |1700/36|Marca y contenido físico de PROD-023. |
| Desinfectante suelo Económico | FAM-DESINFECTANTE-SUELO-ECO | VARIABLE |1100/56|Marca y contenido físico de PROD-044. |
| Limpiador crema Económico | FAM-LIMPIADOR-CREMA-ECO | VARIABLE |1400/60|Marca y contenido físico de PROD-048. |
| Cloro 1 L Clorinda | FAM-CLORO-CLORINDA-1L | EXPLICITA · Clorinda |1200/46|OFERTA_APROBADA_SIN_SKU_ACREDITADO; no asociar PROD-033 ni crear SKU. |

Las siete ofertas ligadas a SKU conocidos y la octava oferta Clorinda se conservan por separado. Las cinco filas pendientes viven como `ofertas_sin_asociacion`, no como contratos familiares completos ni dentro del mapa ejecutable. Para los tres Económico de formato aún pendiente no se inventa contenido para satisfacer validación.

## Artefacto y dry-run ejecutable

[MAPA_COMERCIAL_C7A_DRY_RUN_2026-10-08.json](MAPA_COMERCIAL_C7A_DRY_RUN_2026-10-08.json) contiene tres contratos, tres aprobaciones y tres asociaciones; además conserva los cinco IDs/ofertas pendientes sin mapear. `src/lib/familias/mapaComercialC7a.ts` acepta exclusivamente los cuatro campos de identidad física, exige estado/evidencia de aprobación y un SKU existente único, rechaza discrepancia con identidad estructurada ya presente y no sobrescribe familia/stock/costo/precio. La asociación se evalúa solo en las copias del dry-run C6.

`scripts/dry-run-mapa-c7a.mjs` lee archivos locales, verifica ID/nombre de la captura, excluye fixtures documentados y valida precios de comanda. No importa transporte/Google API, no usa HTTP, no tiene bandera de aplicar. Escribe únicamente el informe local en la ruta de salida distinta de la captura.

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/dry-run-mapa-c7a.mjs operativa.local/c5-final-nativo.json operativa.local/c7a-dry-run.json
```

Resultado con los54 SKU comerciales copiados: **CUMPLE**,3 familias/3 asociaciones,0 hallazgos. Cada familia individual cumple categoría/modo/unidad/contenido/marca explícita y exclusividad de SKU. Los otros51 productos no se asocian ni se completan.39 fixtures excluidos. La huella de entrada se conserva; referencia de captura y límites en [acta C6](FAMILIAS_PRODUCTO_FASE_C6_SHADOW_2026-10-08.md).

Proyección pública futura: **Lavaloza Fuzol900ml $1.000, Shampoo Ballerina750ml $1.400, Bálsamo Ballerina750ml $1.400**, con marca pública visible y Disponible en esta captura técnica. Oferta no contiene stock numérico; agregado/identidad física están exclusivamente en diagnóstico interno. No acredita conteo físico, reserva ni disponibilidad futura. Con stock0 el dry-run devuelve ADVERTENCIA; no se altera el stock para forzar CUMPLE. `/tienda`, carrito y simulador C6 permanecen sin cambios.

## Matriz racionalizada de los otros29

Categorías de **revisión**, no verdad comercial ni enum de Sheet: A=PROBABLE_FAMILIA_SIMPLE (5), B=POSIBLE_VARIABLE (6), C=MARCA_EXPLICITA_POR_ACREDITAR (10), D=REQUIERE_DECISION_ESPECIAL (8). No implican nuevas marcas, fusiones ni aprobación física. En C, que el rótulo mencione marca solo motiva revisar la política; no rellena `marca` del maestro.

| SKU / nombre vigente | Grupo | Evidencia / acción mínima | Propuesta sin multi-SKU |
|---|---|---|---|
| PROD-010 · Poroto burro |D|D37: inactivo histórico. Excluir del siguiente mapa; no reabrir diferencia con blanco. |—|
| PROD-020 · Aceite Oliva Vor250ml |C|VDR es denominación correcta ya cerrada (H2/propuestaC6);250ml separado de500ml. Acreditar etiqueta física con el conteo, sin cambiar nombre histórico. |Propuesta|
| PROD-021 · Aceite Oliva Vor500ml |C|Mismo criterio VDR; presentación independiente. |Propuesta|
| PROD-022 · Aceite Natura |C|Rótulo/comanda motiva revisar oferta explícita; contenido físico pendiente. |—|
| PROD-024 · Azúcar |A|Fuente institucional acredita envasado por kilo; acreditar etiqueta, no transformar en granel. |—|
| PROD-025 · Tallarines Parma |C|Rótulo/paquete acreditado; marca y contenido se estructuran con respaldo físico. |—|
| PROD-026 · Fideos Parma |C|Conservar producto separado de Tallarines; mismo levantamiento físico. |—|
| PROD-027 · Sal |A|Envasado por kilo acreditado; separado de Sal de Cáhuil granel. |—|
| PROD-028 · Salsa de tomate Toddo |C|Comanda fila41 acredita oferta actual Colunquen; preservar Toddo/Vergel como historia, sin asignar el SKU físicamente por su rótulo. |—|
| PROD-029 · Tallarines Luchetti |C|Oferta nominal distinta de Fideos; política explícita por revisar, etiqueta por acreditar. |—|
| PROD-030 · Fideos Luchetti |C|No fusionar con Tallarines; mismo levantamiento físico. |—|
| PROD-031 · Cloro gel Igenix |B|Variantes Igenix/Excell documentadas. Pregunta agrupada sobre convivencia y política; no fusionar IDs. |—|
| PROD-032 · Cloro gel Excell |B|Misma revisión de variantes; precio/formato no se copia desde Cloro1L. |—|
| PROD-034 · Manga Swan |D|Pack comercial acreditado, contenido completo por contar; rótulo no acredita marca física. |—|
| PROD-035 · Papel Higiénico6u Swan |D|Pack específico6u motiva familia simple; validar contenido físico en conteo. |Propuesta|
| PROD-036 · Detergente5L |B|Regular separado y vigente D37; potencial marca variable por revisar, sin alterar presentación pública5L. |—|
| PROD-037 · Detergente5L con suavizante |B|Con suavizante separado D37; no agrupar con regular. |—|
| PROD-038 · Detergente concentrado |D|D37: inactivo histórico; no crear oferta. No se encontró ADR que acredite “accidental”; no inventar motivo ni preguntar para reabrir baja. |—|
| PROD-039 · Jabón1L |B|Oferta genérica1L motiva revisar variabilidad; etiqueta física puede esperar al conteo. |—|
| PROD-041 · Pasta Pepsodent90g |C|Fuente institucional acredita unidad90g; propuesta simple de marca estable, identidad física por acreditar. |Propuesta|
| PROD-042 · Toalla Nova×3 |D|Pack específico; verificar contenido y marca física en conteo. |Propuesta|
| PROD-043 · Toalla Tork |C|Paquete acreditado; revisar política explícita y cantidad física. |—|
| PROD-045 · Servilletas300u |D|Pack específico300u; completar identidad/presentación sin asumir marca. |—|
| PROD-049 · Paños amarillos |A|Oferta nominal estable sin evidencia acreditada de multimarcas; contenido físico pendiente. |—|
| PROD-050 · Esponjas |A|Fuente acredita venta por unidad; etiqueta/política pendiente, no inventar marca. |—|
| PROD-051 · Afeitadora desechable |A|Oferta genérica nominal; presentación/contenido en conteo. No pedir costos en esta fase. |—|
| PROD-052 · B. basura70×90 VIRUTEX |B|Variantes Virutex/Toddo documentadas; convivencia/política agrupada, cantidad de pack en conteo. |—|
| PROD-053 · Pan de masa madre |D|Producto artesanal; propuesta NO_APLICA sin marca artificial y familia simple. Presentación/unidad por acreditar. |Propuesta|
| PROD-054 · Empanadas |D|POR_APERTURA D37; propuesta NO_APLICA sin marca artificial y familia simple. No activar ni habilitar apertura. |Propuesta|

Fuentes de matriz: [pendientes y criterio institucional](CATALOGO_PENDIENTES_REALES_2026-10-01.md), [matriz de correspondencias histórica](MATRIZ_CATALOGO_2026-10-01.csv), [comanda](FUENTES_CATALOGO_2026-10-01.csv), D37/D38 y H2. VDR/Colunquen dejan de ser preguntas nominales; la discrepancia de rótulo maestro se conserva hasta una tarea explícita. No se acredita una asociación física nueva a partir de esas denominaciones.

## PROPUESTO_NO_REQUIERE_MULTI_SKU

**10 propuestas para aprobación final de Omar**, no exenciones aprobadas automáticamente: PROD-040/046/047 (identidad física aprobada y oferta explícita única),020/021 (VDR, cada formato separado),041 (Pasta90g),035 (Papel6u),042 (Nova×3),053/054 (Pan/Empanadas, sin marca artificial).

“Sin multi-SKU” significa una familia pública con un SKU físico en el alcance inicial; no significa prescindir de identidad ni familia. Proveedor distinto por compra no crea otra identidad física. Packs/presentaciones distintas tampoco se fusionan por compartir marca. Para los siete casos fuera de los tres aprobados todavía se exige identidad/contenido y política acreditados antes de mapear. La auditoría real C6 sigue sin exenciones aprobadas; los campos remotos no cambiaron.

## Preguntas, QA y siguiente paso

[C7_PREGUNTAS_IDENTIDAD_MINIMAS_2026-10-08.md](C7_PREGUNTAS_IDENTIDAD_MINIMAS_2026-10-08.md) separa dos bloques Nadia, dos revisiones Omar, datos que pueden esperar al conteo y hechos que no se vuelven a preguntar. Los18 graneles permanecen POSTERGADO_GRANEL/D40; no forman parte del mapa ejecutable ni de la consulta actual.

QA:19 pruebas nuevas C7-A PASS;94 focales C7-A+C6 PASS; suite completa1144 PASS/0 skipped/0 fail. Lint/typecheck/build aislado/secrets/diff y auditoría V1 PASS. Comparación contra90cee2e: Apps Script, setup, rutas/UI y dominios operativos V1/C5/C6 idénticos. Auditoría V1 existente:23 archivos,47 acciones,51 funciones de transporte y6 diferenciales de unidad/granel/compra/venta conservados. No se ejecutó E2E C5 ni formulario remoto.

Evidencia privada:`operativa.local/c7a-dry-run.json` y `qa-c7a-focal.log`, `qa-c7a-suite.log`, `qa-c7a-build.log`, `qa-c7a-v1.log`. Captura antes/después SHA256`1b6f0195c6e9c8ab2dfc035eb1ce2bdc12490b54b6bd157825df011422db9a2a`; el informe conserva precios verificados y ofertas shadow. Reproducir focales con `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/familias-mapa-c7a.test.mjs tests/familias-shadow*.test.mjs`; QA completo con `npm test`, `npm run lint`, `npx tsc --noEmit`, `node scripts/qa-build-aislado.mjs`, `npm run scan:secrets`, `git diff --check` y `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/auditar-v1-familias.mjs`.

Siguiente C7-B: revisar cardinalidad/políticas propuestas con Omar y recibir solo respuestas que cambian el mapa; completar los otros SKU en copias con respaldo físico. Validar el mapa ampliado antes de solicitar una tarea de migración TEST con backup/readback. C7-A no autoriza ese paso ni activación pública. F10 no cambia.

13 archivos: `src/lib/familias/mapaComercialC7a.ts`, `scripts/dry-run-mapa-c7a.mjs`, `tests/familias-mapa-c7a.test.mjs`, JSON de propuesta, esta acta, preguntas mínimas, actualización trazable de propuesta C6 y los seis documentos vivos DATA_MODEL/DECISIONS/PROJECT_STATE/TASKS/TEST_PLAN/CHANGELOG. Main/Production/Sheets TEST y productiva intactos; Apps Script v25 sin deploy;0 familias comerciales/SKU asociados remotamente.
