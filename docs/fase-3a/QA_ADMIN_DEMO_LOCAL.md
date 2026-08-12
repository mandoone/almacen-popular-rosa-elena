# QA_ADMIN_DEMO_LOCAL.md — Verificación del panel admin en modo demo

> Fecha de revisión: **2026-08-11**
>
> Rama: `feature/fase-3a-operativa`
>
> Resultado: **QA local aprobado para el modo demo**

---

## 1. Alcance

Se revisó manualmente el panel admin de Fase 3A usando datos simulados en memoria.
El objetivo fue comprobar la presentación de estados y acciones sin consultar ni
modificar Google Sheets real o Apps Script productivo.

Este QA valida la interfaz y el aislamiento del modo demo. No valida la integración
HTTP real, los conflictos `409` ni el movimiento de stock en Apps Script.

## 2. Versión revisada

Commits técnicos incluidos:

| Commit | Descripción |
|---|---|
| `69681f1` | `feat: alinear acciones admin con flujo fase 3a` |
| `c94ad34` | `feat: completar acciones admin fase 3a` |
| `a64a4e6` | `test: agregar modo local controlado para admin fase 3a` |

URL local utilizada:

```text
http://localhost:3000/admin?demo=1
```

La página mostró el aviso **“Modo demo local”**, confirmando que se había activado
el fixture de desarrollo y no el flujo real.

## 3. Estados revisados

El fixture presentó un pedido por cada caso necesario:

- `recibido`
- `pendiente`
- `listo`
- `entregado`
- `cancelado`
- `revision_manual`, como estado desconocido

## 4. Acciones visibles verificadas

| Estado | Acciones visibles | Resultado |
|---|---|---|
| `recibido` | Confirmar pendiente · Marcar listo · Cancelar | Correcto |
| `pendiente` | Marcar listo · Cancelar | Correcto |
| `listo` | Volver a pendiente · Entregado · Cancelar | Correcto |
| `entregado` | Ninguna acción de estado | Correcto |
| `cancelado` | Ninguna acción de estado | Correcto |
| `revision_manual` | Ninguna acción de estado | Correcto |

Las acciones simuladas funcionaron visualmente. Al recargar la página, todos los
pedidos volvieron a su estado inicial, como corresponde a un fixture en memoria.

## 5. Verificación de aislamiento

En DevTools, pestaña **Network**, se filtró por `pedidos`:

```text
0/23 requests
```

No apareció ninguna solicitud a:

```text
/api/admin/pedidos
```

Por lo tanto, durante esta revisión el panel no utilizó las rutas que conectan con
el backend de pedidos. Tampoco se tocó Google Sheets real ni Apps Script
productivo.

## 6. Observaciones pendientes

Estas observaciones no invalidan el QA del modo demo y deben resolverse en bloques
separados:

1. El footer muestra **“Morales Morales”**; corregir el texto posteriormente.
2. Revisar si el selector de pago debe deshabilitarse tanto en `cancelado` como en
   estados desconocidos.
3. Evaluar agregar el filtro **“Recibido”** cuando el backend real empiece a emitir
   ese estado.

## 7. Resultado

**QA local aprobado para el modo demo.**

La UI representa correctamente los seis casos revisados, no ofrece transiciones
inválidas, permite probar las acciones en memoria y no llamó al backend real de
pedidos durante la sesión.
