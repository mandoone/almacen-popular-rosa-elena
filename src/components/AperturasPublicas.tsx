import {
  HORARIO_APERTURAS,
  LUGAR_APERTURAS,
  obtenerAperturasPublicasFuturas,
} from '@/lib/fase9/contenidoPublico';

export default function AperturasPublicas({ conBorde = false }: { conBorde?: boolean }) {
  const aperturas = obtenerAperturasPublicasFuturas();

  return (
    <div>
      <p className="text-primary-dark/80 font-medium text-lg">
        Horario {HORARIO_APERTURAS}
      </p>
      <p className="mt-1 text-primary-dark/70">{LUGAR_APERTURAS}</p>
      {aperturas.length > 0 ? (
        <div
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Fechas futuras de apertura"
        >
          {aperturas.map((apertura) => (
            <time
              key={apertura.fechaIso}
              dateTime={apertura.fechaIso}
              className={`rounded-lg bg-white/70 px-3 py-3 text-center text-sm font-semibold text-primary-dark ${
                conBorde ? 'border border-primary-dark/10' : ''
              }`}
            >
              {apertura.fechaVisible}
            </time>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-lg bg-white/70 px-4 py-3 text-primary-dark">
          Las próximas fechas se informarán por los canales de contacto del almacén.
        </p>
      )}
    </div>
  );
}
