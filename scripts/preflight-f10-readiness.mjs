import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CHECKS_F10 = [
  'identidad_cuentas', 'roles_aprobados', 'contenido_editorial', 'derechos_imagenes',
  'contactos_publicos', 'dominio_https', 'stock_fisico', 'precios_venta',
  'costos_iniciales', 'saldo_efectivo', 'saldo_bancario', 'minimos_prioridades',
  'backup_sheet', 'version_apps_script', 'rollback_web', 'responsable_ventana',
  'capacitacion_venta', 'capacitacion_operacion', 'capacitacion_administracion', 'ensayo_test',
];

const ESTADOS = new Set(['ready', 'pending', 'blocked', 'not_applicable']);

export function validarManifiestoF10(manifiesto) {
  const errores = [];
  if (!manifiesto || typeof manifiesto !== 'object' || Array.isArray(manifiesto)) {
    return { valido: false, errores: ['El manifiesto debe ser un objeto JSON.'], resumen: {} };
  }
  if (manifiesto.version !== 1) errores.push('version debe ser 1.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(manifiesto.fecha_corte ?? ''))) {
    errores.push('fecha_corte debe usar yyyy-MM-dd.');
  }
  const checks = manifiesto.checks;
  if (!checks || typeof checks !== 'object' || Array.isArray(checks)) {
    errores.push('checks debe ser un objeto.');
  }
  const resumen = { ready: 0, pending: 0, blocked: 0, not_applicable: 0 };
  for (const nombre of CHECKS_F10) {
    const check = checks?.[nombre];
    if (!check || typeof check !== 'object' || !ESTADOS.has(check.estado)) {
      errores.push(`${nombre}: estado inválido o ausente.`);
      continue;
    }
    if (typeof check.evidencia !== 'string' || !check.evidencia.trim() || check.evidencia.length > 500) {
      errores.push(`${nombre}: evidencia obligatoria (máximo 500 caracteres).`);
      continue;
    }
    resumen[check.estado] += 1;
  }
  const extras = Object.keys(checks ?? {}).filter((nombre) => !CHECKS_F10.includes(nombre));
  if (extras.length) errores.push('checks contiene claves no reconocidas.');
  return { valido: errores.length === 0, errores, resumen };
}

function argumentoArchivo() {
  const indice = process.argv.indexOf('--file');
  return indice >= 0 ? process.argv[indice + 1] : 'config/f10-readiness.local.json';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const ruta = argumentoArchivo();
  const estricto = process.argv.includes('--strict');
  if (!existsSync(ruta)) {
    console.log(`PENDING | falta ${ruta}; copiar config/f10-readiness.example.json y registrar evidencias sin secretos`);
    if (estricto) process.exitCode = 1;
  } else {
    let manifiesto;
    try {
      manifiesto = JSON.parse(readFileSync(ruta, 'utf8'));
    } catch {
      console.error('FAIL | el manifiesto F10 no es JSON válido');
      process.exitCode = 1;
    }
    if (manifiesto) {
      const resultado = validarManifiestoF10(manifiesto);
      for (const error of resultado.errores) console.error(`FAIL | ${error}`);
      if (!resultado.valido) {
        process.exitCode = 1;
      } else {
        console.log(`F10 | ready=${resultado.resumen.ready} pending=${resultado.resumen.pending} blocked=${resultado.resumen.blocked} n/a=${resultado.resumen.not_applicable}`);
        const listo = resultado.resumen.ready + resultado.resumen.not_applicable === CHECKS_F10.length;
        console.log(`${listo ? 'READY' : 'BLOQUEANTE_PRODUCCION'} | manifiesto F10 ${listo ? 'completo' : 'aún no habilita Go'}`);
        if (estricto && !listo) process.exitCode = 1;
      }
    }
  }
}
