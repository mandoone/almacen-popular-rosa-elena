# Handoff — Estado web Almacén Popular Rosa Elena Morales

**Fecha:** 2026-09-11

**Rama de continuidad:** `feature/fase-3a-operativa`
**Regla principal:** producción permanece fuera de alcance hasta una decisión
Go/No-Go explícita y separada.

## Estado por fase original

| Fase | Estado de cierre | Próximo criterio |
| --- | --- | --- |
| Fase 3B | Cerrada y validada en TEST. | Conservar los guardrails TEST y no reabrir producción. |
| Fase 4 | Preparada. | Validar con el Almacén catálogo, categorías, unidades, stock, precios e imágenes. |
| Fase 5 | Preparada técnicamente. | Implementar venta presencial/comandas reales primero en TEST. |
| Fase 6 | Preparada técnicamente. | Implementar resumen/caja por apertura primero en TEST. |
| Fase 9 | Preparada. | Revisar textos editoriales e imágenes con el Almacén. |
| Fase 10 | Pendiente. | Producción: evaluar solo tras validación, migraciones y Go/No-Go separado. |

## Commits principales recientes

- `65cceb7` — compacta el aviso de apertura activa en tienda sin alterar el
  flujo validado.
- `84d2037` — agrega base pura para venta presencial, comanda, resumen y
  cierre de lectura, con pruebas; no incluye escrituras.
- `0a64e25` — documenta la preparación de panel vendedor y caja.
- `3dbc5fd` — deja guía operativa para la futura implementación real en TEST.

## Validado hasta este punto

- Apps Script TEST fue actualizado para el bloque de pedidos anticipados.
- `PEDIDOS` TEST cuenta con las columnas aditivas `apertura_id` y
  `origen_pedido`.
- Se creó, verificó y canceló correctamente un pedido anticipado de prueba en
  TEST, asociado a una apertura.
- La tienda carga catálogo y apertura activa en el entorno TEST previsto.
- Vercel terminó correctamente hasta el último HEAD conocido de esta jornada.
- Fase 5 y Fase 6 tienen contratos, helpers puros y pruebas, pero todavía no
  escriben ventas, caja ni movimientos reales.

## No tocar todavía

- Producción ni Apps Script productivo.
- Variables de entorno, secretos o `.env.local`.
- `design-system/`, `reports/` ni `docs/TEST_PLAN.md`.
- Cambios ajenos ya presentes en el árbol de trabajo.
- Datos no confirmados por el Almacén, incluidos catálogo final, fotos, stock,
  precios, roles de venta, política de anulaciones y reglas de caja.

## Próximo bloque recomendado — Fase 5 + Fase 6 real en TEST

1. Preparar Apps Script TEST para ventas presenciales, sin reutilizar ni
   habilitar una vía productiva.
2. Verificar antes de migrar el schema TEST de `VENTAS`, `DETALLE_VENTAS` y
   `MOVIMIENTOS_STOCK`, además de `APERTURAS`, `PRODUCTOS` y `PEDIDOS`.
3. Crear rutas administrativas protegidas y luego un panel vendedor separado.
4. Registrar venta presencial asociada a apertura habilitada, con total/precio
   calculados en servidor y descuento de stock bajo lock.
5. Generar comanda a partir de la venta persistida.
6. Implementar resumen por apertura que separe anticipados, presenciales,
   pendientes y cancelados.
7. Completar pruebas automáticas, pruebas manuales TEST y documentación de los
   resultados antes de considerar cualquier cierre persistente.

La guía detallada del bloque está en
`docs/fase-5-6/NEXT_PROMPT_IMPLEMENTACION_REAL_TEST.md`.

## Pasos manuales previsibles

1. Si cambia el script, pegar el archivo preparado exclusivamente en Apps
   Script TEST.
2. Ejecutar cualquier preparación/migración TEST aprobada y revisar sus
   encabezados sin registrar IDs ni secretos.
3. Desplegar una nueva versión de Apps Script TEST.
4. Ejecutar una venta presencial de prueba y comprobar comanda, detalle,
   stock y movimientos en la Sheet TEST.
5. Revisar el resumen por apertura, pagos pendientes y diferencia de efectivo.

## Riesgos de continuidad

- Mezclar TEST con producción por configuración, despliegue o endpoint.
- Stagear, sobrescribir o borrar los cambios ajenos existentes.
- Dejar el Apps Script TEST desfasado respecto de rutas, contratos o schema.
- Inventar datos o decisiones operativas que debe confirmar el Almacén.
- No comprobar stock y movimientos después de ventas, anulaciones o fallos
  parciales.

## Checklist antes de retomar implementación

- [ ] Confirmar rama, estado de Git y separación de cambios ajenos.
- [ ] Leer contratos de `docs/fase-5-6/` y el prompt de implementación TEST.
- [ ] Verificar schema y permisos TEST antes de escribir código de Apps Script.
- [ ] Mantener tokens, URLs e IDs fuera del repositorio, consola y documentos.
- [ ] Ejecutar pruebas, lint, build y `git diff --check` antes de commits
      selectivos.
