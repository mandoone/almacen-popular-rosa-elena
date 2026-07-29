# REPORTE_SESION_LARGA.md — Sesión FASE 3A

> Fecha: 2026-07-29 · Rama: `feature/fase-3a-operativa` · Base: `f203e0c`
> Sin push · Sin deploy · Sin cambios en producción

---

## 1. Estado general

Diagnóstico completo y modelo operativo implementado como código puro y probado.
**No se tocó producción**: ni Apps Script, ni Google Sheets, ni variables de
entorno, ni el flujo de creación de pedidos.

Lo más importante que salió de la sesión no es el modelo nuevo, sino **dos bugs
reales en el sistema actual** que pueden descuadrar el inventario (hallazgos 3 y
4 del diagnóstico). Ninguno se corrigió aquí, porque la corrección segura vive en
Apps Script y el `.gs` del repo no es el código que corre.

`lint`, `build` y `test` quedan verdes.

---

## 2. Rama actual

`feature/fase-3a-operativa`, creada desde `docs/informes-v021-compactos` (`f203e0c`).

Se creó con `git checkout -b`, que conserva el working tree intacto: los cambios
preexistentes siguieron ahí sin alteración. No hubo `stash`, `reset` ni `clean`.

---

## 3. Estado Git inicial detectado

Registrado antes de tocar nada.

**11 archivos modificados (baseline preexistente):**

```
design-system/docs/ADS-002_sistema_documental.md
design-system/docs/decisions.md
design-system/prompts/generate-report.md
design-system/templates/report-avance-almacen.html
design-system/templates/report-tecnico-interno.html
design-system/themes/reports.css
docs/CHANGELOG.md
docs/PROJECT_STATE.md
docs/TASKS.md
docs/TEST_PLAN.md
reports/README.md
```
→ 153 inserciones, 9 eliminaciones. **Ninguno fue tocado ni commiteado.**

**Sin trackear (baseline):** `docs/fase-3a/` (con el levantamiento consolidado),
3 HTML de informes y 5 PDF.

**Baseline de calidad:** `npm run lint` limpio y `npm run build` exitoso **antes**
de empezar. Así que cualquier fallo posterior sería atribuible a esta sesión.

---

## 4. Qué quedó implementado

### 4.1 Modelo operativo (`src/lib/fase3a/`) — puro, sin conectar

| Archivo | Contenido |
|---|---|
| `estados.ts` | 5 estados, transiciones e impacto de stock |
| `pagos.ts` | Estado y método separados + migración de valores heredados |
| `responsables.ts` | Lista autorizada, excepción “Otro”, roles |
| `cancelacion.ts` | 6 motivos, observación obligatoria con “Otro” |
| `productos.ts` | Estados, agotado, granel 0,25, nombres de imagen |
| `alertas.ts` | Las 7 alertas del §7.3 |

Tres decisiones de diseño que vale la pena conocer:

1. **El impacto de stock se deriva, no se enumera.** Se calcula comparando si el
   estado origen y el destino comprometen stock. Por construcción, ninguna
   secuencia válida puede descontar o devolver dos veces.
2. **`cancelado` y `entregado` son terminales**, lo que elimina de raíz el
   escenario del hallazgo 3.
3. **La transición a sí mismo se rechaza**, para que un doble clic o un reintento
   tras un timeout falle ruidosamente en vez de mover inventario dos veces.

### 4.2 Pruebas (`tests/`) — 29 casos, 0 dependencias nuevas

`npm test` con el runner nativo de Node. El núcleo es una **matriz 5×5** con los
25 pares de estados; el test comprueba que la matriz esté completa, así que
agregar un estado sin actualizarla falla.

### 4.3 Correcciones de bajo riesgo

- **`src/app/admin/page.tsx`** — el panel usaba `BADGE[estado]` sin fallback y
  casteaba el estado sin validar. Con un estado desconocido quedaba
  `class="undefined"` y la etiqueta vacía. Se agregó `recibido` a los mapas y un
  fallback. **Se ve igual que antes** para los cuatro estados vigentes.
