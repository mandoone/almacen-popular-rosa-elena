# Guía de Administración — TEST

Incluye [Venta](GUIA_VENTA.md) y [Operación](GUIA_OPERACION.md). Cuenta propia, IDs y evidencia; cambios ambiguos se resuelven por readback antes de repetir.

## Productos, precios y aperturas

En /admin/productos crea maestro inactivo con ID único y stock cero; revisa datos antes de activar. Nunca reutilizar ID ni unir marcas por parecido. Precio nuevo aplica a ventas nuevas; snapshots anteriores intactos. Lista comercial vigente es autoridad, no fórmula de margen.

GRANEL: modo, gramos de referencia y precio de referencia. Arroz GRANEL, referencia1000g, venta1350. Base histórica queda congelada cuando ya es granel; no cambiarla para «hacerlo kg». Costo y ajustes usan base indicada en pantalla. Consulta matriz/pendientes por ID antes de cambios comerciales.

Calendario en /admin: fecha, horario11–15, lugar, cierre y modos pedidos/presencial. Usa apertura sintética para capacitación. REGULAR usa catálogo/stock; POR_APERTURA necesita oferta explícita por apertura. Empanadas tiene maestro POR_APERTURA y precio$2.500, sin habilitación real hasta evidencia de disponibilidad. Sin oferta no aparece ni se vende.

## Identidades, configuración y revisión

La capacidad de usuarios/configuración se ejerce mediante registro seguro y custodio técnico; **no existe pantalla de usuarios**. Sigue [activación](ACTIVACION_CUENTAS_TEST.md): hash privado, rol aprobado, active/session_version, registro validado, nuevo snapshot TEST y credencial anterior denegada. No poner passwords en catálogo ni restaurar secretos revocados.

Al cierre revisa pagos pendientes, cancelaciones/stock, compras/costos, gastos, reportes y advertencias. Diferencia abierta conserva NO-GO. No borrar REQUIERE_REVISION. Capacitación, datos físicos, derechos/editorial y Production necesitan evidencia humana.

Práctica: precio de fixture y snapshot previo, desactivar/reactivar maestro sintético, habilitar oferta solo para apertura sintética; encontrar backup/rollback y revocar una cuenta sintética. Registrar PASS/FAIL y restauración.
