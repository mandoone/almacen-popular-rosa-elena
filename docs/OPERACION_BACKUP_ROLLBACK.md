# Backup y rollback — preparación técnica

Este procedimiento es una lista de control. No autoriza ni ejecuta operaciones productivas.

## Antes de un despliegue productivo

1. Confirmar Go/No-Go humano, responsable y ventana de cambio.
2. Registrar el commit exacto que se propone desplegar y conservar el último commit estable.
3. Crear manualmente una copia fechada de la Sheet productiva y comprobar que contiene todas sus pestañas. No almacenar el enlace ni su identificador en Git.
4. Registrar la versión y el deployment productivo vigentes de Apps Script en el gestor seguro acordado, nunca en documentación versionada.
5. Exportar o verificar las variables productivas desde el proveedor, sin imprimirlas en terminal ni copiarlas al repositorio.
6. Ejecutar tests, lint, build y el checklist TEST desde el commit candidato.

## Rollback de la web

1. Detener cambios nuevos y registrar la evidencia del incidente.
2. Redeployar desde el último commit estable conocido mediante el mecanismo del proveedor.
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

## Verificación posterior

- Home, historia, participación y tienda responden sin 404/500.
- Login y panel admin operan con la configuración esperada.
- Backend confirma inequívocamente el entorno correspondiente.
- Una consulta de caja no cambia APERTURAS.
- Logs no contienen credenciales, URLs privadas ni cuerpos sensibles.
- Se documentan resultado, responsable, commit, hora y cualquier rollback.
