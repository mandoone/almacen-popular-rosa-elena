import Image from "next/image";

const fotos = [
  { src: "/images/rosa-elena-1.jpg", caption: "Rosa Elena Morales Morales" },
  { src: "/images/rosa-elena-2.jpg", caption: "Junto a la comunidad" },
  { src: "/images/rosa-elena-3.jpg", caption: "Trabajo organizativo" },
  { src: "/images/rosa-elena-4.jpg", caption: "Memoria presente" },
];

const legado = [
  {
    title: "Junta de Abastecimiento",
    desc: "Dirigió la distribución justa de alimentos durante la Unidad Popular",
  },
  {
    title: "Organización popular",
    desc: "Construyó tejido comunitario en la Población Juan Antonio Ríos",
  },
  {
    title: "Memoria viva",
    desc: "Su nombre inspira el almacén que hoy alimenta a la comunidad",
  },
];

export default function RosaElenaPage() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO */}
      <section className="bg-primary-dark text-white py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-serif font-bold text-white text-4xl sm:text-5xl mb-4">
          Rosa Elena Morales Morales
        </h1>
        <p className="text-xl sm:text-2xl font-medium mb-6">
          Dirigenta vecinal • Luchadora popular • Detenida desaparecida
        </p>
        <p className="text-primary-light text-lg sm:text-xl tracking-widest font-semibold">
          1930 — 18 de agosto de 1976
        </p>
      </section>

      {/* 2. GALERÍA */}
      <section className="bg-background py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center text-primary-dark mb-12">
            Su rostro, nuestra memoria
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {fotos.map((foto, index) => (
              <div key={index} className="flex flex-col items-center group w-full max-w-[300px]">
                <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg mb-3">
                  <Image
                    src={foto.src}
                    alt={foto.caption}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
                <p className="text-primary font-medium text-sm text-center">
                  {foto.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SU HISTORIA */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-10 text-center">
            Quién fue Rosa Elena
          </h2>
          <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
            <p>
              Rosa Elena Morales Morales fue una destacada dirigenta vecinal de la Población Juan Antonio Ríos, en Santiago de Chile. Militante del Partido Comunista, ocupó el cargo de Secretaria del Comité local Juan Antonio Ríos de dicha organización.
            </p>
            <p>
              Durante el gobierno del Presidente Salvador Allende, Rosa Elena asumió un rol fundamental en el abastecimiento popular: fue Secretaria del Ministro del Trabajo y dirigenta de la Junta de Abastecimiento y Control de Precios (JAP), organismos creados para garantizar el acceso a productos básicos a precios justos para el pueblo.
            </p>
            <p>
              Tras el golpe de Estado del 11 de septiembre de 1973, Rosa Elena continuó su labor organizativa clandestina en la población. El 18 de agosto de 1976, fue secuestrada por agentes de la DINA — la policía secreta de la dictadura de Pinochet — y desde entonces permanece como detenida desaparecida. Tenía 44 años.
            </p>
            <p>
              Su figura representa a las miles de mujeres que sostuvieron la vida comunitaria, el cuidado y la organización popular, trabajo históricamente invisibilizado pero esencial. Hoy, el Almacén Popular lleva su nombre como homenaje a ella y a todas las mujeres de nuestra población.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SU LEGADO */}
      <section className="bg-primary-light py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center text-primary-dark mb-12">
            Su legado vive en nuestra comunidad
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {legado.map(({ title, desc }) => (
              <div key={title} className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-xl text-primary-dark mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CITA FINAL */}
      <section className="bg-primary-dark py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-4xl mx-auto">
          <blockquote className="font-serif text-2xl sm:text-3xl text-white italic leading-snug mb-8">
            &ldquo;En su figura homenajeamos a las mujeres de nuestra población, quienes históricamente han asumido la tarea de cuidados y abastecimiento del hogar.&rdquo;
          </blockquote>
          <p className="text-primary-light text-lg font-medium tracking-wide">
            — Almacén Popular Rosa Elena Morales Morales, agosto 2020
          </p>
        </div>
      </section>
    </div>
  );
}
