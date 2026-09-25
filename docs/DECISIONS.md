# DECISIONS.md — Decisiones cerradas

> Registro de decisiones (ADRs cortos). Una decisión cerrada no se re-discute aquí;
> si cambia, se añade una nueva entrada que la supersede. Tareas abiertas en
> `docs/TASKS.md`.

Formato: **contexto → decisión → consecuencias**.

---

## D25 — Creación pública durable e idempotente

- **Contexto:** una respuesta perdida de `crearPedido` no permitía distinguir un
  fallo de una creación completada; repetir el POST podía generar dos pedidos.
- **Decisión:** la tienda genera una key UUID por intento lógico y la conserva
  hasta éxito. Apps Script registra `CREAR_PEDIDO` en `OPERACIONES_PEDIDOS` antes
  de escribir cabecera/detalles, liga la key a un hash canónico, reanuda solo
  efectos faltantes y completa después de readback exacto. La firma HTTP ambigua
  admite como máximo un replay idéntico.
- **Consecuencias:** misma key/payload devuelve el mismo `id_pedido`; payload
  distinto falla 409; divergencias quedan `REQUIERE_REVISION`. Crear sigue en
  `recibido`, sin stock ni movimientos, y no requiere ampliar el esquema actual.
  La implementación local aún requiere deploy y retest TEST.

## D24 — Recuperación conservadora de respuestas post-mutación ambiguas

- **Contexto:** ContentService puede completar una mutación y luego perder su
  respuesta en el redirect, terminando en un 404 HTML de `googleusercontent`.
  Un 502 del proxy no demuestra entonces que la escritura haya fallado.
- **Decisión:** clasificar únicamente la firma observada (POST, redirect, destino
  `googleusercontent`, 404 y HTML). Confirmación/cancelación permiten un solo
  replay con el mismo payload, actor y key para que el diario durable decida.
  LISTO/ENTREGADO no repiten POST: solo responden éxito si un readback confirma
  pedido, estado objetivo y actor.
- **Consecuencias:** no existen retries genéricos ni éxito supuesto ante cualquier
  error. Un segundo resultado ambiguo o un readback no concluyente conserva 502.
  La corrección está desplegada en Apps Script TEST v12; el cierre de F9-A queda
  pendiente del deploy/retest de D25.

## D23 — Diario durable para mutaciones multitabla de pedidos

- **Contexto:** Google Sheets no ofrece transacciones entre hojas; un fallo entre
  stock, movimientos y pedido podía dejar un resultado ambiguo y un retry podía
  repetir efectos.
- **Decisión:** confirmar y cancelar se serializan con `ScriptLock` y una intención
  previa en `OPERACIONES_PEDIDOS`. La operación guarda key, hash y plan mínimo,
  pasa por `PREPARADA`/`APLICANDO`, aplica cada efecto idempotentemente y solo queda
  `COMPLETADA` tras readback exacto. Diferencias quedan `REQUIERE_REVISION`.
- **Consecuencias:** una key completada devuelve su resultado sin reescribir; una
  operación activa o incierta bloquea mutaciones incompatibles y puede
  diagnosticarse de forma determinista. Esto no convierte Sheets en ACID ni
  garantiza atomicidad multitabla; la preparación/migración sigue local y TEST-only.

## D22 — Roles por capacidades y stock al confirmar pedidos

- **Contexto:** la contraseña compartida no distinguía actores ni permisos y el
  pedido web descontaba stock antes de que una persona lo confirmara.
- **Decisión:** modelar roles genéricos jerárquicos (`venta`, `operacion`,
  `administracion`) mediante capacidades explícitas; firmar identidad/rol en la
  sesión; autorizar en backend; crear pedidos en `recibido` y mover stock solo
  bajo `LockService` al confirmar o cancelar según el estado.
- **Consecuencias:** dobles clics/retries no repiten movimientos y el actor se
  toma de la sesión, no del navegador. La matriz es provisional de Omar y la
  asignación humana sigue pendiente del Almacén. El login compartido queda como
  compatibilidad `PROVISORIO_TEST`, bloqueada en producción; no es una solución
  productiva multiusuario. Las escrituras Next usan DTOs allowlist y no aceptan
  acción, token, actor ni rol del navegador. D23 complementa esta decisión con
  consistencia durable verificable para confirmación y cancelación.

## D20 — SEO dependiente de un origen público explícito

- **Contexto:** no existe un dominio público definitivo aprobado y no se debe
  inventar canonical ni sitemap con un subdominio temporal.
- **Decisión:** canonical, `metadataBase`, sitemap y su referencia en robots se
  habilitan solo con `SITE_URL` válido; el resto de metadata funciona sin él.
- **Consecuencias:** el build local es seguro y el dominio queda como decisión
  humana bloqueante antes de indexar producción.

