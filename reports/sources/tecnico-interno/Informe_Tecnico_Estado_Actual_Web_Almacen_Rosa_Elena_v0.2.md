---
DOCUMENTO: "Estado técnico complementario del proyecto web"
VERSION: "0.2"
FECHA: "2026-07-08"
ESTADO: "EN_REVISION"
FUENTE:
  - "docs/PROJECT_STATE.md"
  - "docs/TASKS.md"
  - "docs/CHANGELOG.md"
TIPO_INFORME: "TECNICO_INTERNO"
---

# Informe técnico de estado actual
## WEB — Almacén Popular Rosa Elena Morales

**Documento:** Estado técnico complementario del proyecto web
**Versión:** v0.2 técnica
**Fecha:** 2026-07-08
**Estado:** Fase 2 cerrada en producción / listo para iniciar Fase 3A
**Uso:** Documento interno para Omar y para trabajo posterior con Claude Code.
**Complementa:** Plan de trabajo web v0.1 y documentos metodológicos preliminares ya generados.

---

## 1. Objetivo del documento

Este documento actualiza el estado técnico real del proyecto **Web Almacén Popular Rosa Elena Morales** después del cierre de la Fase 2 — Seguridad del panel admin.

El informe complementa el plan anterior, donde la Fase 1 aparecía como funcional y la Fase 2 como prioridad pendiente. Ahora la Fase 2 ya fue implementada, probada localmente, desplegada en producción y validada en la web real.

También incorpora trabajo complementario que no estaba totalmente detallado en el plan inicial: organización del Drive, ubicación de la base operativa web, variables de producción en Vercel, rotación de token admin y consolidación de la estructura de trabajo.

---

## 2. Documentos previos considerados

Se revisaron los documentos anteriores enviados para el proyecto. El plan visual mantenía una estructura clara por fases: Fase 0 como orden inicial, Fase 1 como base operativa y pedidos reales, Fase 2 como seguridad admin pendiente, y Fases 3 a 10 como ruta hacia una versión operativa completa.

También se consideró el informe metodológico preliminar, donde se registraron aprendizajes sobre arnés liviano, trabajo por bloques, documentación viva, uso de ChatGPT como controlador metodológico y Claude Code como ejecutor técnico.

Referencias de estructura tomadas del plan anterior:

- Cabecera con estado actual, próxima prioridad y meta final.
- Leyenda de realizado / pendiente.
- Separación por fases.
- Checklist por fase.
- Síntesis y próximo paso recomendado.

---

## 3. Estado ejecutivo actual

| Área | Estado actual |
|---|---|
| Sitio público | Funcionando en Vercel Production |
| Catálogo de productos | Conectado a Google Sheets |
| Pedidos online | Funcionando con pedidos reales |
| Panel admin | Protegido con login y sesión segura |
| APIs admin | Protegidas con middleware |
| Base operativa | Centralizada en Google Sheets dentro del Drive del almacén |
| Seguridad admin | Fase 2 cerrada y probada |
| Próxima prioridad | Fase 3A: modelo operativo de pedidos, estados, pagos y stock |

Estado general:

```txt
Fase 0 — Lista
Fase 1 — Funcional y probada
Bloque complementario Drive/Base — Realizado
Fase 2 — Lista y probada en producción
Fase 3 — Pendiente operativo / próxima fase
Fase 10 — Meta final operativa
```

---

## 4. Arquitectura actual

### 4.1 Frontend y aplicación web

| Componente | Estado |
|---|---|
| Next.js 14 App Router | Activo |
| TypeScript | Activo |
| Tailwind / estilos del proyecto | Activo |
| Vercel Production | Activo |
| Deploy desde GitHub main | Funcionando |

URL pública:

```txt
https://almacen-popular-rosa-elena-7m17.vercel.app
```

Commit desplegado al cierre de Fase 2:

```txt
36189a1 merge: proteger panel admin con login y sesión segura
```

### 4.2 Base operativa

Base oficial actual:

```txt
BD_WEB_ALMACEN_ROSA_ELENA_MORALES
```

ID técnico:

```txt
[ID de Google Sheet omitido por seguridad]
```

Ubicación actual en Drive:

```txt
WEB — Almacén Popular Rosa Elena Morales
└── 01_Base operativa WEB
    └── BD_WEB_ALMACEN_ROSA_ELENA_MORALES
```

Hojas principales existentes:

```txt
CONFIG
PRODUCTOS
CLIENTES
PEDIDOS
DETALLE_PEDIDOS
VENTAS
DETALLE_VENTAS
COMPRAS
DETALLE_COMPRAS
MOVIMIENTOS_STOCK
```

