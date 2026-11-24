# C7 — Respuesta del equipo del Almacén (11/11/2026)

Registro: 24/11/2026. Fuente: transcripción de WhatsApp aportada por Omar, quien confirma que Nadia respondió por el equipo. Preguntas originales del 12/10, 12:40–12:53; respuesta 11/11, 15:48–15:58; agradecimiento 13/11, 01:49. No se verificó directamente el chat original. No se necesita otra respuesta general de Nadia ni una respuesta separada de Carolina sobre estas mismas preguntas.

## Identidad física actual informada

| SKU de referencia C7 | Oferta pública propuesta | Respuesta literal relevante | Marca física | Presentación | Estado documental |
|---|---|---|---|---|---|
| PROD-033 | Cloro 1 L Económico | Cloro excell, 1L botella | Excell | Botella 1000 ml | Completa para ingesta local |
| PROD-023 | Aceite vegetal Económico | aceite vegetal de reyes, 900 ml, botella | Reyes (denominación informada: de reyes) | Botella 900 ml | Completa para ingesta local |
| PROD-044 | Desinfectante suelo Económico | Desinfectante suelo Excell, 900 ml, botella | Excell | Botella 900 ml | Completa para ingesta local |
| PROD-048 | Limpiador crema Económico | Limpiador crema Excell, no se cuando ml | Excell | Contenido y envase no acreditados | Parcial: levantar etiqueta durante conteo |

Los SKU de referencia se toman del mapa C7-A, no de una identificación de IDs por Nadia. La asociación se valida en copias; no se reconstruye identidad de compras anteriores ni se presupone que el stock técnico corresponde a esas marcas. El aceite de 1 L mencionado por Omar el 12/10 era un ejemplo, no una presentación acreditada; la respuesta es 900 ml. Mantener los nombres VARIABLE y marca pública vacía; exponer contenido real en la presentación de la oferta y no comprometer una marca con imágenes branded. No se confirma precio vigente en la respuesta: las referencias de comanda anteriores ($650, $1.700, $1.100 y $1.400 respectivamente) se conservan como referencias históricas de propuesta, no precios nuevos aprobados.

## Variantes y criterio comercial

Nadia explica que se compra la marca más barata y que el remanente de una marca puede coexistir con la compra posterior de otra. Ejemplo de 3 + 10 = 13 cloros: ilustrativo, no conteo; el texto alterna Igenix, Excel y Clorinda y no acredita una correspondencia física ni stock de un SKU. No se acredita convivencia actual específica para PROD-031/032 (Cloro gel Igenix/Excell) ni PROD-052 (bolsas 70×90 Virutex/Toddo), ni contenido de pack, ni SKU nuevo Clorinda. 

Si cambian mucho los precios, el equipo diferencia los productos en comanda; si están cerca, mantiene un precio único para las dos marcas. La marca no es el factor comercial principal. Esto confirma la compatibilidad del diseño familia pública/SKU físico, no una agrupación concreta por grupo ni un umbral numérico. Decisión de agrupación/precio queda para Omar/Almacén con equivalencia de presentación, precio aprobado y conteo. Conservar SKU separados, D58/D64, IDs e históricos; no sumar stock de ofertas no equivalentes ni alterar precios automáticamente.

## Ingesta local y pendientes

Archivo de entrada: [C7_RESPUESTAS_NADIA_2026-11-11.json](C7_RESPUESTAS_NADIA_2026-11-11.json). Conserva exactamente el esquema del template original: tres fichas RECIBIDA y cuatro PENDIENTE; los dos grupos quedan PENDIENTE porque el validador exige booleano de convivencia actual y política específica. La marca parcial de PROD-048 y el criterio general se preservan aquí, no se fuerzan en el JSON ni se relaja el validador. El código histórico del validador puede seguir emitiendo PENDIENTE_NADIA; interpretar esos cuatro SKU/dos grupos como evidencia física o decisión concreta pendiente, no como solicitud de otro cuestionario.

La base acreditada de tres asociaciones C7-A no cambia. Las tres identidades nuevas son candidatas para proyectar: objetivo seis asociaciones en copias si validador/dry-run CUMPLE, no seis asociaciones ejecutadas o migradas. El JSON está preparado; falta ejecutar el validador, proyección, dry-run y plan/inverso sobre captura local verificada. Si hay conflicto con identidad o presentación preexistente, detener el SKU y reconciliar evidencia. Conservar manifest/template históricos; no editar a mano resultados de ejecución.

Pendientes: medir limpiador crema; verificar variantes, contenido/packs, equivalencia, oferta y precio vigente durante conteo/revisión comercial; completar demás identidades, conteo físico, seis costos sin fuente, saldos y mínimos; fotografías finales asignadas a Carolina y permisos/créditos (no acreditados por esta respuesta). No reabrir D63/D64, Fuzol/Ballerina ni solicitar nuevamente las marcas/formatos completos de los tres Económico. 

## Continuidad de entrega

Objetivo acordado: entrega en una semana, idealmente 01/12/2026, condicionada a gates reales. Primero activar cuenta personal `omar-test` en Preview con registro vigente preservado, login y turno humano; luego resolver UX crítica, datos físicos, imágenes, cuentas/seguridad, capacitación y corte autorizado. Según el reporte de Codex aportado por Omar, el registro Preview está protegido y la contraseña antigua es de Production; falta recuperar/verificar el registro activo antes de modificarlo. No se declara cuenta activada ni se sustituye el secreto.

Esta actualización es documental. No autoriza migración TEST, activación de tienda/carrito/POS familiar, modificación de datos comerciales, Sheets, Apps Script, main ni Production. F10 sigue NO-GO; último manifiesto documentado 1 READY / 19 PENDING / 0 FAIL, sin promoción. Sprint técnico TEST v26 permanece cerrado; no repetir fixtures.