## D21 — No migrar automáticamente a Next 16 por npm audit

- **Contexto:** las alertas corregibles sin cambio mayor eran transitivas; las
  restantes provienen del PostCSS incluido por Next 15 y npm propone Next 16.
- **Decisión:** fijar overrides compatibles para las transitivas corregidas y
  documentar las dos alertas restantes; cualquier Next 16 será trabajo separado.
- **Consecuencias:** se reducen cinco alertas a dos, con cero críticas, sin
  ampliar el alcance ni arriesgar los flujos ya validados.

## D1 — Usar un arnés liviano de documentación

- **Contexto:** el proyecto es pequeño, comunitario y mantenido sin equipo técnico
  dedicado. Un framework pesado de proceso sería contraproducente.
- **Decisión:** trabajar con un **arnés liviano**: documentación viva mínima en
  `docs/` + `AGENTS.md`, sin duplicar información.
- **Consecuencias:** menos sobrecarga, contexto suficiente para retomar el trabajo.
  Exige disciplina de mantener los `.md` actualizados.

## D2 — No usar SDD (Spec-Driven Development)

- **Contexto:** redactar especificaciones formales exhaustivas antes de implementar
  ralentizaría un proyecto de alcance acotado.
- **Decisión:** **no** adoptar SDD. Se documenta lo necesario para conservar
  contexto y decisiones, no especificaciones completas previas.
- **Consecuencias:** iteración más rápida; el detalle de cada fase se refina al
  implementarla.

## D3 — Trabajar por fases

- **Contexto:** hay múltiples necesidades (pedidos, vendedor, stock, compras, caja)
  que no se pueden abordar a la vez.
- **Decisión:** avanzar **por fases** (FASE 0 a FASE 5), una rama por fase, sin
  mezclar tareas de fases distintas.
- **Consecuencias:** foco y diffs revisables. Orden definido en `AGENTS.md` y
  `docs/TASKS.md`.

## D4 — Backend con Google Sheets + Apps Script

- **Contexto:** se necesita persistencia compartida y de costo cero, operable por
  voluntarios. Ya se usa Google Sheets para el catálogo.
- **Decisión:** usar **Google Sheets como base de datos operativa** y **Google Apps
  Script (Web App)** como capa de escritura/lectura desde la web.
- **Consecuencias:** sin infraestructura de pago; el modelo se ajusta a una hoja de
  cálculo (no relacional). Diseño en `docs/DATA_MODEL.md`.

## D5 — Crear una Google Sheet nueva, exclusiva para la web

- **Contexto:** existe una planilla antigua de comandas, pero pertenece a otra
  cuenta, tiene permisos externos, formato histórico/manual y no está diseñada como
  backend operativo.
- **Decisión:** crear una **Google Sheet nueva y exclusiva** para el sistema web,
  como **fuente oficial** de productos, pedidos, ventas, clientes, stock, compras,
  movimientos de stock y configuración. La planilla antigua **no** será la base
  principal.
- **Consecuencias:** control de permisos y estructura propios. Requiere crear la
  hoja manualmente antes de FASE 1 (tarea bloqueante en `docs/TASKS.md`). Estructura
  en `docs/DATA_MODEL.md`.

## D6 — No integrar pagos online por ahora

- **Contexto:** el pago se realiza presencialmente al retirar el pedido el sábado de
  apertura. Integrar pasarelas añade complejidad y costos.
- **Decisión:** **no** integrar Webpay / Mercado Pago / pagos online por ahora.
- **Consecuencias:** fuera de alcance actual (ver `docs/REQUIREMENTS.md`).
  Reevaluable en una fase futura si surge la necesidad.

## D7 — Repo como fuente oficial del sistema documental

- **Contexto:** los informes y recursos visuales también se distribuyen mediante
  Drive, lo que puede producir versiones divergentes si ambos lugares se editan.
- **Decisión:** el Markdown, templates, CSS y guías del repo son la fuente oficial.
  Drive conserva copias aprobadas y versiones enviadas.
- **Consecuencias:** toda corrección parte en el repo y genera una salida nueva. El
  sistema documental se rige por `design-system/docs/ADS-002_sistema_documental.md`.

## D8 — Calendario de Fase 3B conectado solo a TEST

- **Contexto:** el calendario admin necesita escrituras reales para validarse,
  pero producción no está autorizada en esta fase.
- **Decisión:** exigir dos marcas independientes para cualquier acceso a
  `APERTURAS`: `NEXT_PUBLIC_APP_ENV=test` en Next.js y `APP_ENV=TEST` como
  propiedad del Apps Script. Cualquier otro entorno se bloquea.
- **Consecuencias:** el código puede probarse localmente contra la copia TEST
  sin abrir un camino accidental hacia producción; preparar la hoja y desplegar
  la Web App TEST siguen siendo pasos manuales explícitos.
