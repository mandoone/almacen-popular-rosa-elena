# CHANGELOG.md — Hitos del proyecto

> Registro cronológico de hitos relevantes. Formato simplificado estilo
> *Keep a Changelog*. El detalle de tareas vive en `docs/TASKS.md`.

---

## [FASE 0] — Documentación viva

### Añadido
- Estructura de documentación viva del proyecto (arnés liviano, sin SDD).
- `AGENTS.md`: instrucciones para Claude Code, metodología y comandos útiles.
- `docs/PROJECT_STATE.md`: estado vivo del proyecto.
- `docs/REQUIREMENTS.md`: requerimientos por perfil (comprador, vendedor,
  administrador) y por fase (0–5).
- `docs/DATA_MODEL.md`: modelo de datos; decisión de crear una Google Sheet nueva y
  exclusiva como backend operativo; hojas previstas y reglas de stock/precio.
- `docs/TASKS.md`: tareas por fase; FASE 0 detallada y FASE 1 como prioridad.
- `docs/DECISIONS.md`: decisiones cerradas (D1–D6).
- `docs/TEST_PLAN.md`: pruebas manuales actuales y futuras.
- `docs/CHANGELOG.md`: este archivo.

### Decidido
- Arnés liviano de documentación (D1) · Sin SDD (D2) · Trabajo por fases (D3).
- Backend con Google Sheets + Apps Script (D4).
- Google Sheet nueva y exclusiva para la web como fuente oficial (D5).
- Sin pagos online por ahora (D6).

### Notas
- No se modificó código de `src/` ni dependencias.
- Problema principal pendiente de resolver en FASE 1: los pedidos viven solo en
  `localStorage` y no son visibles entre dispositivos.
