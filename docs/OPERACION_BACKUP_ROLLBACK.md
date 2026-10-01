# Backup y rollback — preparación técnica

Este procedimiento es una lista de control. No autoriza ni ejecuta operaciones productivas.

Orden único del corte, responsables/evidencias/resultados y comandos: [cutover preparado](operativa/CUTOVER_TECNICO_PREPARADO.md). El candidato actual solo permite TEST; habilitación del contrato productivo queda dentro del corte autorizado. Tras granel, no revertir a web/backend previos al modelo (TEST v16 o anterior): recuperar código compatible con datos y credenciales actuales, o mantener escrituras detenidas.

| Componente | Qué y cómo se conserva | Cuándo / quién | Verificación |
|---|---|---|---|
| Sheet | Copia fechada completa en espacio autorizado, sin URL en Git | Antes del corte; responsable de datos + segundo revisor | Abrir copia, contar pestañas/filas clave y leer IDs de muestra |
| Apps Script | Versión y deployment estable registrados en gestor seguro | Antes del corte; responsable técnico | Confirmar versión y lectura no mutante contra entorno correcto |
| Web | Commit/tag inmutables y deployment estable/candidato | Antes del cambio; responsable técnico | Resolver SHA/tag y consultar metadata de deployment |
| Secretos/configuración | Nombres, scopes, versiones y custodia en gestor seguro; no exportar valores a Git | Antes del cambio; custodio de secretos | Dos personas comprueban scopes y recuperación sin revelar valores |
| Identidades | Snapshot seguro del registro de actores y versiones de sesión, más inventario de deployments históricos | Antes de rotar, revocar o cambiar rol; custodio + segundo revisor | Readback de roles/active/version sin imprimir hashes; verificar que URLs antiguas no acepten credenciales retiradas |
| Firewall | Configuración WAF aplicada y borradores existentes, mediante metadata/captura segura; no crear ni publicar reglas | Antes de cualquier activación futura; responsable técnico | Comparar diff completo y conservar ruta de restauración; ver `RATE_LIMIT_WAF_RUNBOOK.md` |

La ventana y sus responsables/suplentes se acuerdan con el Almacén. No hay
backup productivo ejecutado todavía.

## Antes de un despliegue productivo

1. Confirmar Go/No-Go humano, responsable y ventana de cambio.
2. Registrar el commit exacto que se propone desplegar y conservar el último commit estable.
   Crear un tag Git anotado para el candidato aprobado y registrar también el
   tag/commit del último estado estable. No mover ni reutilizar esos tags.
3. Crear manualmente una copia fechada de la Sheet productiva y comprobar que contiene todas sus pestañas. No almacenar el enlace ni su identificador en Git.
4. Registrar la versión y el deployment productivo vigentes de Apps Script en el gestor seguro acordado, nunca en documentación versionada.
5. Exportar o verificar las variables productivas desde el proveedor, sin imprimirlas en terminal ni copiarlas al repositorio.
6. Ejecutar tests, lint, build y el checklist TEST desde el commit candidato.
7. Registrar el identificador del deployment web vigente y del candidato, la
   persona responsable, la ventana y los criterios de abortar/revertir.
8. Registrar dónde está la evidencia de respaldo y quién verificó su lectura;
   no basta con haber iniciado una exportación. Confirmar también el estado
   vigente de identidades, URLs históricas y Firewall antes de un cambio de
   seguridad. El backup no autoriza por sí mismo la restauración.

**Disparadores de aborto/rollback:** entorno o commit equivocado; autenticación
o capacidad indebida; diferencia de stock/caja; escritura duplicada o ambigua
sin conciliación; error sostenido de lectura/escritura; pérdida de integridad de
datos o secreto expuesto. El responsable detiene nuevas operaciones, preserva
evidencia y consulta al segundo revisor antes de restaurar datos.

## Rollback de la web

1. Detener cambios nuevos y registrar la evidencia del incidente.
2. Redeployar desde el último commit estable conocido mediante el mecanismo del proveedor.
   Confirmar que el deployment resultante referencia exactamente ese commit.
   No promover ciegamente un deployment histórico: puede conservar identidades
   o secretos revocados. El código estable debe usar la configuración vigente
   y el responsable debe verificarlo antes de abrir acceso admin.
3. Comprobar páginas públicas, autenticación admin y rutas de lectura.
4. No reejecutar escrituras fallidas sin determinar primero si surtieron efecto.

## Rollback de Apps Script

1. No usar el automatismo TEST para producción.
2. Seleccionar en Apps Script la versión productiva estable previamente registrada y actualizar el deployment existente; no crear deployments paralelos por reflejo.
3. Verificar lecturas antes de permitir escrituras.
4. Si hubo una escritura incierta, buscar evidencia por ID/idempotency key antes de reintentar.

## Recuperación de datos

1. Preservar la Sheet afectada; nunca limpiar filas para ocultar una corrida parcial.
2. Comparar contra la copia previa por IDs y movimientos.
3. Corregir mediante movimientos compensatorios auditables, no editando historia silenciosamente.
4. Toda restauración productiva requiere aprobación humana explícita y un segundo revisor.

## Rollback de identidad y Firewall

- Revocar o cambiar credenciales exige incrementar `session_version` y
  comprobar los deployments históricos. Un rollback web no debe reinstalar
  un snapshot antiguo de secretos o usuarios que reabra una credencial. Si
  hay duda, cerrar acceso admin hasta confirmar el estado vigente.
- Para una regla WAF futura, conservar la versión previa y los criterios de
  falso positivo antes de publicar. La reversión también requiere publicación
  autorizada y verificación de login legítimo/429; el runbook exacto está en
  `RATE_LIMIT_WAF_RUNBOOK.md`. Nada de esto se ejecutó todavía.

## Verificación posterior

- Home, historia, participación y tienda responden sin 404/500.
- Login y panel admin operan con la configuración esperada.
- Backend confirma inequívocamente el entorno correspondiente.
- Una consulta de caja no cambia APERTURAS.
- Logs no contienen credenciales, URLs privadas ni cuerpos sensibles.
- Se documentan resultado, responsable, commit, hora y cualquier rollback.
- Confirmar que el dato/caja/stock anterior y posterior concilian con sus IDs;
  no interpretar una respuesta HTTP ambigua como fallo o éxito sin readback.
- El responsable funcional firma el retorno al servicio; si alguna lectura o
  conciliación falla, mantener NO-GO y no reabrir escrituras.
