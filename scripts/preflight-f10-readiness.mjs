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

const RESULTADOS = new Set(['READY', 'PENDING', 'FAIL', 'NOT_APPLICABLE']);
const CAMPOS_CHECK = new Set([
  'resultado', 'fecha', 'responsable', 'evidencia', 'observaciones', 'referencia',
]);

function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function validarManifiestoF10(manifiesto) {
  const errores = [];
  if (!manifiesto || typeof manifiesto !== 'object' || Array.isArray(manifiesto)) {
    return { valido: false, estado: 'FAIL', errores: ['El manifiesto debe ser un objeto JSON.'], resumen: {} };
  }
  if (manifiesto.version !== 2) errores.push('version debe ser 2; migrar el manifiesto F10 local.');
  if (manifiesto.fecha_corte != null && !fechaValida(manifiesto.fecha_corte)) {
    errores.push('fecha_corte debe ser nula o una fecha real en formato yyyy-MM-dd.');
  }
  const checks = manifiesto.checks;
  if (!checks || typeof checks !== 'object' || Array.isArray(checks)) {
    errores.push('checks debe ser un objeto.');
  }
  const resumen = { READY: 0, PENDING: 0, FAIL: 0, NOT_APPLICABLE: 0 };
  for (const nombre of CHECKS_F10) {
    const check = checks?.[nombre];
    if (!check || typeof check !== 'object' || Array.isArray(check) || !RESULTADOS.has(check.resultado)) {
      errores.push(`${nombre}: resultado inválido o ausente.`);
      continue;
    }
    if (Object.keys(check).some((campo) => !CAMPOS_CHECK.has(campo))) {
      errores.push(`${nombre}: campos no reconocidos.`);
    }
    for (const campo of ['evidencia', 'responsable', 'observaciones', 'referencia']) {
      if (check[campo] !== undefined &&
          (typeof check[campo] !== 'string' || check[campo].length > 500)) {
        errores.push(`${nombre}: ${campo} debe ser texto de máximo 500 caracteres.`);
      }
    }
    if (check.fecha !== undefined && !fechaValida(check.fecha)) {
      errores.push(`${nombre}: fecha inválida.`);
    }
    if (check.resultado !== 'PENDING') {
      for (const campo of ['fecha', 'responsable', 'evidencia', 'referencia']) {
        if (!check[campo] || !String(check[campo]).trim()) {
          errores.push(`${nombre}: ${check.resultado} exige ${campo}.`);
        }
      }
    }
    if (check.resultado === 'NOT_APPLICABLE' && !String(check.observaciones ?? '').trim()) {
      errores.push(`${nombre}: NOT_APPLICABLE exige justificación en observaciones.`);
    }
    resumen[check.resultado] += 1;
  }
  const extras = Object.keys(checks ?? {}).filter((nombre) => !CHECKS_F10.includes(nombre));
  if (extras.length) errores.push('checks contiene claves no reconocidas.');
  if (resumen.PENDING === 0 && resumen.FAIL === 0 &&
      !fechaValida(manifiesto.fecha_corte)) {
    errores.push('fecha_corte real obligatoria antes de READY.');
  }
  const estado = errores.length || resumen.FAIL ? 'FAIL' : resumen.PENDING ? 'PENDING' : 'READY';
  return { valido: errores.length === 0, estado, errores, resumen };
}

function argumentoArchivo() {
  const indice = process.argv.indexOf('--file');
  return indice >= 0 ? process.argv[indice + 1] : 'config/f10-readiness.local.json';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const ruta = argumentoArchivo();
  const estricto = process.argv.includes('--strict');
  if (!ruta) {
    console.error('FAIL | --file exige una ruta de manifiesto');
    process.exitCode = 1;
  } else if (!existsSync(ruta)) {
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
        console.log(`F10 | ready=${resultado.resumen.READY} pending=${resultado.resumen.PENDING} fail=${resultado.resumen.FAIL} n/a=${resultado.resumen.NOT_APPLICABLE}`);
        const noListos = CHECKS_F10.filter((nombre) =>
          ['PENDING', 'FAIL'].includes(manifiesto.checks[nombre].resultado));
        console.log(`${resultado.estado} | manifiesto F10 ${resultado.estado === 'READY' ? 'completo; requiere aprobación humana de Go' : `no habilita Go: ${noListos.join(', ')}`}`);
        if (resultado.estado === 'FAIL' || (estricto && resultado.estado !== 'READY')) {
          process.exitCode = 1;
        }
      }
    }
  }
}
