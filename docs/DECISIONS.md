# DECISIONS.md — Decisiones cerradas

> Registro de decisiones (ADRs cortos). Una decisión cerrada no se re-discute aquí;
> si cambia, se añade una nueva entrada que la supersede. Tareas abiertas en
> `docs/TASKS.md`.

Formato: **contexto → decisión → consecuencias**.

---

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
