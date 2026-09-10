'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ESTADOS_APERTURA,
  ESTADOS_MODO_PRESENCIAL,
  ESTADOS_PEDIDOS_ANTICIPADOS,
  calcularCierrePedidosPorDefecto,
} from '@/lib/fase3b/aperturas';
import {
  crearBorradorApertura,
  idAperturaDesdeFecha,
  validarAperturaEditable,
  type AperturaAdmin,
  type AperturaEditable,
} from '@/lib/fase3b/adminAperturas';

const ETIQUETA_ESTADO: Record<AperturaEditable['estado_apertura'], string> = {
  programada: 'Programada',
  activa: 'Activa',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
  por_confirmar: 'Por confirmar',
};

function nuevaClaveIdempotencia() {
  return `ape_${crypto.randomUUID().replace(/-/g, '')}`;
}

function fechaLegible(fecha: string) {
  const valor = new Date(`${fecha}T00:00:00`);
  return Number.isNaN(valor.getTime())
    ? fecha
    : valor.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function respuestaJson(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || 'La operación no pudo completarse.');
  return json.data;
}

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

const CONTROL =
  'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100';

function FormularioApertura({
  inicial,
  editando,
  ocupado,
  onCancelar,
  onGuardar,
}: {
  inicial: AperturaEditable;
  editando: boolean;
  ocupado: boolean;
  onCancelar: () => void;
  onGuardar: (apertura: AperturaEditable) => Promise<void>;
}) {
  const [form, setForm] = useState<AperturaEditable>(inicial);
  const [error, setError] = useState<string | null>(null);

  const actualizar = (campo: keyof AperturaEditable, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const cambiarFecha = (fecha: string) => {
    setForm((prev) => ({
      ...prev,
      fecha_apertura: fecha,
      apertura_id: idAperturaDesdeFecha(fecha),
      cierre_pedidos_anticipados: fecha ? calcularCierrePedidosPorDefecto(fecha) : '',
    }));
  };

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    const validacion = validarAperturaEditable(form);
    if (!validacion.ok) {
      setError(validacion.error);
      return;
    }
    setError(null);
    await onGuardar(validacion.apertura);
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border border-primary-light bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-primary-dark">
          {editando ? `Editar ${form.apertura_id}` : 'Nueva apertura'}
        </h3>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          Solo TEST
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Campo etiqueta="Fecha">
          <input
            className={CONTROL}
            type="date"
            value={form.fecha_apertura}
            disabled={editando}
            onChange={(e) => cambiarFecha(e.target.value)}
            required
          />
        </Campo>
        <Campo etiqueta="ID (derivado de la fecha)">
          <input className={CONTROL} value={form.apertura_id} disabled />
        </Campo>
        <Campo etiqueta="Hora de inicio">
          <input className={CONTROL} type="time" value={form.hora_inicio} onChange={(e) => actualizar('hora_inicio', e.target.value)} required />
        </Campo>
        <Campo etiqueta="Hora de término">
          <input className={CONTROL} type="time" value={form.hora_termino} onChange={(e) => actualizar('hora_termino', e.target.value)} required />
        </Campo>
        <Campo etiqueta="Cierre de pedidos anticipados">
          <input className={CONTROL} type="datetime-local" value={form.cierre_pedidos_anticipados} onChange={(e) => actualizar('cierre_pedidos_anticipados', e.target.value)} required />
        </Campo>
        <Campo etiqueta="Lugar / punto de retiro">
          <input className={CONTROL} value={form.lugar} onChange={(e) => actualizar('lugar', e.target.value)} placeholder="Pendiente de confirmación" />
        </Campo>
        <Campo etiqueta="Estado de apertura">
          <select className={CONTROL} value={form.estado_apertura} onChange={(e) => actualizar('estado_apertura', e.target.value)}>
            {ESTADOS_APERTURA.map((estado) => <option key={estado} value={estado}>{ETIQUETA_ESTADO[estado]}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Pedidos anticipados">
          <select className={CONTROL} value={form.pedidos_anticipados_estado} onChange={(e) => actualizar('pedidos_anticipados_estado', e.target.value)}>
            {ESTADOS_PEDIDOS_ANTICIPADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Modo presencial">
          <select className={CONTROL} value={form.modo_presencial_estado} onChange={(e) => actualizar('modo_presencial_estado', e.target.value)}>
            {ESTADOS_MODO_PRESENCIAL.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Mensaje público">
          <input className={CONTROL} value={form.mensaje_publico} onChange={(e) => actualizar('mensaje_publico', e.target.value)} />
        </Campo>
        <div className="md:col-span-2">
          <Campo etiqueta="Observaciones internas">
            <textarea className={`${CONTROL} min-h-20`} value={form.observaciones_internas} onChange={(e) => actualizar('observaciones_internas', e.target.value)} />
          </Campo>
        </div>
      </div>

      {editando && (
        <p className="mt-3 text-xs text-gray-400">
          La fecha y el ID no se cambian: para mover una apertura, crea la nueva y cierra la anterior.
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={ocupado} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {ocupado ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancelar} disabled={ocupado} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function CalendarioAperturasAdmin() {
  const [aperturas, setAperturas] = useState<AperturaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<'nuevo' | string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/aperturas', { cache: 'no-store' });
      const data = await respuestaJson(res);
      setAperturas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarNueva = async (apertura: AperturaEditable) => {
    setOcupado(true);
    try {
      const res = await fetch('/api/admin/aperturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apertura, idempotency_key: nuevaClaveIdempotencia() }),
      });
      await respuestaJson(res);
      setFormulario(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la apertura.');
    } finally {
      setOcupado(false);
    }
  };

  const guardarEdicion = async (actual: AperturaAdmin, apertura: AperturaEditable) => {
    setOcupado(true);
    try {
      const res = await fetch(`/api/admin/aperturas/${encodeURIComponent(actual.apertura_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apertura,
          actualizado_en_esperado: actual.actualizado_en,
          idempotency_key: nuevaClaveIdempotencia(),
        }),
      });
      await respuestaJson(res);
      setFormulario(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo editar la apertura.');
    } finally {
      setOcupado(false);
    }
  };

  const cerrar = async (apertura: AperturaAdmin) => {
    if (!window.confirm(`¿Cerrar la apertura ${apertura.apertura_id}?`)) return;
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/aperturas/${encodeURIComponent(apertura.apertura_id)}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_apertura: 'cerrada',
          actualizado_en_esperado: apertura.actualizado_en,
          idempotency_key: nuevaClaveIdempotencia(),
        }),
      });
      await respuestaJson(res);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la apertura.');
    } finally {
      setOcupado(false);
    }
  };

  const aperturaEditada = aperturas.find((a) => a.apertura_id === formulario);

  return (
    <section className="mt-10 border-t border-primary-light pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-primary-dark">Calendario de aperturas</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">TEST</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Gestión conectada exclusivamente al backend TEST.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} disabled={cargando || ocupado} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-white disabled:opacity-50">Actualizar</button>
          <button onClick={() => setFormulario('nuevo')} disabled={ocupado} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">Nueva apertura</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {formulario === 'nuevo' && (
        <div className="mb-5">
          <FormularioApertura inicial={crearBorradorApertura()} editando={false} ocupado={ocupado} onCancelar={() => setFormulario(null)} onGuardar={guardarNueva} />
        </div>
      )}

      {aperturaEditada && (
        <div className="mb-5">
          <FormularioApertura inicial={aperturaEditada} editando ocupado={ocupado} onCancelar={() => setFormulario(null)} onGuardar={(valor) => guardarEdicion(aperturaEditada, valor)} />
        </div>
      )}

      {cargando ? (
        <p className="py-8 text-center text-sm text-gray-400">Cargando aperturas TEST...</p>
      ) : aperturas.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          No hay aperturas. Si la hoja aún no existe, ejecuta primero la preparación manual en Apps Script TEST.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {aperturas.map((apertura) => (
            <article key={apertura.apertura_id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-primary-dark">{fechaLegible(apertura.fecha_apertura)}</h3>
                  <p className="text-xs text-gray-400">{apertura.apertura_id}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{ETIQUETA_ESTADO[apertura.estado_apertura]}</span>
              </div>
              <dl className="mt-4 space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between gap-3"><dt>Horario</dt><dd>{apertura.hora_inicio}–{apertura.hora_termino}</dd></div>
                <div className="flex justify-between gap-3"><dt>Lugar</dt><dd className="text-right">{apertura.lugar || 'Pendiente'}</dd></div>
                <div className="flex justify-between gap-3"><dt>Cierre pedidos</dt><dd>{apertura.cierre_pedidos_anticipados}</dd></div>
                <div className="flex justify-between gap-3"><dt>Pedidos anticipados</dt><dd>{apertura.pedidos_anticipados_estado}</dd></div>
                <div className="flex justify-between gap-3"><dt>Modo presencial</dt><dd>{apertura.modo_presencial_estado}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <button onClick={() => setFormulario(apertura.apertura_id)} disabled={ocupado} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-primary-dark hover:bg-gray-50 disabled:opacity-50">Editar</button>
                {apertura.estado_apertura !== 'cerrada' && apertura.estado_apertura !== 'cancelada' && (
                  <button onClick={() => cerrar(apertura)} disabled={ocupado} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Cerrar apertura</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
