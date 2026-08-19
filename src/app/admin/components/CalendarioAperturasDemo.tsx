'use client';

/**
 * Demo local del calendario de aperturas (FASE 3B).
 *
 * Solo se renderiza dentro del modo demo de `/admin` (`esModoDemoAdmin`, ver
 * `src/lib/fase3a/adminDemo.ts` y `src/app/admin/page.tsx`), que ya exige
 * `NODE_ENV=development` y `?demo=1`. Este componente no llama a ninguna API,
 * no lee ni escribe Google Sheets, no depende de variables de entorno reales
 * y no requiere credenciales: solo usa datos simulados y funciones puras de
 * `src/lib/fase3b/`.
 *
 * Etapa 2 de docs/fase-3b/PLAN_IMPLEMENTACION_FASE_3B.md.
 */

import {
  estaDentroDeHorario,
  haTerminadoApertura,
  puedeRecibirPedidoAnticipado,
  puedeUsarModoPresencial,
  seleccionarAperturaRelevante,
  type Apertura,
} from '@/lib/fase3b/aperturas';
import {
  AHORA_DEMO,
  crearAperturasDemo,
} from '@/lib/fase3b/aperturasDemoData';
import {
  COMPORTAMIENTO_ESTADO_PUBLICO,
  obtenerEstadoPublicoWeb,
} from '@/lib/fase3b/estadoPublicoWeb';
import {
  ORIGENES_PEDIDO,
  canalPorOrigen,
  esOrigenPresencial,
} from '@/lib/fase3b/origenPedido';

const ETIQUETA_ESTADO_APERTURA: Record<Apertura['estado_apertura'], string> = {
  programada: 'Programada',
  activa: 'Activa',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
  por_confirmar: 'Por confirmar',
};

const BADGE_ESTADO_APERTURA: Record<Apertura['estado_apertura'], string> = {
  programada: 'bg-blue-100 text-blue-700',
  activa: 'bg-green-100 text-green-700',
  cerrada: 'bg-gray-200 text-gray-600',
  cancelada: 'bg-red-100 text-red-700',
  por_confirmar: 'bg-gray-100 text-gray-500',
};

const BADGE_ESTADO_PUBLICO: Record<string, string> = {
  sin_apertura_programada: 'bg-gray-100 text-gray-500',
  pedido_anticipado_activo: 'bg-green-100 text-green-700',
  pedido_anticipado_cerrado: 'bg-orange-100 text-orange-700',
  modo_presencial_activo: 'bg-purple-100 text-purple-700',
  apertura_cerrada: 'bg-gray-200 text-gray-600',
  apertura_cancelada: 'bg-red-100 text-red-700',
};

function formatFechaDemo(fechaISO: string) {
  const d = new Date(fechaISO + 'T00:00:00');
  if (isNaN(d.getTime())) return fechaISO;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function FilaCampo({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{etiqueta}</span>
      <span className="text-gray-700 text-right">{valor}</span>
    </div>
  );
}

function TarjetaApertura({ apertura }: { apertura: Apertura }) {
  const estadoPublico = obtenerEstadoPublicoWeb(apertura, AHORA_DEMO);
  const comportamiento = COMPORTAMIENTO_ESTADO_PUBLICO[estadoPublico];

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-semibold text-primary-dark">
          {formatFechaDemo(apertura.fecha_apertura)} · {apertura.hora_inicio}–{apertura.hora_termino}
        </p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_ESTADO_APERTURA[apertura.estado_apertura]}`}>
          {ETIQUETA_ESTADO_APERTURA[apertura.estado_apertura]}
        </span>
      </div>

      <FilaCampo etiqueta="Lugar" valor={apertura.lugar ?? '—'} />
      <FilaCampo
        etiqueta="Cierre pedidos anticipados"
        valor={apertura.cierre_pedidos_anticipados}
      />
      <FilaCampo
        etiqueta="Estado pedidos anticipados"
        valor={
          <>
            {apertura.pedidos_anticipados_estado}{' '}
            {puedeRecibirPedidoAnticipado(apertura, AHORA_DEMO) ? '(acepta ahora)' : '(no acepta ahora)'}
          </>
        }
      />
      <FilaCampo
        etiqueta="Estado modo presencial"
        valor={
          <>
            {apertura.modo_presencial_estado}{' '}
            {puedeUsarModoPresencial(apertura, AHORA_DEMO) ? '(usable ahora)' : '(no usable ahora)'}
          </>
        }
      />
      <FilaCampo
        etiqueta="Dentro de horario ahora"
        valor={estaDentroDeHorario(apertura, AHORA_DEMO) ? 'Sí' : 'No'}
      />
      <FilaCampo
        etiqueta="¿Ya terminó?"
        valor={haTerminadoApertura(apertura, AHORA_DEMO) ? 'Sí' : 'No'}
      />
      <FilaCampo etiqueta="Mensaje público" valor={apertura.mensaje_publico ?? '—'} />
      <FilaCampo etiqueta="Observaciones internas" valor={apertura.observaciones_internas ?? '—'} />

      <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-gray-400">Estado público si fuera la relevante</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_ESTADO_PUBLICO[estadoPublico]}`}>
          {estadoPublico}
        </span>
      </div>
      <p className="text-xs text-gray-400 italic">&ldquo;{comportamiento.mensajePublicoSugerido}&rdquo;</p>
    </div>
  );
}

