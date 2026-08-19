/**
 * env.ts — Detección de entorno y guardrails puros para no escribir por error
 * en datos productivos.
 *
 * Fuente de verdad operativa: docs/fase-3b/ENTORNO_TEST_FASE_3B.md
 *
 * IMPORTANTE — este módulo es PURO. No lee `process.env` por sí mismo (mismo
 * criterio que `esModoDemoAdmin` en `src/lib/fase3a/adminDemo.ts`): quien lo
 * llame le pasa el valor ya leído, para que sea 100% testeable sin variables
 * de entorno reales y sin llamadas de red.
 *
 * Usado por `src/lib/appsScriptPedidos.ts` (`resolverConfigPorEntorno`) para
 * elegir entre las variables productivas y las `_TEST` según
 * `NEXT_PUBLIC_APP_ENV`. Ese archivo es el único punto de integración real;
 * ninguna ruta de `src/app/api/` importa este módulo directamente.
 *
 * Principio de diseño: por defecto, NADA es seguro. Un valor vacío,
 * desconocido o mal escrito nunca se trata como "test" ni como "seguro para
 * escribir" — hay que declarar el entorno explícitamente para habilitar
 * cualquier permiso.
 */

export const ENTORNOS_APLICACION = ['production', 'test', 'demo', 'local', 'desconocido'] as const;

export type EntornoAplicacion = (typeof ENTORNOS_APLICACION)[number];

/** Etiqueta visible para UI (guardrail: identificación visual clara del entorno). */
export const ETIQUETA_ENTORNO: Record<EntornoAplicacion, string> = {
  production: 'Producción',
  test: 'TEST',
  demo: 'Demo',
  local: 'Local',
  desconocido: 'Entorno desconocido',
};

/**
 * Normaliza el valor crudo de una variable de entorno (por ejemplo,
 * `NEXT_PUBLIC_APP_ENV`) a un `EntornoAplicacion` conocido.
 *
 * Cualquier valor que no sea exactamente uno de los cuatro conocidos
 * (`production`, `test`, `demo`, `local`, sin distinguir mayúsculas ni
 * espacios extremos) se normaliza a `'desconocido'`. Un valor ausente
 * también es `'desconocido'` — nunca se asume `'production'` ni `'test'`
 * por defecto.
 */
export function obtenerEntornoAplicacion(valor: string | undefined): EntornoAplicacion {
  const normalizado = String(valor ?? '').trim().toLowerCase();
  if (
    normalizado === 'production' ||
    normalizado === 'test' ||
    normalizado === 'demo' ||
    normalizado === 'local'
  ) {
    return normalizado;
  }
  return 'desconocido';
}

/**
 * `true` si el entorno es uno donde probar cosas (ver datos simulados, correr
 * una demo, apuntar a una copia TEST) es aceptable. `production` y
 * `desconocido` nunca son seguros — un entorno sin declarar se trata como el
 * más restrictivo, no como el más permisivo.
 */
export function esEntornoSeguroParaPruebas(entorno: EntornoAplicacion): boolean {
  return entorno === 'test' || entorno === 'demo' || entorno === 'local';
}

/**
 * `true` si este entorno necesita que exista configuración TEST (URL, token,
 * etc.) para funcionar. Hoy solo `'test'` la necesita: `'demo'` no llama a
 * ningún backend (vive en memoria) y `'local'` sin más contexto no implica
 * por sí solo que se vaya a escribir contra una copia TEST.
 */
export function requiereConfigTest(entorno: EntornoAplicacion): boolean {
  return entorno === 'test';
}

export interface ResultadoValidacionConfigTest {
  valido: boolean;
  faltantes: readonly string[];
}

/**
 * Valida que un mapa de configuración (por ejemplo, un subconjunto ya leído
 * de `process.env`) tenga todas las claves requeridas con un valor no vacío.
 *
 * No compara valores contra nada productivo ni sabe qué son "correctos": solo
 * detecta ausencias. Sirve para fallar temprano y con un mensaje claro en vez
 * de un error críptico de red cuando falta una variable TEST.
 */
