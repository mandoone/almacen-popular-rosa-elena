'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-bold">No pudimos cargar esta página</h1>
          <p className="mt-4">Intenta nuevamente. Si el problema continúa, vuelve al inicio.</p>
          <button className="mt-8 rounded-lg bg-green-800 px-5 py-3 font-semibold text-white" onClick={reset} type="button">
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