- **`src/app/api/admin/pedidos/route.ts` y `[id]/route.ts`** — las notas de deuda
  técnica afirmaban que las rutas no tenían autenticación de servidor. Es falso
  desde FASE 2. Se corrigieron y se anotó la deuda real (hallazgos 3 y 4).
- **`package.json`** — script `test`.

---

## 5. Qué quedó solo documentado

| Documento | Contenido | Por qué no se implementó |
|---|---|---|
| `CONTRATO_APPS_SCRIPT_PROPUESTO.md` | 6 cambios de backend | El `.gs` del repo no es el código que corre; desplegar sin coordinar rompe pedidos reales |
| `COLUMNAS_SHEETS_PROPUESTAS.md` | 11 columnas + 2 hojas nuevas | Modifica la planilla real |
| `PLAN_IMPLEMENTACION_FASE_3A.md` | 6 etapas por riesgo | Es el plan, no la ejecución |
| `MATRIZ_QA_FASE_3A.md` | Pruebas manuales de migración | Requieren el backend nuevo |

---

## 6. Qué no se tocó por seguridad

- **Apps Script** (`scripts/apps-script-pedidos.gs`) — sin modificar.
- **Google Sheets** — ninguna hoja, columna ni fila.
- **`.env.local`** — no leído, no modificado. No se pidió ningún secreto.
- **Vercel** — sin cambios; sin deploy y sin push.
- **Flujo de creación de pedidos** — `crearPedido_` y `/api/pedidos` intactos.
- **Desplegable de `estado_pago`** — intacto **a propósito**. Cambiarlo antes de
  crear la columna `metodo_pago` haría que el panel escriba `pagado` sin registrar
  cómo pagó cada persona, y **esa información no se puede reconstruir**.
- **Filtro “Recibido”** — no se agregó, para no mostrar una pestaña vacía mientras
  el backend no emita ese estado.
- **Los 11 archivos del baseline preexistente** — sin tocar.
- **Textos públicos** (historia, comunidad, participar) — sin tocar.

---

## 7. Pendientes Carolina/Nadia

Las 11 preguntas siguen abiertas. **Ninguna bloquea la implementación**: cada una
tiene un valor por defecto seguro. Detalle en `PENDIENTES_CAROLINA_NADIA.md`.

| # | Pregunta | Manejo |
|---|---|---|
| P1 | Horario de apertura/retiro | 🔴 Bloqueado — no se inventa un horario |
| P2 | Cierre de pedidos online | 🔴 Bloqueado — por defecto, sin cierre |
| P3 | Quién confirma pedidos | 🟡 Se permite y se audita |
| P4 | Quién cancela pedidos | 🟡 Se permite y se audita |
| P5 | Validación del flujo general | 🟡 Se implementa el aprobado |
| P6 | Categorías oficiales | 🟢 Constante editable |
| P7 | Orden de categorías | 🟢 Constante editable |
| P8 | Unidades de venta | 🟢 Constante editable |
| P9 | Productos solo presenciales | 🟡 Inactivo + nota interna |
| P10 | Textos públicos | 🟢 Preliminares, sin tocar |
| P11 | Historia/comunidad | 🟢 Preliminares, sin tocar |

P3 y P4 merecen una nota: **no se implementaron permisos por rol**. El login es
una contraseña compartida y no identifica personas; simular permisos sobre eso da
falsa seguridad. Se registra **quién** hizo cada acción (auditoría) en vez de
impedirla. Permisos reales exigen usuarios individuales, que §9.2 deja fuera.

Solo P1 y P2 bloquean algo concreto: publicar horarios y aplicar el cierre.
El texto para WhatsApp está listo en §11 del levantamiento.

---

## 8. Pruebas ejecutadas

| Comando | Antes | Después |
|---|---|---|
| `npm run lint` | ✅ limpio | ✅ limpio |
| `npm run build` | ✅ exitoso | ✅ exitoso |
| `npm test` | no existía | ✅ **29/29** |