### 4.3 Backend liviano

El backend operativo usa Google Apps Script como capa entre la web y Google Sheets.

Funciones operativas actuales:

| Flujo | Estado |
|---|---|
| Listar productos | Funcionando |
| Crear pedido | Funcionando |
| Guardar pedido | Funcionando |
| Guardar detalle del pedido | Funcionando |
| Descontar stock | Funcionando |
| Registrar movimiento de stock | Funcionando |
| Listar pedidos para admin | Funcionando |
| Cambiar estado de pedido | Funcionando |
| Cambiar estado de pago | Disponible en flujo base |
| Cancelar pedido | Disponible |
| Devolver stock al cancelar | Declarado como implementado en Fase 1; debe revalidarse en Fase 3A |

Variables sensibles actuales en Vercel:

```env
GOOGLE_SCRIPT_PEDIDOS_URL=
GOOGLE_SCRIPT_ADMIN_TOKEN=
ADMIN_PANEL_PASSWORD=
ADMIN_SESSION_SECRET=
```

Los valores reales no deben aparecer en documentos, código ni chats.

---

## 5. Estado por fases

## Fase 0 — Orden inicial del proyecto

**Estado:** Lista.

Checklist actualizado:

- [x] Revisar la página existente.
- [x] Ordenar el trabajo por etapas.
- [x] Definir un plan general de avance.
- [x] Separar lo técnico de lo operativo y lo público.
- [x] Empezar a organizar la información disponible.
- [x] Revisar informe anterior de estado.
- [x] Revisar Drive del almacén de forma preliminar.
- [x] Identificar documentos útiles para el sistema.
- [x] Mantener una lógica de avance por bloques pequeños.
- [x] Actualizar documentación viva después de pruebas reales.

---

## Fase 1 — Base operativa y pedidos reales

**Estado:** Funcional y probada.

Esta fase permitió que los pedidos dejaran de depender solo del navegador o de un computador específico. Ahora la tienda puede generar pedidos reales y el panel admin puede leerlos desde una base compartida.

### 1.1 Base operativa

- [x] Crear una base operativa para la web.
- [x] Crear hojas principales para productos, pedidos, detalle, clientes, ventas, compras, movimientos de stock y configuración.
- [x] Cargar configuración temporal.
- [x] Cargar productos iniciales.
- [x] Usar Google Sheets como base liviana compartida.

### 1.2 Productos iniciales

- [x] Cargar 53 productos reales.
- [x] Crear códigos internos tipo `PROD-001`, `PROD-002`, etc.
- [x] Cargar precios iniciales.
- [x] Usar stock temporal para pruebas.
- [x] Confirmar que `/api/productos` devuelve el catálogo real.
- [x] Confirmar que `/tienda` muestra productos reales.

### 1.3 Pedidos reales

- [x] Crear backend con Apps Script.
- [x] Permitir crear pedidos reales.
- [x] Guardar pedidos en Google Sheets.
- [x] Guardar detalle de productos pedidos.
- [x] Descontar stock al crear pedido.
- [x] Registrar movimientos de stock.
- [x] Permitir cancelar pedidos.
- [x] Permitir cambiar estado del pedido.
- [x] Permitir cambiar estado de pago.
- [x] Probar flujo tienda -> pedido -> base operativa -> admin -> stock.

### 1.4 Conexión con la web

- [x] Conectar la tienda con la base operativa.
- [x] Conectar el catálogo a productos reales.
- [x] Conectar el panel admin a pedidos reales.
- [x] Dejar de depender de `localStorage` como base real de pedidos.
- [x] Probar pedido real desde la web pública.
- [x] Confirmar que el pedido aparece en el panel admin.

---

## Bloque complementario — Orden Drive, base web y producción

**Estado:** Realizado.

Este bloque no estaba completamente separado en el plan inicial, pero fue necesario para dejar el sistema más ordenado y seguro.

### 1.5 Organización del Drive

Carpeta creada para centralizar el trabajo web:

```txt
WEB — Almacén Popular Rosa Elena Morales
```

Subcarpetas creadas:

```txt
00_Documentación
01_Base operativa WEB
02_Respaldos y versiones
03_Diseño y recursos visuales
99_Archivo histórico
```

Checklist:

- [x] Crear carpeta web dentro del Drive del almacén.
- [x] Crear subcarpetas por tipo de información.
- [x] Ubicar la base operativa web en `01_Base operativa WEB`.
- [x] Mantener mismo ID de Google Sheets para no romper la conexión.
- [x] Confirmar que la web siguió funcionando después del movimiento.