export default function CalendarioAperturasDemo() {
  const aperturas = crearAperturasDemo();
  const seleccion = seleccionarAperturaRelevante(aperturas, AHORA_DEMO);

  const aperturaRelevante = seleccion.tipo === 'apertura' ? seleccion.apertura : null;
  const estadoPublicoRelevante = obtenerEstadoPublicoWeb(aperturaRelevante, AHORA_DEMO);
  const comportamientoRelevante = COMPORTAMIENTO_ESTADO_PUBLICO[estadoPublicoRelevante];

  return (
    <div className="mt-10 border-t-2 border-dashed border-purple-200 pt-8">
      <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
        <strong>Demo local — Fase 3B, Etapa 2.</strong> Calendario de aperturas
        con datos simulados. No llama a ninguna API, no lee ni escribe Google
        Sheets, no modifica pedidos ni stock reales. Instante de referencia
        fijo (no es la hora real): <code>{AHORA_DEMO}</code>.
      </div>

      <h2 className="font-serif text-xl font-bold text-primary-dark mb-4">
        Calendario de aperturas (Fase 3B, demo)
      </h2>

      {/* 1 y 2: apertura relevante actual + estado público calculado */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-primary-dark mb-3">Apertura relevante ahora</h3>

        {seleccion.tipo === 'ninguna' && (
          <p className="text-sm text-gray-500">
            No hay ninguna apertura relevante en este momento (criterio F.3, sin candidatas).
          </p>
        )}

        {seleccion.tipo === 'conflicto' && (
          <div className="text-sm text-red-600">
            <p className="font-semibold">Conflicto: {seleccion.motivo}</p>
            <p className="text-gray-500 mt-1">
              {seleccion.candidatas.length} apertura(s) empatadas — no se elige una al azar
              (criterio F.3 aprobado). Requiere revisión en el panel real.
            </p>
          </div>
        )}

        {aperturaRelevante && (
          <div className="flex flex-col gap-3">
            <FilaCampo
              etiqueta="Apertura elegida"
              valor={`${aperturaRelevante.apertura_id} — ${formatFechaDemo(aperturaRelevante.fecha_apertura)}`}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Estado público calculado</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_ESTADO_PUBLICO[estadoPublicoRelevante]}`}>
                {estadoPublicoRelevante}
              </span>
            </div>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              <li>Ve catálogo: {comportamientoRelevante.puedeVerCatalogo ? 'sí' : 'no'}</li>
              <li>Puede pedir anticipado: {comportamientoRelevante.puedeHacerPedidoAnticipado ? 'sí' : 'no'}</li>
              <li>Puede usar comanda presencial: {comportamientoRelevante.puedeUsarComandaDigitalPresencial ? 'sí' : 'no'}</li>
            </ul>
            <p className="text-sm text-gray-500 italic">&ldquo;{comportamientoRelevante.mensajePublicoSugerido}&rdquo;</p>
          </div>
        )}
      </div>

      {/* 3–9: lista de aperturas simuladas con sus campos */}
      <h3 className="font-semibold text-primary-dark mb-3">Aperturas simuladas ({aperturas.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {aperturas.map((apertura) => (
          <TarjetaApertura key={apertura.apertura_id} apertura={apertura} />
        ))}
      </div>

      {/* 10: origen/canal derivados, como referencia */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-primary-dark mb-3">
          Origen de pedido → canal (referencia)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-1 pr-3 font-medium">origen_pedido</th>
              <th className="py-1 pr-3 font-medium">canal derivado</th>
              <th className="py-1 font-medium">¿Presencial?</th>
            </tr>
          </thead>
          <tbody>
            {ORIGENES_PEDIDO.map((origen) => (
              <tr key={origen} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5 pr-3 text-gray-700">{origen}</td>
                <td className="py-1.5 pr-3 text-gray-700">{canalPorOrigen(origen)}</td>
                <td className="py-1.5 text-gray-700">{esOrigenPresencial(origen) ? 'sí' : 'no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-3">
          Solo referencia: ningún pedido simulado usa esto todavía. `canal` se
          deriva de `origen_pedido`, nunca se ingresan por separado
          (docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md §C).
        </p>
      </div>
    </div>
  );
}
