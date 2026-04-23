const formas = [
  {
    title: "Turnos de atención",
    desc: "Participa en los turnos rotativos de atención del almacén los sábados de apertura. No se requiere experiencia previa, solo ganas de ayudar.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Difusión",
    desc: "Ayuda corriendo la voz entre vecinos y vecinas, compartiendo en redes sociales y promoviendo el almacén en tu entorno.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
      </svg>
    ),
  },
  {
    title: "Comprar en el almacén",
    desc: "La forma más directa de apoyar es siendo cliente del almacén. Cada compra sostiene el proyecto y demuestra que la economía solidaria es posible.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

export default function ParticiparPage() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO */}
      <section className="bg-primary-dark text-white py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-serif font-bold text-white text-4xl sm:text-5xl mb-4 max-w-3xl leading-tight">
          Sé parte del Almacén Popular
        </h1>
        <p className="text-primary-light text-lg sm:text-xl">
          Un proyecto comunitario que necesita de cada vecino y vecina
        </p>
      </section>

      {/* 2. POR QUÉ PARTICIPAR */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-6">
            ¿Por qué sumarse?
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            El Almacén Popular funciona gracias al esfuerzo colectivo de pobladores y pobladoras que dedican su tiempo voluntariamente. Cada persona que se suma hace que este proyecto llegue a más familias y se fortalezca como herramienta de organización comunitaria.
          </p>
        </div>
      </section>

      {/* 3. FORMAS DE PARTICIPAR */}
      <section className="bg-background py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark text-center mb-12">
            ¿Cómo puedo participar?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {formas.map(({ title, desc, icon }) => (
              <div key={title} className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-4">
                <div className="w-14 h-14 bg-primary-light/30 rounded-lg flex items-center justify-center text-primary-dark">
                  {icon}
                </div>
                <h3 className="font-bold text-xl text-primary-dark">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PRÓXIMA APERTURA */}
      <section className="bg-primary-light py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-primary-dark text-2xl sm:text-3xl font-bold mb-4">
            Próximos sábados de apertura
          </h2>
          <p className="text-primary-dark font-medium text-lg mb-3">
            Abrimos 2 sábados al mes • 11:00 AM • Gamero 2670, Independencia
          </p>
          <p className="text-primary-dark/70">
            Recuerda traer tu bolsita 💜
          </p>
        </div>
      </section>

      {/* 5. CONTACTO */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-4">
            ¿Tienes preguntas?
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-10">
            Si quieres sumarte o tienes dudas, contáctanos por WhatsApp o Instagram. Estaremos felices de contarte más sobre el proyecto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/56950807172"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-green-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Escríbenos por WhatsApp
            </a>
            <a
              href="https://instagram.com/almacenpopular.rosamoralesm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-primary text-white font-semibold px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Síguenos en Instagram
            </a>
          </div>
        </div>
      </section>

      {/* 6. CTA FINAL */}
      <section className="bg-primary-dark py-24 px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            Juntos construimos una comunidad más justa
          </h2>
          <p className="text-primary-light text-lg">
            Almacén Popular Rosa Elena Morales Morales • Población Juan Antonio Ríos • Independencia
          </p>
        </div>
      </section>
    </div>
  );
}