### 1.6 Configuración de producción

- [x] Configurar variables en Vercel Production.
- [x] Agregar `GOOGLE_SCRIPT_PEDIDOS_URL`.
- [x] Agregar `GOOGLE_SCRIPT_ADMIN_TOKEN`.
- [x] Rotar token admin después de exposición accidental.
- [x] Actualizar Apps Script con token nuevo.
- [x] Redeployar producción.
- [x] Confirmar que `/api/productos` sigue funcionando.
- [x] Confirmar que `/admin` sigue leyendo pedidos.

---

## Fase 2 — Seguridad del panel admin

**Estado:** Lista y probada en producción.

En el plan anterior esta fase aparecía como pendiente prioritaria. Ahora ya fue ejecutada y validada.

Motivo de la fase: como ya existen pedidos reales y datos de personas, era necesario proteger el panel admin y sus rutas internas antes de agregar nuevas funciones.

### 2.1 Problemas encontrados antes de la fase

| Problema | Riesgo |
|---|---|
| Password hardcodeada en frontend | Crítico |
| [contraseña histórica hardcodeada omitida] visible en código cliente | Crítico |
| Sesión guardada en `localStorage` | Crítico |
| `/api/admin/pedidos` sin auth real | Crítico |
| `/api/admin/pedidos/[id]` sin auth real | Crítico |
| Cualquier persona con URL podía ver o modificar pedidos | Crítico |

### 2.2 Implementación realizada

Archivos creados:

```txt
src/lib/session.ts
src/middleware.ts
src/app/admin/login/page.tsx
src/app/api/admin/auth/login/route.ts
src/app/api/admin/auth/logout/route.ts
```

Archivos modificados:

```txt
src/app/admin/page.tsx
.env.example
docs/CHANGELOG.md
```

Solución implementada:

- [x] Crear acceso seguro para administrador.
- [x] Sacar clave hardcodeada del frontend.
- [x] Eliminar login antiguo basado en `localStorage`.
- [x] Crear inicio de sesión real.
- [x] Crear cierre de sesión.
- [x] Usar sesión segura con cookie `httpOnly`.
- [x] Firmar sesión con HMAC-SHA256.
- [x] Usar `ADMIN_SESSION_SECRET` para firmar la cookie.
- [x] Usar `ADMIN_PANEL_PASSWORD` como contraseña definida por entorno.
- [x] Proteger `/admin`.
- [x] Proteger `/admin/*`.
- [x] Proteger `/api/admin/*`.
- [x] Permitir `/admin/login` sin sesión.
- [x] Permitir `/api/admin/auth/login` y `/api/admin/auth/logout`.
- [x] Evitar que cualquier persona con el link pueda ver pedidos.
- [x] Mantener claves y datos sensibles fuera del código público.
- [x] Documentar variables sin valores reales.

### 2.3 Comportamiento actual esperado

```txt
/admin sin sesión -> redirige a /admin/login
/admin/login con sesión válida -> redirige a /admin
/api/admin/* sin sesión -> 401 JSON
Login correcto -> crea cookie httpOnly
Logout -> elimina cookie
```

### 2.4 Pruebas realizadas

#### Local

- [x] `/admin` sin sesión redirige a login.
- [x] Login incorrecto no entra.
- [x] Login correcto entra al panel.
- [x] `/api/admin/pedidos` sin cookie responde `401 Unauthorized`.
- [x] `/api/productos` sigue público.
- [x] Panel carga pedidos reales.
- [x] Cambio de estado de pedido funciona.
- [x] Logout elimina sesión.
- [x] `npm run lint` sin errores.
- [x] `npm run build` exitoso.

#### Producción

- [x] Agregar `ADMIN_SESSION_SECRET` en Vercel Production.
- [x] Agregar `ADMIN_PANEL_PASSWORD` en Vercel Production.
- [x] Merge a `main`.
- [x] Push a GitHub.
- [x] Deploy automático en Vercel.
- [x] Vercel Production en estado `Ready`.
- [x] `/admin` redirige a login.
- [x] Login producción funciona.
- [x] Panel carga pedidos.
- [x] Logout funciona.
- [x] `/api/productos` sigue mostrando productos.
- [x] Tienda sigue funcionando.

### 2.5 Commits relevantes de la fase

```txt
4b02bb8 feat: proteger panel admin con login y sesión segura
36189a1 merge: proteger panel admin con login y sesión segura
```

---

