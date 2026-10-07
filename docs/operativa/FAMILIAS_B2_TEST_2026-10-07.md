# B2 — Esquema TEST — 2026-10-07

Destino comprobado por ID `1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM` y nombre `TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES`. 17 pestañas iniciales; encabezados completos sin duplicados. 56 SKU sin IDs duplicados; 4 detalles históricos de compra.

Backup completo: [BACKUP TEST FAMILIAS B2 2026-10-07T07-02-23-673Z](https://docs.google.com/spreadsheets/d/1mNAkm8pMvsRPTx0pi-bQNAxcru_eT6JUYIHsh-VuP6Q/edit?usp=drivesdk). ID distinto, legible, las 17 pestañas comparadas exactamente con el original, incluidos valores/fórmulas. Se comparó otra lectura del original antes de escribir para detectar concurrencia. Respaldo conserva organización nativa mediante copia Drive.

Plan puro y ejecutor protegido: `scripts/lib/familias-b2.mjs`, usado con adaptador de conectores Drive. Cuatro requests estructurales atómicos: append de encabezados PRODUCTOS (5) y DETALLE_COMPRAS (6), creación FAMILIAS_PRODUCTO y sus 18 encabezados. No se rellenó ninguna fila. El readback comprobó cada celda anterior; segunda ejecución = 0 cambios, sin backup adicional. No hay familias comerciales ni fixtures nuevos.

Huellas FNV64 de matrices valores/fórmulas previas: PRODUCTOS `a95ab82534afe4ec`; DETALLE_COMPRAS `16e30df0036cf345`. Además se hizo comparación exacta de todas las celdas previas, más fuerte que depender solo de esas huellas. IDs/stock/costos/precios/modos/bases y todos los históricos intactos. API CellData confirmó encabezados nuevos y filas vacías; no se modificaron estilos, validaciones ni columnas vecinas. Verificación de formato mediante API, sin afirmar revisión visual humana.

Apps Script TEST: v18 → v19, con proyecto/deployment/configuración remotos comprobados por clasp; guard adicional exige el Spreadsheet ID autorizado. Backup privado del código v18 y manifest en `operativa.local/backups/`; versión inmutable v18 disponible para rollback del mismo deployment. Se desplegó solamente fuente A/B1; C1/C2 todavía no existen en ese payload.

QA: 5 tests locales B2 y 6 del deploy PASS (destino, duplicados, backup inválido, concurrencia/readback y dos ejecuciones). Post-deploy solo lecturas mediante `scripts/verificar-familias-test.mjs`, con evidencia privada ignorada: destino, esquema, productos, catálogo V1 y tres compras/detalles históricos PASS. PRODUCTOS 25 columnas/56 filas; DETALLE_COMPRAS 24 columnas/4 filas. Hash SHA256 catálogo V1 `23c00f8584db2c96fcabe7f28d32bcaae183f7c15846b2885b31b5c55502c9e4`. Permisos/capacidades Next no cambiaron; no existe un endpoint GAS de roles que requiera modificar cuentas para probarlo.

No se hicieron compras, pedidos, ventas ni ajustes. main/Production/Sheet productiva intactos. Reversión estructural: conservar nueva hoja/columnas vacías si no hay incidencia, o recuperar una copia del backup en una tarea controlada; no borrar columnas/hojas automáticamente. Para el backend, redeploy exclusivo TEST a v18; no renombrar el backup como original ni sobrescribir datos sin autorización específica.
