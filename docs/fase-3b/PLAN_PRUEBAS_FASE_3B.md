# PLAN_PRUEBAS_FASE_3B.md — Plan de pruebas

> No se modifica `docs/TEST_PLAN.md` (tiene cambios preexistentes en el
> working tree ajenos a esta sesión). Este documento es el equivalente para
> Fase 3B y se fusionará con `TEST_PLAN.md` en una pasada documental separada
> cuando corresponda.
> Cubre tanto lo que ya tiene lógica pura implementada (Etapa 1, con tests
> automatizados) como lo que todavía es solo diseño (Etapas 2 en adelante, con
> pruebas manuales futuras).

---

## 1. Cálculo de cierre por defecto

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 1.1 | Apertura sábado | Cierre = jueves anterior, 23:59 | Sí — `calcularCierrePedidosPorDefecto` |
| 1.2 | Apertura domingo | Cierre = mismo jueves anterior que un sábado de la misma semana, 23:59 | Sí |
| 1.3 | Apertura jueves | Cierre = jueves de la semana **previa** (no el mismo día) | Sí |
| 1.4 | Apertura viernes | Cierre = jueves inmediatamente anterior (1 día antes) | Sí |
| 1.5 | Apertura lunes/martes/miércoles | Cierre = jueves de la semana previa | Sí |
| 1.6 | Apertura excepcional con cierre manual | El valor calculado por defecto se ignora; se usa `cierre_pedidos_anticipados` tal como lo dejó el admin | Sí — se prueba que la función de cálculo no se vuelve a invocar sobre un valor ya editado (responsabilidad de quien la llama, no de la función pura) |
| 1.7 | Cambio de año (apertura en enero, jueves anterior en diciembre) | El cálculo cruza el límite de año correctamente | Sí |

## 2. Estado público de la web

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 2.1 | Sin ninguna apertura (`null`) | `sin_apertura_programada` | Sí |
| 2.2 | Apertura con `estado_apertura = por_confirmar` | `sin_apertura_programada` | Sí |
| 2.3 | Apertura con `estado_apertura = cancelada` | `apertura_cancelada`, incluso si la fecha aún no llegó | Sí |
| 2.4 | Antes del cierre, `pedidos_anticipados_estado = activo` | `pedido_anticipado_activo` | Sí |
| 2.5 | Después del cierre, `pedidos_anticipados_estado = activo` | `pedido_anticipado_cerrado` | Sí |
| 2.6 | `pedidos_anticipados_estado = pausado` antes del cierre calculado | `pedido_anticipado_cerrado` (el cierre manual manda sobre la fecha) | Sí |
| 2.7 | `pedidos_anticipados_estado = reabierto_manual` después del cierre | `pedido_anticipado_activo` (excepción del admin) | Sí |
| 2.8 | Dentro del horario de la apertura, `modo_presencial_estado = activo` | `modo_presencial_activo`, con prioridad sobre el estado de pedidos anticipados | Sí |
| 2.9 | Dentro del horario, `modo_presencial_estado = inactivo` | No es `modo_presencial_activo`; cae en `apertura_cerrada` o `pedido_anticipado_cerrado` según corresponda | Sí |
| 2.10 | Después de `hora_termino` | `apertura_cerrada`, sin importar el estado de pedidos anticipados | Sí |
| 2.11 | `estado_apertura = cerrada` explícito, aunque la hora todavía no llegue a `hora_termino` | `apertura_cerrada` (el estado explícito manda) | Sí |
| 2.12 | Justo en el límite (`fechaActual` exactamente igual a `cierre_pedidos_anticipados`) | `pedido_anticipado_activo` (el límite es inclusivo) | Sí |

## 3. Reapertura manual

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 3.1 | Admin cierra pedidos manualmente antes del cierre calculado | `pedidos_anticipados_estado = pausado` → estado público pasa a `pedido_anticipado_cerrado` de inmediato | Sí (vía la lógica pura; el "admin hace clic" es un cambio de campo, no una acción a probar aquí) |
| 3.2 | Admin reabre pedidos después del cierre | `pedidos_anticipados_estado = reabierto_manual` → vuelve a `pedido_anticipado_activo` | Sí |
| 3.3 | Reapertura con hora límite nueva | El admin edita `cierre_pedidos_anticipados` a un valor posterior en vez de usar `reabierto_manual`; se prueba que ambos caminos llegan al mismo resultado público | Sí |
| 3.4 | Reapertura de una apertura no afecta otras aperturas futuras | Dos objetos `Apertura` independientes evaluados por separado no comparten estado | Sí (se sigue de que las funciones son puras y reciben una sola apertura a la vez) |