## 6. Validación metodológica del trabajo reciente

El flujo usado en esta etapa mantuvo el patrón descrito en el informe metodológico preliminar:

```txt
Diagnóstico breve
-> prompt cerrado para Claude Code
-> implementación controlada
-> lint/build
-> pruebas locales
-> variables de producción
-> merge
-> push
-> deploy
-> prueba en producción
-> documentación de hechos probados
```

Lecciones confirmadas:

- [x] No avanzar a una fase nueva sin cerrar la anterior.
- [x] Claude Code debe auditar antes de modificar.
- [x] Los prompts deben indicar `no commit`, `no push`, `no deploy`, `no secretos` cuando corresponda.
- [x] Los secretos deben agregarse manualmente y nunca imprimirse.
- [x] `.env.example` debe documentar nombres de variables, no valores.
- [x] La documentación debe registrar hechos probados, no solo intenciones.
- [x] El cierre real de una fase exige validación en producción cuando el cambio afecta producción.

---

## 7. Observaciones funcionales detectadas después de Fase 2

La seguridad quedó resuelta, pero al usar el panel admin aparecieron puntos operativos para la siguiente fase.

### 7.1 Flujo de estados del pedido

Se observó que un pedido marcado como `Listo` no muestra una opción simple para volver a `Pendiente`.

Flujo aparente actual:

```txt
Pendiente -> Listo -> Entregado
                 -> Cancelado
```

Problema operativo:

- Si alguien marca un pedido como listo por error, no hay una corrección simple desde el panel.
- Esto puede dificultar la operación real del almacén.

### 7.2 Estado de pago y método de pago

Se observó el valor:

```txt
pagado_efectivo
```

Esto debe revisarse porque puede estar mezclando dos conceptos distintos:

```txt
estado_pago = pendiente / pagado
metodo_pago = efectivo / transferencia / otro
```

Riesgo:

- Si el sistema mezcla estado de pago y método de pago en un solo campo, puede dificultar caja, cierres, pendientes y ventas presenciales.

### 7.3 Stock y cancelaciones

El plan original indica que el sistema descuenta stock al crear pedido y devuelve stock al cancelar. Eso debe verificarse técnicamente en la Fase 3A antes de agregar más funciones.

Preguntas pendientes:

- [ ] ¿El stock se descuenta siempre al crear un pedido?
- [ ] ¿El stock se devuelve siempre al cancelar?
- [ ] ¿Qué pasa si un pedido entregado se cancela?
- [ ] ¿Qué pasa si un pedido cancelado se reabre?
- [ ] ¿Cada cambio deja movimiento en `MOVIMIENTOS_STOCK`?

---

## 8. Próxima fase recomendada

## Fase 3A — Diagnóstico operativo de pedidos, estados, pago y stock

**Estado:** Próxima prioridad técnica.

Antes de avanzar a productos, imágenes, caja o panel vendedor, conviene ordenar el núcleo operativo del pedido.

Objetivo:

```txt
Entender y corregir el modelo actual de pedido para que el panel admin sea seguro no solo técnicamente, sino también operativamente.
```

Checklist Fase 3A:

- [ ] Revisar columnas actuales de `PEDIDOS`.
- [ ] Revisar columnas actuales de `DETALLE_PEDIDOS`.
- [ ] Revisar columnas actuales de `MOVIMIENTOS_STOCK`.
- [ ] Revisar función Apps Script `crearPedido`.
- [ ] Revisar función Apps Script `listarPedidos`.
- [ ] Revisar función Apps Script `actualizarEstadoPedido`.
- [ ] Revisar función Apps Script `cancelarPedido`.
- [ ] Revisar API Next `/api/admin/pedidos`.
- [ ] Revisar API Next `/api/admin/pedidos/[id]`.
- [ ] Revisar frontend admin actual.
- [ ] Identificar origen real de `pagado_efectivo`.
- [ ] Confirmar si `pagado_efectivo` es estado, método o valor combinado.
- [ ] Confirmar comportamiento de stock al cancelar.
- [ ] Confirmar comportamiento de stock al reabrir pedidos.
- [ ] Proponer modelo mínimo para `estado_pedido`, `estado_pago` y `metodo_pago`.
- [ ] Definir cambios seguros para Fase 3B.

Entregable esperado:

```txt
Mapa técnico del flujo actual de pedido y propuesta mínima de corrección.
```

---

## 9. Propuesta técnica preliminar para Fase 3B

No implementar todavía sin diagnóstico. Modelo recomendado a evaluar:

