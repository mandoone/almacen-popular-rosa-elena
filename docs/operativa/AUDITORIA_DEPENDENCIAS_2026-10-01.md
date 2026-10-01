# Auditoría de mantenimiento — cuatro alertas

Corte 01/10/2026, commit de catálogo b998167. npm audit: 3 altas, 1 moderada, 0 críticas. Son cuatro entradas de paquetes, no cuatro CVE independientes. package.json y lockfile **sin cambios**. Informe JSON privado en operativa.local/audit-2026-10-01.json.

## Paquetes y exposición comprobada

| Entrada npm | Directo/transitivo; instalado | Ruta | Clasificación |
|---|---|---|---|
| brace-expansion, ALTA | Transitivo dev: 1.1.18 y 5.0.9, overrides vigentes | eslint → @eslint/eslintrc → minimatch 3.1.5 → 1.1.18; eslint-config-next → @typescript-eslint/parser/typescript-estree → minimatch 10.2.5 → 5.0.9 | DEV_ONLY |
| minimatch, ALTA | Transitivo dev: 3.1.5 y 10.2.5 | Mismas dos rutas; alerta heredada de brace-expansion, sin GHSA propio en esta corrida | DEV_ONLY |
| postcss, ALTA | Transitivo de producción: next/node_modules/postcss 8.4.31. La dependencia directa dev 8.5.28 está corregida | next 15.5.24 → postcss 8.4.31 | TRANSITIVA_NO_EXPUESTA en el flujo HTTP actual; BAJO_RIESGO_PARA_ESTE_PROYECTO |
| next, MODERADA | Directo runtime 15.5.24 | Hereda PostCSS; no aparece un advisory propio de Next en estas cuatro entradas | NECESITA_UPGRADE_SEPARADO para eliminar la alerta heredada; BAJO_RIESGO_PARA_ESTE_PROYECTO por exposición actual |

npm ls/npm explain y flags dev del lockfile verifican rutas y versiones. La metadata de rango de minimatch no sustituye esas versiones instaladas: el riesgo viene del override del hijo. El código no importa minimatch/brace-expansion ni recibe globs de usuarios.

PostCSS **sí se usa en build**: next/dist/build/webpack/config/blocks/css/index.js carga require('postcss'); postcss.config.mjs activa Tailwind para CSS del repositorio. No hay API de temas, upload/procesamiento de CSS ni CSS de clientes incrustado en style. src solo importa globals.css; no existe uso de dangerouslySetInnerHTML. Los trazados .nft.json del build no incluyen estos paquetes en rutas de la aplicación. Esto respalda una inferencia de ausencia de camino remoto explotable en el flujo actual, no una afirmación de que la versión sea segura.

## Advisories reales y versiones corregidas

| Paquete / GHSA y CVE | Severidad | Afectadas en las líneas instaladas | Primera corregida |
|---|---|---|---|
| brace: [q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), CVE-2026-102277 | Moderada 5.3 | <1.1.21; >=4.0.0 <5.0.12 | 1.1.21 / 5.0.12 |
| brace: [qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7), CVE-2026-102278 | Alta 7.5 | <1.1.20; >=4.0.0 <5.0.11 | 1.1.20 / 5.0.11 |
| brace: [6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), CVE-2026-102276 | Alta 7.5 | <1.1.19; >=4.0.0 <5.0.10 | 1.1.19 / 5.0.10 |
| PostCSS: [qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), CVE-2026-41305 | Moderada 6.1 | <8.5.10 | 8.5.10 |
| PostCSS: [6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q), CVE-2026-45623 | Alta 7.5 | <=8.5.11 | 8.5.12 |
| PostCSS: [fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), CVE-2026-69153 | Moderada | <=8.5.22 | 8.5.23 |
| PostCSS: [r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849), CVE-2026-73646 | Alta 7.5 | <=8.5.17 | 8.5.18 |

Las fuentes son advisories revisados enlazados por npm y publicaciones de sus mantenedores. Las correcciones conjuntas mínimas son brace 1.1.21/5.0.12 y PostCSS 8.5.23. No se confundió el PostCSS directo ya actualizado con la copia privada de Next.

## Condición vulnerable, mitigación y riesgo de cambio

**brace/minimatch:** patrones con llaves anidadas o recursivas consumen CPU/pila. La funcionalidad la usa el linter con patrones locales controlados, no formularios HTTP. Mitigación vigente: patrones del repositorio, revisión de contribuciones y CI con límite 15 minutos/permisos contents:read; no aceptar globs externos. Cambiar overrides a versiones corregidas requiere un mantenimiento separado con lint/build y lockfile revisado. Riesgo bajo: límites de expansión pueden cambiar el resultado de globs extremos. No ejecutar payloads que agoten recursos.

**PostCSS:** las lecturas de mapas requieren CSS atacante con sourceMappingURL; el XSS requiere reinsertar salida de ese CSS en HTML style. El proyecto no ofrece esas funciones. Mitigación vigente: CSS solo del código revisado; no incorporar plugins/temas no confiables ni devolver mapas/errores de procesamiento a usuarios. Si se añade procesamiento externo, REQUIERE_CORRECCIÓN_PRE_CORTE antes de habilitarlo; map:false es mitigación parcial de mapas, no soluciona XSS ni reemplaza upgrade.

**Next heredado:** npm propone next@16.3.8 con salto mayor. No se ejecutó npm audit fix ni --force. Evaluar primero una corrección acotada compatible del PostCSS de Next, o versión oficial que lo actualice, en cambio separado. Un override al hijo exige comprobar compatibilidad de plugins, CSS/sourcemaps, build y Preview; no asumir que deduplicar el PostCSS directo corrige al hijo. El salto mayor de Next tiene riesgo medio/alto por bundler, lint y contratos de caché, y exige suite/UI/API completas.

Ninguna de estas cuatro entradas demuestra una vulnerabilidad remota alcanzable hoy en esta aplicación. No se ocultan ni se marcan corregidas: siguen pendientes de mantenimiento separado, visibles en npm audit y CI. Esta clasificación no habilita Production ni reemplaza el Go/No-Go.

## Reproducción de solo lectura

```powershell
npm audit --json
npm ls postcss minimatch brace-expansion --all
npm explain brace-expansion
npm explain minimatch
git diff -- package.json package-lock.json
```

Reauditar al corte: si aparece advisory runtime propio, CSS/globs externos o nueva ruta expuesta, reclasificar y corregir antes del Go. No usar el audit crítico PASS como equivalente a cero vulnerabilidades.