Bundle: `/admin` pasó de 3.93 kB a 3.99 kB (+60 B por el fallback). El resto de las
rutas, idéntico. Los módulos de `fase3a` **no suman nada al cliente** porque
todavía nada los importa.

---

## 9. Pruebas fallidas o advertencias

**Ninguna prueba falló.** Dos advertencias del entorno, ambas resueltas:

1. **`EBUSY: resource busy or locked, rmdir '.next\export'`** — `npm run build`
   falló dos veces con esto. **No es un error de código**: ocurre en la limpieza
   final, después de que la compilación y el chequeo de tipos ya terminaron. Es un
   bloqueo de archivos de Windows/Dropbox sobre `.next`. Reintentar bastó ambas
   veces, y el build final quedó exitoso. Se documentó en `MATRIZ_QA_FASE_3A.md`.
2. **`MODULE_TYPELESS_PACKAGE_JSON`** — advertencia de Node al importar `.ts`
   desde `.mjs`. La solución que sugiere Node (`"type": "module"` en
   `package.json`) **arriesgaría la configuración de Next.js**, así que se
   descartó; se silenció solo esa advertencia con `--disable-warning`, sin ocultar
   otras.

---

## 10. Archivos modificados por esta sesión

**Nuevos (18):**
```
docs/fase-3a/DIAGNOSTICO_ACTUAL.md
docs/fase-3a/PLAN_IMPLEMENTACION_FASE_3A.md
docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md
docs/fase-3a/MODELO_STOCK_PAGOS.md
docs/fase-3a/PENDIENTES_CAROLINA_NADIA.md
docs/fase-3a/CONTRATO_APPS_SCRIPT_PROPUESTO.md
docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md
docs/fase-3a/MATRIZ_QA_FASE_3A.md
docs/fase-3a/REPORTE_SESION_LARGA.md
src/lib/fase3a/estados.ts
src/lib/fase3a/pagos.ts
src/lib/fase3a/responsables.ts
src/lib/fase3a/cancelacion.ts
src/lib/fase3a/productos.ts
src/lib/fase3a/alertas.ts
tests/fase3a-estados.test.mjs
tests/fase3a-pagos.test.mjs
tests/fase3a-productos.test.mjs
```

**Modificados (4):**
```
package.json                              (+1 script)
src/app/admin/page.tsx                    (fallback de estados)
src/app/api/admin/pedidos/route.ts        (solo comentarios)
src/app/api/admin/pedidos/[id]/route.ts   (solo comentarios)
```

---

## 11. Archivos preexistentes que no se tocaron

Los 11 modificados del baseline (design-system ×6, docs/CHANGELOG.md,
PROJECT_STATE.md, TASKS.md, TEST_PLAN.md, reports/README.md), los 3 HTML y los
5 PDF sin trackear.

⚠️ **`docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md` quedó sin
commitear.** Lo copió Omar antes de esta sesión, así que no es un archivo creado
por ella y no se stageó. **Conviene commitearlo**: es la fuente de verdad que
todos los documentos nuevos citan.

```bash
git add docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md
```

`docs/TEST_PLAN.md` no se tocó por venir modificado en el baseline; por eso la
matriz QA quedó en un archivo aparte. Al cerrar FASE 3A conviene fusionarlos.

---

## 12. Commits creados

Cuatro commits locales, **sin push**:

| Hash | Mensaje |
|---|---|
| `5b03194` | `docs: diagnosticar fase 3a operativa` |
| `86d9b60` | `feat: preparar modelo operativo fase 3a` |
| `a121c6e` | `test: agregar validaciones fase 3a` |
| *(este)* | `docs: reportar sesion larga fase 3a` |

Todos con rutas explícitas: sin `git add .`, sin `commit -am`, sin PDFs, sin HTML
de informes, sin archivos del baseline.

---

## 13. Riesgos

### Vigentes en producción ahora mismo
1. **Doble devolución de stock (hallazgo 3).** Cancelar → revertir por PATCH →
   cancelar otra vez suma el stock dos veces. Requiere sesión admin, pero es
   alcanzable desde la consola del navegador. **Sigue abierto.**