```txt
estado_pedido:
- pendiente
- listo
- entregado
- cancelado

estado_pago:
- pendiente
- pagado
- parcial
- anulado

metodo_pago:
- efectivo
- transferencia
- otro
```

Primera versión simplificada:

```txt
estado_pago:
- pendiente
- pagado

metodo_pago:
- efectivo
- transferencia
```

Acciones recomendadas en panel:

| Estado actual | Acciones sugeridas |
|---|---|
| Pendiente | Marcar listo, Cancelar |
| Listo | Volver a pendiente, Marcar entregado, Cancelar |
| Entregado | Ver detalle, Reabrir solo con confirmación |
| Cancelado | Ver detalle, Reabrir solo con confirmación |

Regla de seguridad operativa:

```txt
Los cambios que afecten stock, pago o cierre deben pedir confirmación.
```

---

## 10. Roadmap actualizado después de Fase 2

| Fase | Nombre | Estado actualizado |
|---|---|---|
| Fase 0 | Orden inicial del proyecto | Lista |
| Fase 1 | Base operativa y pedidos reales | Funcional y probada |
| Bloque complementario | Drive, base web, variables y producción | Realizado |
| Fase 2 | Seguridad del panel admin | Lista y probada |
| Fase 3 | Configuración real del almacén | Pendiente operativo / próxima |
| Fase 3A | Estados, pago y stock | Próximo diagnóstico técnico |
| Fase 4 | Productos, stock, precios e imágenes | Pendiente operativo |
| Fase 5 | Panel vendedor y comandas | Pendiente |
| Fase 6 | Caja, pendientes y cierre por apertura | Pendiente |
| Fase 7 | Compras y abastecimiento | Pendiente con criterio definido |
| Fase 8 | Historial, reportes y administración avanzada | Pendiente avanzado |
| Fase 9 | Contenido público, historia y comunidad | Pendiente no urgente |
| Fase 10 | Producción y versión operativa final | Meta final |

---

## 11. Riesgos actuales

| Riesgo | Nivel | Acción recomendada |
|---|---|---|
| Estados de pedido poco reversibles | Medio | Resolver en Fase 3B |
| Pago y método mezclados | Medio | Diagnosticar en Fase 3A |
| Stock al cancelar/reabrir no revalidado | Alto | Probar antes de modificar flujos |
| Panel aún básico | Medio | Mejorar después del modelo operativo |
| Roles admin/vendedor no separados | Bajo por ahora | Retomar antes de Fase 5 |
| Repo dentro de Dropbox | Medio | Mantener cuidado con Git; ideal migrar fuera de Dropbox más adelante |

---

## 12. Criterio para no pasar todavía a Fase 4 o Fase 5

Aunque la seguridad ya está cerrada, todavía no conviene saltar directo a productos avanzados, imágenes, caja o panel vendedor.

Motivo:

```txt
El pedido es el núcleo del sistema. Antes de ampliar funciones, debe quedar claro cómo se manejan estado del pedido, estado de pago, método de pago, cancelación, reposición de stock y correcciones operativas.
```

---

## 13. Siguiente paso inmediato

Crear una nueva rama para diagnóstico de la siguiente fase:

```txt
fase-3a/diagnostico-pedidos-estados-pago
```

Prompt recomendado para Claude Code en la siguiente sesión:

```txt
Diagnosticar sin modificar archivos cómo están implementados actualmente pedidos, estados, pagos y stock en el proyecto Web Almacén Popular Rosa Elena Morales.

Revisar frontend admin, API admin, cliente Apps Script, documentación del modelo de datos y estructura esperada de Google Sheets.

No modificar archivos.
No hacer commit.
No hacer push.
No hacer deploy.
No tocar Apps Script ni Google Sheets.

Entregar:
1. Mapa actual del flujo de pedido.
2. Origen probable de pagado_efectivo.
3. Limitaciones del flujo de estados.
4. Riesgos de stock y cancelaciones.
5. Propuesta de modelo mínimo para Fase 3B.
6. Archivos que habría que tocar después, si se confirma implementación.
```

---

## 14. Síntesis técnica

La web ya superó el punto más riesgoso de la primera etapa: dejó de ser una vitrina con pedidos locales y pasó a tener una base operativa compartida, pedidos reales, stock descontado y panel admin protegido.

La Fase 2 se considera cerrada porque fue implementada, probada localmente, desplegada y validada en producción.

La siguiente prioridad no debería ser agregar muchas funciones nuevas, sino ordenar el flujo operativo de pedidos para que el almacén pueda usar el panel con menos riesgo de errores.
