# F9 — Rate limiting distribuido: especificación y activación futura

**Estado:** `PREPARADO_PARA_ACTIVACION`, **NO ACTIVADO**. Producción no
autorizada. Este documento no autoriza crear borradores, reglas, ni publicar
configuración Firewall. El gate de seguridad productiva sigue abierto.

## Evidencia y alcance (2026-09-27)

- Proyecto Vercel `almacen-popular-rosa-elena-7m17`, equipo Hobby: dashboard
  Firewall leído sin cambios; Firewall del sistema activo, **0 reglas
  personalizadas aplicadas**. No se verificó independientemente si hay un
  borrador remoto. La CLI `vercel` no estaba instalada en el entorno de esta
  auditoría; no se instaló.
- El login es `POST /api/admin/auth/login`. `proteccionLogin.ts` mantiene un
  `Map` por proceso: cinco **fallos** por IP y por actor en 15 minutos,
  bloqueo de 15 minutos. Una instancia no comparte ese mapa con las demás.
  Vercel [normaliza `x-forwarded-for` en su plataforma](https://vercel.com/docs/headers/request-headers),
  por lo que el encabezado que usa la aplicación no es directamente el valor
  arbitrario enviado por un cliente a Vercel; esto no vuelve global al mapa.
- Según la [documentación WAF de Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting),
  Hobby ofrece una regla de rate limit por proyecto (hasta tres reglas WAF
  personalizadas en total), ventana fija entre 10 segundos y 10 minutos,
  claves IP o JA4, y 1.000.000 de solicitudes *permitidas* incluidas. El
  precio publicado de referencia es USD 0,50 por millón de solicitudes
  permitidas; antes de activar hay que verificar facturación y comportamiento
  al agotar la cuota Hobby. Los contadores son **por región**, no globales.
- La [referencia de condiciones](https://vercel.com/docs/cli/firewall)
  permite combinar `path`, `method`, `environment` y `host`. Publicar una
  configuración aplica cambios al proyecto/Production; incluso una regla
  limitada por condición a Preview exige autorización productiva para publicar.

## Regla propuesta; parámetros sujetos a observación

| Campo | Propuesta |
|---|---|
| Condiciones, todas AND | `path eq /api/admin/auth/login`; `method eq POST`; `environment eq production`; `host eq <dominio-admin-aprobado>` cuando exista |
| Conteo | IP de origen; **todas** las solicitudes coincidentes, exitosas o fallidas |
| Algoritmo | Ventana fija de 10 minutos (máximo Hobby) |
| Umbral inicial candidato | 20 solicitudes por IP y región por ventana; no tratarlo como umbral aprobado hasta observar tráfico legítimo |
| Acción inicial | `Log` durante observación; no bloquear |
| Acción de aplicación futura | Rate Limit → respuesta por defecto `429` al exceder el umbral, solo tras QA y aprobación |
| Exclusiones | Ninguna por defecto; una excepción futura requiere justificación, responsable y alcance IP/host acotado |

La regla WAF no lee `actor_id`, no distingue fallos y no sustituye el límite
local de cinco fallos/15 minutos. Mantener ambas capas. El umbral 20/10 es
una hipótesis de arranque para revisión humana, no evidencia de tráfico real.
Una IP NAT de una red compartida puede sumar logins legítimos de varias
personas y recibir 429; IPs rotativas, múltiples regiones y el reparto entre
instancias pueden permitir más intentos que el nominal. Un `429` falso debe
tener un canal de atención y permitir reintentar tras la ventana; no se prevé
un bypass amplio o permanente. Revisar métricas sin registrar passwords,
tokens ni cuerpos de login. El limitador local deja de crear entradas nuevas
cuando alcanza 5.000 claves; antes del ensayo productivo se debe comprobar
cómo normaliza Vercel el encabezado de IP reenviada y medir abuso de actores/IPs
rotativas. Ninguna de esas condiciones se considera resuelta por la WAF.

**Criterio de suficiencia:** WAF + limitador local es una defensa por capas
razonable para ensayar en un almacén pequeño, sin dependencia nueva. No está
demostrado que baste para el tráfico o riesgo reales. Si se exige un máximo
global estricto de cinco fallos por actor/IP, o se observan abusos desde IPs
rotativas/múltiples regiones, clasificar `REQUIERE_CONTADOR_CENTRAL` y abrir
decisión de proveedor/costo. No usar Runtime Cache o Edge Config como contador
de seguridad: no ofrecen aquí el incremento atómico global requerido.

## Runbook futuro — **REQUIERE AUTORIZACIÓN DE PRODUCCIÓN**

Ningún paso siguiente se ejecutó. `vercel firewall publish` cambia la
configuración aplicada al proyecto/Production. Crear, editar, eliminar,
descartar o publicar reglas también es mutación remota y requiere autorización
explícita posterior.

1. **Antes:** designar responsable y suplente, ventana y canal de alerta;
   confirmar dominio/host administrativo, tráfico esperado, plan/cuota y
   criterio de falsos positivos. Exportar o capturar de forma segura la
   configuración WAF aplicada y su versión, revisar diferencias/borradores
   existentes y registrar la ruta de restauración. No guardar IPs o datos
   sensibles en Git. Preparar login de recuperación y decidir gatillos de
   rollback: bloqueo legítimo, exceso de 429, error de regla o falta de logs.
2. **Ensayo con aprobación:** crear/stage una sola regla con `environment eq
   preview`, ruta/método exactos y acción `Log`; revisar el diff **completo**
   (incluidos borradores ajenos) antes de publicar. Publicar solo con
   autorización productiva expresa. Observar tráfico y tasas por IP/región;
   comprobar que otras rutas no coinciden. Cambiar a Rate Limit/429 solo tras
   ajustar el umbral y repetir revisión/publicación autorizada.
3. **QA Preview acotada:** desde una IP, comprobar login válido y solicitudes
   bajo el límite; superar el límite con cuentas sintéticas y volumen acordado
   para observar 429; confirmar otra IP, timeout de ventana, ausencia de 429
   en rutas ajenas y logs sin secretos. No lanzar carga agresiva.
4. **Activación productiva separada:** cambiar la condición a
   `environment eq production` y al host definitivo aprobado. Volver a
   revisar diff, responsable, ventana y rollback antes de publicar. Primero
   `Log` y observar tráfico real; después, con aprobación adicional, aplicar
   Rate Limit/429 y vigilar logins legítimos, 429 y cuota. Una regla Preview
   no prueba por sí sola el comportamiento del dominio final.
5. **Rollback:** ante los gatillos, restaurar la versión WAF previa desde el
   historial o retirar/desactivar la regla y publicar el cambio, siempre con
   responsable y autorización. Confirmar que un login legítimo funciona,
   que el resto del Firewall volvió al estado previo y que 429/logs vuelven
   al nivel esperado. Conservar evidencia saneada de tiempos y resultado.

No publicar una regla parcial si el diff incluye cambios ajenos. No usar
`--prod`, promover Preview ni tocar datos comerciales como parte del ensayo.
