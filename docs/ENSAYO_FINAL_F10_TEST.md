# Ensayo humano final TEST — 40 minutos

Guion preparado, no ejecutado. identidad_cuentas, capacitacion_venta, capacitacion_operacion, capacitacion_administracion y ensayo_test siguen PENDING. Producción no autorizada. Guías: [Venta](operativa/GUIA_VENTA.md), [Operación](operativa/GUIA_OPERACION.md), [Administración](operativa/GUIA_ADMINISTRACION.md).

## Antes de la reunión

Técnico/revisor comprueban backend/Sheet/URL TEST y SHA, backup, credenciales propias entregadas, tres estaciones y plan de restauración. No contraseñas/cookies en acta ni aperturas reales. Sin datos finales se usan fixtures; anotar esa limitación: no cierra stock/saldos.

Preparar apertura sintética con ID libre y marcador ENSAYO-TEST, modos pedidos/presencial habilitados solo allí. Dos maestros fixture: «Arroz ENSAYO TEST», GRANEL ref/base1000g, precio1350, costo sintético1200; «Oferta ENSAYO TEST», UNIDAD POR_APERTURA precio2500. Stock del primero por ajuste sintético auditable, jamás al Arroz comercial. Registrar baseline/IDs/keys privados. Empanadas real sin oferta.

Preparar también conciliación financiera por ID y compensaciones marcadas ENSAYO-TEST: restaurar stock no elimina efectos de ventas/gastos. No inventar efectivo/banco real. Historial sintético conservado y excluido de evidencia financiera real.

## Agenda 30–45 minutos

| Minutos | Acción y quién | Evidencia esperada |
|---|---|---|
| 0–7 | Diez personas en sus dispositivos: login, /me y rol, logout/nuevo login | Diez cuentas propias. Custodio/revisor completan cada fila; no aprobación por asistencia |
| 7–20 | Tres estaciones simultáneas: seis Venta, dos Operación, dos Administración se turnan en práctica de su guía | Cada persona realiza acción permitida y observa denegación de una prohibida. Firma por persona/rol |
| 20–25 | Cliente pide250g de Arroz ENSAYO,338. Venta confirma/reintenta, listo, entrega y pago del ejercicio | Creación sin descuento; confirmación descuenta0,25kg una vez; etapas siguientes no descuentan. ID/comanda/pago coherentes |
| 25–29 | Segundo pedido150g,203. Venta intenta cancelar y se deniega; Operación cancela/repite | Peso libre, una reposición exacta, nunca doble |
| 29–33 | Venta presencial; Operación compra/ajuste/gasto sintéticos y caja/reporte. Administración oferta por apertura | Mismo contrato de gramos/precio; movimientos rastreables; Caja no muta APERTURAS; sin oferta no se vende |
| 33–36 | Custodio/Admin revoca cuenta sintética, sube session_version, cookie antigua denegada. Explica pérdida/rotación/rollback | Reconocen responsable/procedimiento; no revocar cuentas humanas sin acuerdo |
| 36–40 | Conciliación stock/caja por IDs, compensación auditable de fixtures, cierre de apertura y desactivación de fixtures | Baseline de maestros comerciales/aperturas reales idéntico; REQUIERE_REVISION intactos; firmas |

Escritura ambigua: consultar ID/key y movimientos antes de repetir. Detener escenario por permisos indebidos, doble movimiento, entorno incorrecto, secreto expuesto o diferencia no conciliada. Ejercicios independientes pueden continuar; gate afectado queda PENDING/FAIL con causa exacta.

## Acta y criterios

[Plantilla sin datos sensibles](operativa/CHECKLIST_ENSAYO_TEST.csv); copia nominal local ignorada. Fecha, SHA, entorno, rol/persona en acta privada, escenario/observado/esperado, PASS/FAIL, referencia no sensible, readback/restauración y firmas funcional/revisor.

- identidad_cuentas: diez logins reales, roles propios y logout.
- capacitacion_venta: seis completan pedido/confirmación/entrega/pago/presencial/granel y límites.
- capacitacion_operacion: dos completan cancelación, stock/compras/caja/gastos y conciliación, con límite de precios/configuración.
- capacitacion_administracion: dos completan productos/precios/oferta, registro/versiones y recuperación.
- ensayo_test: flujo integral conciliado, restauración verificada y acta firmada.

Actualizar checks solo tras evidencia real. Hash, asistencia o suite verde no equivalen a READY. Ensayo no autoriza Production ni reemplaza los otros quince checks.