## 4. Modo presencial QR

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 4.1 | Activo solo si el admin lo activó | `modo_presencial_estado = activo` y dentro de horario → disponible; `inactivo` → no disponible aunque sea la hora correcta | Sí |
| 4.2 | No reemplaza la comanda papel | No hay ninguna regla que desactive `comanda_papel` como origen válido cuando el modo QR está activo — ambos coexisten | Sí — se prueba que `esOrigenPedidoValido('comanda_papel')` es `true` independientemente del estado de la apertura |
| 4.3 | Genera origen `presencial_qr` | Un pedido creado en modo presencial normaliza a `origen_pedido = 'presencial_qr'` | Sí — a nivel de normalización; la creación real del pedido es Etapa 6 |

## 5. Venta asistida

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 5.1 | Vendedor/admin ingresa venta presencial | Origen `presencial_vendedor` | Sí, a nivel de `normalizarOrigenPedido` |
| 5.2 | Comanda papel ingresada | Origen `comanda_papel` | Sí |
| 5.3 | Estado inicial de la venta asistida (¿`recibido` o confirmada?) | **No definido** — depende de la decisión pendiente F.1 de `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` | No — bloqueado hasta resolver F.1 |

## 6. Permisos

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 6.1 | Solo admin edita el calendario | No hay lógica de permisos en el módulo puro de Fase 3B — se hereda del mismo login admin que ya protege `/admin` (`src/middleware.ts`) | No aplica a lógica pura; se prueba en Etapa 4 |
| 6.2 | Solo admin reabre/cierra pedidos anticipados | Igual que 6.1 | No aplica aquí |
| 6.3 | Vendedor puede operar venta presencial en etapa futura | Rol vendedor no existe todavía (FASE 2); no se prueba hasta que exista | No aplica aquí |
| 6.4 | Confirmar/cancelar pedidos sigue siendo admin-only | Ya cubierto por los tests existentes de Fase 3A (`tests/fase3a-proxy-admin.test.mjs`); Fase 3B no lo modifica | Ya cubierto (Fase 3A) |

## 7. Compatibilidad

| # | Caso | Resultado esperado | Automatizable ahora |
|---|---|---|---|
| 7.1 | Pedido antiguo sin `apertura_id` | Tratado como válido; no rompe ninguna función de Fase 3B (ninguna de las funciones de §1–§2 depende de `PEDIDOS`, solo de `APERTURAS`) | Sí — por diseño, no por un caso de test específico |
| 7.2 | Pedido sin `origen_pedido` (`undefined`/`null`/string vacío) | `esOrigenPedidoValido` devuelve `false`; `normalizarOrigenPedido` devuelve `null`, nunca lanza excepción ni inventa un valor por defecto | Sí |
| 7.3 | `origen_pedido` con valor desconocido (typo, dato corrupto) | Igual que 7.2: `false`/`null`, no excepción | Sí |
| 7.4 | `estado_apertura`, `pedidos_anticipados_estado` o `modo_presencial_estado` con valor desconocido | Fuera de alcance de esta sesión: las funciones de §1–§2 asumen tipos ya validados (`EstadoApertura`, etc.); la validación de datos crudos que vienen de Sheets es responsabilidad de la capa de integración (Etapa 3+), igual que hoy lo es para `EstadoPedido` en Fase 3A (`esEstadoPedido`) | Parcial — se deja documentado como límite, no se implementa un validador de apertura cruda en esta sesión salvo que sobre tiempo |

---

## Resumen

- Las secciones 1, 2, 4 (parcial) y 7 (parcial) corresponden a la lógica pura
  de la Etapa 1 y ya están cubiertas con tests automatizados
  (`tests/fase3b-aperturas.test.mjs`, `tests/fase3b-estado-publico-web.test.mjs`,
  `tests/fase3b-origen-pedido.test.mjs`, commit `165f761`; 87/87 tests verdes).
- Las secciones 3, 5.1–5.2 y 4.3 dependen de esa misma lógica pura pero
  descritas desde la perspectiva de la acción del usuario; se verifican con
  los mismos tests de estado, sin necesidad de casos adicionales.
- Las secciones 5.3, 6.1–6.3 y 7.4 quedan explícitamente fuera de esta sesión:
  requieren una decisión pendiente (5.3), un rol que no existe (6.3), o una
  capa de integración que no se construye todavía (6.1, 6.2, 7.4).