2. **Stock que nunca vuelve (hallazgo 4).** `PATCH {estado_pedido:'cancelado'}`
   marca cancelado sin devolver inventario. **Sigue abierto.**
3. **Cancelar un pedido entregado devuelve stock (hallazgo 5).** **Sigue abierto.**
4. **Todo pedido web compromete stock al enviarse.** Es el comportamiento actual y
   la razón de ser de FASE 3A.

> Los tres primeros se pueden mitigar **solo en Next.js**, validando la transición
> en el proxy admin (ETAPA 1.5 del plan), sin tocar Apps Script. Es reversible en
> un commit y no requiere migración.

### De la migración futura
5. **Sin entorno de prueba**: la misma planilla sirve a producción.
6. **Orden obligatorio**: columnas → datos → Apps Script → panel. Invertirlo
   rompe la toma de pedidos (`col_()` lanza si falta un encabezado).
7. **Pedidos en vuelo** durante el cambio: por eso hay que marcarles
   `fecha_confirmacion`.

### De esta sesión
8. **Bajo.** Lo único que cambia comportamiento es el fallback del panel, y solo
   ante estados que hoy no existen. Los demás cambios son comentarios, archivos
   nuevos sin importar, y un script de npm.

---

## 14. Qué debería revisar Omar primero

1. **`DIAGNOSTICO_ACTUAL.md` §3.1** — los hallazgos 3 y 4. Son bugs reales, no
   teóricos, y definen la urgencia de todo lo demás.
2. **Decidir si mitigar ya en el proxy** (ETAPA 1.5). Cierra el camino realmente
   alcanzable sin tocar Apps Script ni la planilla. Es la mejor relación
   riesgo/beneficio disponible hoy.
3. **`PENDIENTES_CAROLINA_NADIA.md` §3, punto T1** — `pendiente → entregado` quedó
   prohibido porque el flujo aprobado no lo enumera, pero el panel actual sí lo
   permite. **Requiere tu confirmación**; no se decidió por cuenta propia.
4. **Enviar las 11 preguntas** (texto listo en §11 del levantamiento). No bloquean,
   pero P1 y P2 sí bloquean publicar horarios.
5. **Commitear el levantamiento** (§11 de este reporte).
6. **Rotar la contraseña** de §12 del levantamiento, si no se hizo.

---

## 15. Próximo prompt recomendado

```
Continuamos FASE 3A en la rama feature/fase-3a-operativa.

Lee primero:
- docs/fase-3a/DIAGNOSTICO_ACTUAL.md
- docs/fase-3a/PLAN_IMPLEMENTACION_FASE_3A.md

Implementa la ETAPA 1 completa (no depende de Apps Script ni de Sheets):

1.1 Ampliar /api/productos para exponer stock_actual, stock_minimo,
    permite_decimal, paso_venta, unidad_medida e imagen_url. Apps Script ya
    los devuelve; los descarta el route handler.
1.2 Mostrar "Agotado" en la tienda y no permitir agregarlo (usa estaAgotado).
1.3 Aplicar el paso de 0,25 kg en el carrito (usa validarCantidad).
1.4 Filtros y buscador del panel admin segun §7.1. Los filtros por metodo y
    responsable quedan preparados pero vacios hasta la migracion.
1.5 PRIORITARIO: validar la transicion en
    src/app/api/admin/pedidos/[id]/route.ts con evaluarTransicion, para
    cerrar los hallazgos 3, 4 y 5 por el lado de Next.js.

Reglas:
- No tocar Apps Script, Google Sheets, .env ni Vercel.
- No cambiar el desplegable de estado_pago (perderia datos reales).
- Agregar tests en tests/ para cada regla nueva.
- Verificar con npm run lint, npm test y npm run build. Si el build falla con
  EBUSY sobre .next, reintentar: es un bloqueo de Dropbox, no de codigo.
- Sin push, sin deploy.
```

Alternativa si Carolina y Nadia ya respondieron: partir por la ETAPA 2 (columnas
nuevas, aditivas y sin riesgo) para dejar la planilla lista antes de la migración.