export function validarConfigEntornoTest(
  config: Readonly<Record<string, string | undefined>>,
  clavesRequeridas: readonly string[]
): ResultadoValidacionConfigTest {
  const faltantes = clavesRequeridas.filter((clave) => {
    const valor = config[clave];
    return valor === undefined || valor.trim() === '';
  });
  return { valido: faltantes.length === 0, faltantes };
}

/**
 * Guardrail de última línea: lanza si el entorno no está explícitamente
 * autorizado a escribir datos de prueba.
 *
 * Solo `'test'` y `'local'` pasan. `'production'` siempre bloquea —
 * literalmente su propósito. `'demo'` también bloquea a propósito: el modo
 * demo no debería llegar nunca a un punto que llame a esta función, así que
 * si lo hace, es una señal de que algo está mal conectado, no un permiso a
 * otorgar. `'desconocido'` bloquea por el mismo principio de "nada es seguro
 * por defecto" del resto del módulo.
 *
 * Pensada para usarse como primera línea de cualquier función futura que
 * escriba contra un backend TEST real — no está conectada a ninguna todavía.
 */
export function assertNoProduccionParaEscritura(entorno: EntornoAplicacion): void {
  if (entorno === 'test' || entorno === 'local') return;
  throw new Error(
    `Escritura bloqueada: entorno "${entorno}" no está autorizado para escribir datos de prueba. ` +
      'Solo "test" o "local" pueden escribir aquí. "production" nunca; "demo" no debería alcanzar ' +
      'este punto porque el modo demo no llama a ningún backend.'
  );
}

export type ResolucionValorPorEntorno =
  | { ok: true; valor: string }
  | { ok: false; error: string };

/**
 * Resuelve qué valor de configuración usar (URL de backend, token admin,
 * etc.) según el entorno declarado. Pura: no lee `process.env`, no hace
 * llamadas de red — recibe los valores ya leídos por quien llama
 * (`src/lib/appsScriptPedidos.ts`).
 *
 * Compone los guardrails ya definidos arriba en vez de duplicar su lógica:
 *
 * - Si `!requiereConfigTest(entorno)` (production, desconocido, demo, local):
 *   usa `valorProduccion` tal cual, **sin ningún cambio de comportamiento**.
 *   Si falta, error explícito con el nombre de la variable — mismo
 *   comportamiento que existía antes de que este módulo existiera.
 * - Si `entorno === 'test'`: pasa por `assertNoProduccionParaEscritura`
 *   (defensa en profundidad: si algún día se llama a esta función fuera de
 *   la rama `test`, falla ruidosamente en vez de filtrar configuración de
 *   prueba) y por `validarConfigEntornoTest` para exigir `valorTest`. Si
 *   `valorTest` coincide con `valorProduccion` (ambos presentes y no
 *   vacíos), error explícito: TEST nunca puede apuntar al mismo backend que
 *   producción, aunque alguien haya configurado mal las variables.
 */
export function resolverConfigPorEntorno(
  entorno: EntornoAplicacion,
  config: {
    valorProduccion: string | undefined;
    valorTest: string | undefined;
    nombreVariableProduccion: string;
    nombreVariableTest: string;
  }
): ResolucionValorPorEntorno {
  const { valorProduccion, valorTest, nombreVariableProduccion, nombreVariableTest } = config;

  if (!requiereConfigTest(entorno)) {
    if (!valorProduccion) {
      return { ok: false, error: `Falta ${nombreVariableProduccion} en el entorno del servidor.` };
    }
    return { ok: true, valor: valorProduccion };
  }

  assertNoProduccionParaEscritura(entorno);

  const { valido, faltantes } = validarConfigEntornoTest({ [nombreVariableTest]: valorTest }, [
    nombreVariableTest,
  ]);
  if (!valido) {
    return {
      ok: false,
      error:
        `Entorno TEST (NEXT_PUBLIC_APP_ENV=test) sin ${faltantes.join(', ')} configurada. ` +
        'Agrega esa variable a tu .env.local antes de usar este entorno.',
    };
  }

  if (valorProduccion && valorTest === valorProduccion) {
    return {
      ok: false,
      error:
        `${nombreVariableTest} no puede ser igual a ${nombreVariableProduccion}. ` +
        'TEST y producción no pueden apuntar al mismo backend.',
    };
  }

  return { ok: true, valor: valorTest as string };
}
