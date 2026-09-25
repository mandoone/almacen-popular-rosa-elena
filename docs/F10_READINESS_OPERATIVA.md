# F10 — Readiness operativa y puesta en marcha

Este documento prepara el trabajo; **no autoriza Producción**, no contiene
secretos y no reemplaza el Go/No-Go humano de `GO_NO_GO_FASE_9_10.md`.

## Uso del preflight

1. Copiar `config/f10-readiness.example.json` como
   `config/f10-readiness.local.json` (ignorado por Git).
2. Cambiar cada estado solo cuando exista evidencia verificable. No registrar
   montos, credenciales, IDs privados, enlaces de Sheets ni nombres de personas.
3. Ejecutar `npm run preflight:f10`. Durante la preparación informa pendientes
   sin habilitar nada. El candidato final usa `npm run preflight:f10 -- --strict`.

`ready` significa comprobado; `pending`, aún no ejecutado; `blocked`, impedido;
`not_applicable`, descartado mediante una decisión humana registrada.

## Secuencia operativa

### 1. Identidad, roles y canales públicos

- La QA con `test-admin`, `test-operacion` y `test-venta` es solo
  `PROVISORIO_TEST`: las contraseñas aleatorias se descartan al terminar y
  el archivo local ignorado conserva solo hashes/secreto TEST. No representa
  cuentas humanas ni sustituye un ensayo visual autenticado con usuarios reales.
- El Almacén aprueba la matriz de capacidades y asigna cada persona a un rol.
- Se crean actores técnicos individuales con `npm run auth:credential -- --actor
  <id> --role <rol>`; el comando pide la contraseña sin mostrarla.
- Se verifica login, trazabilidad, revocación y cierre de sesión de cada rol en TEST.
- Se aprueban textos, derechos de imágenes, contactos, calendario y dominio HTTPS.

### 2. Datos iniciales y corte

- Congelar altas/cambios mientras se realiza el corte y anotar hora de referencia.
- Contar stock físico por producto y unidad; una segunda persona revisa diferencias.
- Validar precios de venta, incluidos extremos; registrar costos iniciales y fecha.
- Confirmar mínimos/prioridades antes de usar recomendaciones de abastecimiento.
- Conciliar efectivo y saldo bancario al mismo corte. Los montos viven solo en el
  sistema operativo autorizado, no en este repositorio ni en el manifiesto.
- Ejecutar readback y resolver toda diferencia antes de habilitar pedidos/ventas.

### 3. Capacitación y ensayo

- Venta: login propio, pedido, confirmación, listo, entrega, cancelación y comanda.
- Operación: lo anterior más stock, compras, abastecimiento, caja, gastos y reportes.
- Administración: usuarios, productos, precios, configuración, revocación y rotación.
- Ensayar en TEST un turno completo con cuentas individuales; conservar las dos
  operaciones históricas `REQUIERE_REVISION` sin borrarlas ni maquillarlas.

### 4. Backup, rollback y ventana

- Seguir `OPERACION_BACKUP_ROLLBACK.md`: copia verificada de Sheet, versión de
  Apps Script, commit/tag, deployment web estable y variables en gestor seguro.
- Nombrar responsable, segundo revisor, ventana, canal de coordinación y criterios
  de abortar. Una escritura ambigua se investiga por ID/key antes de repetirla.
- Definir rollback independiente para web, Apps Script y datos; probar lecturas
  después de cada reversión.

## Criterio Go/No-Go

Solo puede proponerse **GO** cuando los 20 checks del manifiesto están `ready` o
`not_applicable`, el preflight estricto pasa desde el commit candidato limpio y
existe autorización explícita de Producción. Cualquier `pending`, `blocked`,
preflight fallido, diferencia de inventario/caja, identidad compartida o ausencia
de backup verificable implica **NO-GO**.
