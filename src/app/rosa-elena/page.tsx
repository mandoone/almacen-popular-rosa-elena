import Image from "next/image";
import { crearMetadataPublica } from "@/lib/fase10/metadataPublica";

export const metadata = crearMetadataPublica({
  title: "Rosa Elena Morales",
  description: "Memoria de Rosa Elena Morales y su vínculo con la organización comunitaria de la población Juan Antonio Ríos.",
  path: '/rosa-elena',
});

const fotos = [
  { src: "/images/rosa-elena-1.jpg", alt: "Retrato en blanco y negro de Rosa Elena Morales, de frente" },
  { src: "/images/rosa-elena-2.jpg", alt: "Retrato en blanco y negro de Rosa Elena Morales, de frente" },
  { src: "/images/rosa-elena-3.jpg", alt: "Retrato histórico en blanco y negro de Rosa Elena Morales al aire libre" },
  { src: "/images/rosa-elena-4.jpg", alt: "Retrato histórico en blanco y negro de Rosa Elena Morales sentada" },
];

const legado = [
  {
    title: "Abastecimiento y cuidados",
    desc: "Participó en las JAP junto a dueñas de casa y dirigencias vecinales, por el abastecimiento de la comunidad",
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
          Rosa Elena Morales
        </h1>
        <p className="text-xl sm:text-2xl font-medium mb-6">
          Dirigenta vecinal • Luchadora popular • Detenida desaparecida
        </p>
        <p className="text-primary-light text-lg sm:text-xl tracking-widest font-semibold">
          Detenida desaparecida desde el 18 de agosto de 1976
        </p>
      </section>

      {/* 2. GALERÍA */}
      <section className="bg-background py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center text-primary-dark mb-12">
            Su rostro, nuestra memoria
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {fotos.map((foto) => (
              <div key={foto.src} className="flex flex-col items-center group w-full max-w-[300px]">
                <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg mb-3">
                  <Image
                    src={foto.src}
                    alt={foto.alt}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
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
              Rosa Elena Morales Morales, llamada cariñosamente “tía Nena”, era oriunda de Talca. Participó en la Juventud Obrera Cristiana (JOC) y fue profesora normalista. Enseñó a leer y escribir a jóvenes, principalmente en Vilches, en la comuna de San Clemente.
            </p>
            <p>
              Posteriormente llegó a Santiago y vivió en la Población Juan Antonio Ríos. Trabajó en el diario El Siglo y, junto a su familia, participó en su distribución en la población. Fue dirigenta vecinal, militante del Partido Comunista y secretaria del Comité Local.
            </p>
            <p>
              Durante el gobierno de Salvador Allende llegó a desempeñarse como secretaria de ministros del Trabajo. También participó en las Juntas de Abastecimiento y Control de Precios (JAP), junto a dueñas de casa y dirigencias vecinales, preocupada por el cuidado y el abastecimiento de su familia, vecinas y vecinos.
            </p>
            <p>
              Tras el golpe de Estado tuvo que dejar La Río. El 18 de agosto de 1976, alrededor de las 20:00, fue detenida por agentes de la Dirección de Inteligencia Nacional (DINA) en el sector de Avenida Matta con Lord Cochrane, mientras viajaba en un taxi junto a su amiga Berta. Desde entonces permanece detenida desaparecida.
            </p>
            <p>
              El Almacén Popular adopta su nombre como homenaje y continuidad de su memoria comunitaria. Su legado inspira el trabajo compartido y recuerda el papel de las mujeres en el abastecimiento, los cuidados y la organización de la población.
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
            &ldquo;¡Rosa Morales vive en el Almacén Popular!&rdquo;
          </blockquote>
          <p className="text-primary-light text-lg font-medium tracking-wide">
            — Almacén Popular Rosa Elena Morales
          </p>
        </div>
      </section>
    </div>
  );
}
