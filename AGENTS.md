# AGENTS.md — Instrucciones para Claude Code

Guía operativa para trabajar en el proyecto **Web Almacén Popular Rosa Elena Morales**.
Este archivo es la puerta de entrada: léelo antes de empezar cualquier tarea.

---

## 1. Qué es este proyecto

Sitio web de un **almacén comunitario sin fines de lucro** (Población Juan Antonio
Ríos, Independencia, Santiago de Chile). Funciona como **escaparate + toma de
pedidos**. Los vecinos ven el catálogo, arman un carrito y envían su pedido; lo
retiran los sábados de apertura.

- **Stack:** Next.js 14 (App Router) · TypeScript · React 18 · Tailwind CSS 3.4
- **Catálogo:** hoy se lee desde una Google Sheet publicada como CSV (solo lectura).
- **Problema central:** los pedidos viven en `localStorage` del cliente, por lo que
  el panel `/admin` no los ve desde otros dispositivos. Resolverlo es la prioridad.

Para el detalle vivo del estado, ver `docs/PROJECT_STATE.md`.

---

## 2. Metodología — arnés liviano, sin SDD

- **Arnés liviano:** documentación viva mínima en `docs/`, sin un framework pesado
  de especificación.
- **Sin SDD** (Spec-Driven Development): no se redactan especificaciones formales
  exhaustivas antes de implementar. Se documenta lo necesario para conservar
  contexto y decisiones.
- **Claude Code implementa**, Git registra los cambios, los `.md` conservan el
  contexto del proyecto.

---

## 3. Trabajo por fases

El proyecto avanza por fases. Una fase = una rama = un foco. No mezclar tareas de
fases distintas en la misma rama.

| Fase | Objetivo |
|------|----------|
| FASE 0 | Ordenar repo y documentación viva. |
| FASE 1 | Pedidos reales en Google Sheets + Apps Script + Admin funcional. |
| FASE 2 | Panel vendedor. |
| FASE 3 | Productos, precios y stock. |
| FASE 4 | Compras y abastecimiento. |
| FASE 5 | Caja y reportes. |

El estado y backlog de cada fase vive en `docs/TASKS.md`.

---

## 4. Mapa de la documentación (`docs/`)

Cada hecho vive en **un solo** archivo. No duplicar información entre documentos:
enlaza en lugar de copiar.

| Archivo | Contenido | No poner aquí |
|---------|-----------|---------------|
| `AGENTS.md` | Instrucciones para el agente, metodología, comandos. | Estado detallado, requisitos. |
| `docs/PROJECT_STATE.md` | Estado vivo: qué funciona, fase activa. | Requisitos completos, datos. |
| `docs/REQUIREMENTS.md` | Requerimientos por perfil y fase. | Estado, decisiones. |
| `docs/DATA_MODEL.md` | Estructura de datos (Sheets, hojas, reglas). | Tareas, requisitos. |
| `docs/TASKS.md` | Tareas vivas y backlog por fase. | Decisiones cerradas. |
| `docs/DECISIONS.md` | Decisiones cerradas (ADRs cortos). | Tareas abiertas. |
| `docs/TEST_PLAN.md` | Pruebas manuales por funcionalidad/fase. | Requisitos. |
| `docs/CHANGELOG.md` | Hitos cronológicos. | Detalle de tareas. |

---

## 5. Regla de no duplicar documentación

- Un dato → un único archivo dueño. Los demás lo **referencian**, no lo copian.
- Si una información cambia, se actualiza en su archivo dueño y nada más.
- Antes de escribir algo nuevo, comprueba si ya existe en otro `.md` y enlázalo.

---

## 6. Comandos útiles

```bash
npm run dev      # servidor de desarrollo (http://localhost:3000)
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint

git switch -c fase-N/descripcion   # nueva rama de fase
git status --short
git diff --stat
```

---

## 7. Reglas de trabajo para el agente

- **Ramas:** nunca trabajar directo sobre `main`. Una rama por fase
  (`fase-N/descripcion`).
- **Commits:** no commitear sin que la persona revise el diff primero. No hacer
  `push` salvo petición explícita.
- **Código:** no tocar `src/` en tareas de documentación. No instalar dependencias
  ni modificar `package.json` salvo necesidad real y acordada.
- **Secretos:** nunca exponer valores de variables de entorno, tokens ni URLs
  privadas. Si aparece un `.env`, mostrar solo nombres de variables.
- **Documentación viva:** mantener `docs/` actualizado. Al terminar una tarea
  relevante, reflejar el avance en `PROJECT_STATE.md`, `TASKS.md` y, si hay hito,
  en `CHANGELOG.md`. Las decisiones cerradas van a `DECISIONS.md`.

---

## 8. Obligación de mantener docs actualizados

Toda tarea que cambie el estado del proyecto **debe** actualizar la documentación
viva en el mismo trabajo:

1. `PROJECT_STATE.md` — reflejar el nuevo estado.
2. `TASKS.md` — marcar tareas hechas / abrir nuevas.
3. `DECISIONS.md` — registrar decisiones cerradas.
4. `TEST_PLAN.md` — añadir/ajustar pruebas.
5. `CHANGELOG.md` — anotar el hito.

Documentación desactualizada se considera trabajo incompleto.
