# Guía de Operación — TEST

Incluye [toda la práctica Venta](GUIA_VENTA.md). Login individual y logout; hereda confirmar, entregar, cobrar y presencial. Ante respuesta ambigua, consultar ID/key antes de repetir.

## Cancelación y stock

En Pedidos abre detalle y verifica ID/estado. «Cancelar» solo en un estado cancelable, con motivo operativo registrado. Si había descuento, repone una vez; un replay no repone otra vez. Entregado/cancelado son terminales: no revertirlos con botones ni borrar filas. Ante error terminal, preservar evidencia y coordinar compensación auditable.

En /admin/productos consulta stock y usa «Aplicar ajuste TEST» con delta, motivo y observación; delta es movimiento, no nuevo total. Para conteo físico sigue [procedimiento de conteo](CONTEO_CORTE_TEST.md) e importador/dry-run después de datos revisados. No interpretar stock técnico como conteo.

GRANEL: la pantalla explicita la base histórica. Arroz base1kg: delta0,25 =250g; Pimienta base100g: delta1,5 =150g. Conteo se recibe en kg y el importador convierte a base correcta. Nunca pegar kg a una base100g. Precio por referencia, costo por base de stock.

## Compras, gastos, caja e historiales

- /admin/compras: selecciona ID, cantidad en unidad/base indicada, costo por esa base y responsable; revisa total/observación y guarda. Entrada de stock e historial de costo correlacionados. Factura en kg/base100g: costo/kg dividido por10 y cantidad kg multiplicada por10.
- /admin/gastos: descripción, categoría, monto, fecha y responsable según respaldo. No cargar saldos como gastos ni inventar comprobantes.
- /admin/caja: selecciona apertura y revisa pedidos/presenciales, cobrados, pendientes, cancelados y advertencias. Consulta no modifica apertura ni sustituye arqueo físico.
- /admin/abastecimiento: mínimos/prioridades y caja orientan propuesta; confirmar parámetros/proveedores antes de compras. /admin/historiales rastrea ajustes, compras, costos y reportes. Conservar REQUIERE_REVISION.

No cambia productos/precios, oferta POR_APERTURA, identidades ni configuración/calendario. Deriva esas acciones a Administración. Práctica: cancelación/replay y peso repuesto, ajuste/compra y conciliación de turno sintético; evidencia y segundo revisor.
