# Contenido público TEST — 2026-10-07

Rama exclusiva: `feature/fase-3a-operativa`. Fuente editorial del Almacén: **RECIBIDA**, [Avances PAGINA ALMACÉN, documento de Nadia](https://docs.google.com/document/d/1ckt-0sLvGOhZWuPO0SE21L0amZ3VAYQyMsllnjYx77M/edit), leído mediante Google Drive. La instrucción de Omar del 07/10 define los contactos oficiales y el criterio público de precios. No se investigaron ni incorporaron hechos externos.

## Implementación

- `src/lib/fase9/contenidoPublico.ts`: WhatsApp/correo oficiales y participación con turnos, organización, difusión, compra y aportes generales. Dirección, horario, Instagram y calendario conservan sus valores confirmados.
- `src/app/page.tsx`: tarjeta de precios coherente con el propósito comunitario; recibe la participación desde la fuente compartida.
- `src/app/historia/page.tsx`: cinco hitos desde octubre 2019 hasta abril 2023, transición de red a almacén, precios justos y horario/dirección compartidos.
- `src/app/rosa-elena/page.tsx`: biografía fiel a Nadia, desde Talca/JOC/enseñanza hasta el homenaje actual; salida de La Río y circunstancias de su detención. Retratos sin cambios.
- `src/app/participar/page.tsx`: mismas tres tarjetas y sus iconos, ahora con textos compartidos con Inicio, incluidos organización y aportes económicos generales.
- `src/app/tienda/page.tsx`: solo texto del encabezado «Precios justos» y dirección compartida; catálogo y lógica comercial intactos.
- `src/components/Footer.tsx`: contactos compartidos y dirección completa desde la misma fuente; icono de dirección conserva tamaño al envolver el texto.
- `tests/fase9-contenido-publico.test.mjs`: corregir expectativa que rechazaba el nombre biográfico completo; mantener la prohibición del apellido duplicado en la marca del Almacén.
- `config/f10-readiness.example.json`: solo evidencia editorial/contactos, conservando PENDING. Manifiesto `config/f10-readiness.local.json` ignorado: misma actualización de evidencia, sin cambios de resultado.
- `docs/PROJECT_STATE.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/TEST_PLAN.md` y `docs/CHANGELOG.md`: estado vivo, tareas, decisión D42, revisión manual e hito, con enlace a este registro.
- `docs/F10_READINESS_OPERATIVA.md`, `docs/GO_NO_GO_FASE_9_10.md` y `docs/operativa/REVISION_F10_2026-10-01.md`: fuente recibida, contactos cerrados y revisión de implementación pendiente. No se reabre entrega editorial ni se promueve un gate.
- `docs/operativa/CONTENIDO_PUBLICO_TEST_2026-10-07.md`: este registro de entrega. Total: 18 archivos versionados; evidencia local ignorada adicional.

## Textos principales antes → después

| Superficie | Antes | Después |
|---|---|---|
| WhatsApp compartido | `56950807172` | `56942839926` |
| Correo compartido | `almacenpopular.rosaelenamorarles@gmail.com` | `redrosamorales@gmail.com` |
| Inicio / Precios justos | «Los productos se entregan al precio de costo» | «No buscamos generar ganancias. Ofrecemos productos básicos a precios justos y económicos para apoyar la economía de las familias y sostener este proyecto comunitario.» |
| Historia / origen | «Todo comenzó en 2020» | «Un camino de organización desde 2019»: Asamblea octubre 2019, comisiones marzo 2020, Red agosto 2020, inauguración diciembre 2021 y traslado abril 2023 |
| Historia / funcionamiento | «Precio de costo» / «sin margen de ganancia para nadie» | «Precios justos» / «Productos básicos a precios justos y económicos para apoyar a las familias y sostener un proyecto comunitario sin fines de lucro» |
| Tienda / encabezado | «Precios al costo» | «Precios justos», retiro con dirección oficial desde la fuente compartida |
| Rosa Elena / tras el golpe | «continuó su labor organizativa clandestina en la población» | «Tras el golpe de Estado tuvo que dejar La Río.» |
| Rosa Elena / detención | Fecha y DINA, sin circunstancias | 18 de agosto de 1976, alrededor de las 20:00, Avenida Matta con Lord Cochrane, taxi junto a su amiga Berta; detenida desaparecida desde entonces |
| Participación / difusión y aportes | «consultar por las formas vigentes de colaboración» | «Puedes difundir el proyecto y aportar económicamente para sostener su funcionamiento y fortalecer este espacio comunitario.» |
| Historia / cita atribuida a Instagram | Cita de inauguración sin respaldo en Nadia | Síntesis del trabajo comunitario, presentada como párrafo sin atribución inventada |
| Rosa Elena / cita fechada agosto 2020 | Frase y fecha sin respaldo literal | «¡Rosa Morales vive en el Almacén Popular!», cierre presente en el documento de Nadia, sin fecha añadida |

## Límites de fuente

No se inventó fecha de nacimiento, edad ni día exacto de lanzamiento de la Red. Se retiró la afirmación de coincidencia de «exactamente 44 años» porque Nadia solo fecha la Red en agosto de 2020. Se conserva el vínculo con el Partido Comunista y la secretaría del Comité Local: el apartado histórico de Nadia los respalda. No quedó una afirmación controvertida sin fuente pendiente de corrección dentro de los textos editados.

Los porcentajes, la fórmula y los gastos específicos permanecen fuera de las superficies públicas. Aportes económicos solo en general, sin banco, cuenta, RUT ni titular. Fotografías, Navbar, catálogo, roles, permisos, aperturas y datos operativos sin cambios.

## Estado editorial y QA

Incorporación en TEST realizada. Pendiente: revisión visual/funcional por Omar y validación final de la implementación si se estima necesaria. No existe un nuevo levantamiento de textos pendiente. `contenido_editorial` y `contactos_publicos` mantienen PENDING; no se modifica ningún resultado F10 automáticamente.

| Control | Resultado / evidencia |
|---|---|
| Diff completo y `git diff --check` | PASS; cambios limitados a contenido público, su expectativa de test, documentación y evidencia F10 |
| Contactos y criterio de precios | PASS; búsqueda ampliada en `src`/`public`, incluyendo «Precios al costo» de Tienda; sin contactos antiguos, equivalencia al costo base, porcentaje ni desglose operativo |
| Centralización | PASS; WhatsApp/correo/Instagram oficiales aparecen como literales únicamente en `contenidoPublico.ts`; dirección/horario compartidos en las superficies editadas |
| `npm run lint` | PASS; repetido después del ajuste textual de Tienda |
| `npx --no-install tsc --noEmit` | PASS; build final también verifica los tipos |
| `npm test` | 470/470 PASS, cero fallos, omitidos o cancelados; sin E2E de escritura |
| Tests focales F9/F10 | 13/13 PASS después del ajuste de Tienda; expectativa de marca separada del nombre biográfico completo |
| `npm run build` | PASS, 24 páginas generadas. Windows bloqueó SWC nativo en el primer intento; finalizado con `NEXT_TEST_WASM=1` temporal en el proceso y fallback oficial de Next. Sin cambios de paquetes/lockfile/configuración del proyecto |
| `npm run scan:secrets` | PASS, 304 archivos; valores nunca impresos. Ningún archivo de secretos/configuración productiva modificado |
| `npm run preflight:f10` | Manifiesto válido; 1 READY / 19 PENDING / 0 FAIL. NO-GO conservado y contenido_editorial/contactos_publicos PENDING |
| QA visual local | Inicio, Historia, Rosa Elena, Participar y encabezado de Tienda en 1280×900 y 390×844; sin desbordes horizontales, contactos correctos, cronología/biografía legibles, tres tarjetas conservadas. Imágenes existentes cargan, sin modificaciones |
| Flujo editorial renderizado | Fuente compartida → páginas/footer → HTML y DOM: textos y enlaces oficiales comprobados. Backend productivo deshabilitado en el proceso de QA; solo lecturas TEST, sin pedidos/envíos ni escrituras. QA de Tienda acotado al encabezado/contactos, sin repetir el circuito comercial |

Revisión del agente completada; no sustituye la revisión humana por Omar. No se investigaron fuentes externas ni se enviaron mensajes a terceros.

Producción intacta: sin tocar `main`, merge, rebase, force push ni deploy productivo. Sin modificar Google Sheets, Apps Script, secretos ni datos reales; esta tarea solo lee el documento institucional y cambia archivos locales de la rama TEST.
