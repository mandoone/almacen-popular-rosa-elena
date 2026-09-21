export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-6 text-center text-primary-dark"
      role="status"
      aria-live="polite"
    >
      <p className="font-medium">Cargando contenido…</p>
    </div>
  );
}
