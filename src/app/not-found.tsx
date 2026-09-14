import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Error 404</p>
      <h1 className="mt-3 font-serif text-4xl font-bold text-primary-dark">Página no encontrada</h1>
      <p className="mt-4 text-gray-700">La dirección puede haber cambiado o no existir.</p>
      <Link className="mt-8 rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-dark" href="/">
        Volver al inicio
      </Link>
    </section>
  );
}
