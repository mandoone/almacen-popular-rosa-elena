# C7 — Imagen pública por familia, exclusivamente shadow

Fecha:2026-10-12. Decisión expresa de Omar: VARIABLE/Económico usa imagen genérica; una foto de SKU físico con marca no representa la oferta variable. EXPLICITA usa imagen de su marca/presentación; NO_APLICA imagen de la oferta sin necesidad de marca. Autoridad: `familia.imagen_url` y evaluación explícita, nunca una foto tomada de SKU.

## Implementación

- `src/lib/familias/imagenPublicaC7.ts`: resolver puro sin argumento SKU ni acceso a transporte. URL segura, coincidencia familia/URL/evidencia, clasificación y marca/presentación para EXPLICITA. VARIABLE con foto branded/ambigua o evaluación ausente se bloquea; genérica con marca visible es contradicción y se bloquea. Evaluación duplicada también fail-closed.
- `src/lib/familias/evaluacionesImagenC7.ts`: registro futuro explícito, **vacío**. Una foto inventariada no se convierte en foto aprobada. Carolina/Omar deben acreditar familia/imagen/compatibilidad y derechos; incorporar evidencia después no requiere cambiar el resolver.
- `catalogoShadow.ts`: agrega solamente `imagen_publica`, sin modificar oferta/precio/stock/elegibilidad. GET shadow administrativo TEST usa el registro. Rutas públicas, Apps Script y stock/pedidos V1 intactos.
- `ImagenOfertaShadow.tsx`: figura accesible reutilizable con categoría/icono/nombre de oferta y etiqueta ECONÓMICO cuando está en el nombre aprobado; sin marcas físicas ni archivos fotográficos nuevos. Imagen que falla vuelve a representación neutral. No hace fallback SKU.
- `FamiliasSimulador.tsx`: política, resultado y origen; checkbox de prueba branded exclusivamente en memoria local. No guardar/POST. La marca física sigue en detalle interno, sin cambiar nombre/precio/oferta pública.

| Origen | Criterio |
|---|---|
| IMAGEN_FAMILIA | URL familiar y evaluación única compatible. Derechos pendientes se advierten como HUMAN_GATE. Esto no autoriza publicar. |
| PLACEHOLDER_GENERICO | VARIABLE sin imagen definida; icono/nombre de oferta sin marca física. |
| SIN_IMAGEN | EXPLICITA/NO_APLICA sin imagen, URL inválida o fallo de carga; representación neutral. |
| BLOQUEADA_POR_MARCA | Imagen no acreditada/ambigua/branded para VARIABLE, o incompatible con oferta explícita. No se expone su URL. |

No se habilita /tienda familiar ni se publican fotos. Auditar compatibilidad y resolver derechos son gates separados. [Inventario/hallazgos de41 fotos](AUDITORIA_IMAGENES_CATALOGO_VARIABLE_2026-10-12.md).

## Pruebas y revisión

17 casos de imagen y5 del flujo futuro, junto con75 C6:97 focales PASS. Suite1190 PASS/0 skipped/0 fail. Frontera C6 preserva TEST/capacidad/no-store/soloGET; imagen pública es campo aditivo de diagnóstico. Lint/typecheck/build aislado/secrets/diff y auditoría V1 verificados para el checkpoint.

Flujo local probado: Aceite vegetal Económico1700 sin marca pública; SKU sintéticos Reyes1L yMarcaX1L, agregado13. Pedido por familia6, operación asigna5+1, replay sin duplicar, cancelación restaura5/8. Cambio solo de proveedor: misma ID, compras1500/1570 con proveedores e históricos/snapshots distintos, precio familiar1700 intacto. Cambio de formato900ml requiere ID distinta y no suma a la familia1L. La foto real DE REYES900ml no se usa como identidad de esos fixtures.

Revisión visual localhost desktop1280×900 y móvil390×844 con fuentes/componentes/ruta reales, datos sintéticos y transporte remoto bloqueado. Placeholder/checkbox/aviso/stock interno correctos; solo controles de lectura/simulación. Consola sin errores, tablas con desplazamiento interno, documento sin overflow horizontal. Limitación del harness offline: tipografías web mostradas con fallback del navegador; CSS global/diseño público no se modificaron. No se acredita aquí revisión visual humana de Omar ni un despliegue nuevo.

Evidencia privada:`operativa.local/c7-imagen-desktop.png`, `c7-imagen-mobile.png`, `visual-c7-llamadas.json` (GET de mocks,0 escrituras); logs `qa-c7-imagen-*`, `qa-c7-checkpoint2-*`. Servidor/tab QA cerrados al terminar. Los originales Drive permanecen intactos; las7 copias de inspección son locales ignoradas.
