import Image from "next/image";
import Link from "next/link";
import { crearMetadataPublica } from "@/lib/fase10/metadataPublica";
import { HORARIO_APERTURAS, LUGAR_APERTURAS } from "@/lib/fase9/contenidoPublico";

export const metadata = crearMetadataPublica({
  title: "Historia",
  description: "Historia de la red de abastecimiento y del Almacén Popular Rosa Elena Morales en la población Juan Antonio Ríos.",
  path: '/historia',
});

const tarjetas = [
  {
    title: "2 sábados al mes",
    desc: `Las próximas aperturas informadas funcionan de ${HORARIO_APERTURAS} en ${LUGAR_APERTURAS}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: "Turnos rotativos",
    desc: "Los mismos vecinos y vecinas atienden el almacén en turnos voluntarios rotativos",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: "Precios justos",
    desc: "Productos básicos a precios justos y económicos para apoyar a las familias y sostener un proyecto comunitario sin fines de lucro",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
];

export default function HistoriaPage() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO */}
      <section className="bg-primary-dark text-white py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <h1 className="font-serif font-bold text-white text-4xl sm:text-5xl mb-4">
          Nuestra Historia
        </h1>
        <p className="text-primary-light text-lg sm:text-xl">
          De red de abastecimiento a almacén popular
        </p>
      </section>

      {/* 2. ORIGEN */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-8">
            Un camino de organización desde 2019
          </h2>
          <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
            <p>
              En <strong className="text-primary-dark">octubre de 2019</strong>, tras la revuelta social, nació la Asamblea Territorial Juan Antonio Ríos: un espacio autoconvocado de vecinas y vecinos para organizarse en el territorio.
            </p>
            <p>
              En <strong className="text-primary-dark">marzo de 2020</strong>, ante la pandemia, la asamblea activó comisiones de salud, acopio y emergencia para responder a las necesidades de la comunidad.
            </p>
            <p>
              En <strong className="text-primary-dark">agosto de 2020</strong> surgió la <strong className="text-primary-dark">Red de Abastecimiento Rosa Elena Morales</strong>, mediante compras colectivas y canastas de alimentos e higiene. Su nombre homenajea a Rosa Elena Morales, vecina y dirigenta de la población que permanece detenida desaparecida desde el 18 de agosto de 1976.
            </p>
          </div>
        </div>
      </section>

      {/* 3. LOGO RED */}
      <section className="bg-background py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <Image
          src="/images/logo-red.png"
          alt="Logo Red de Abastecimiento Rosa Elena Morales"
          width={200}
          height={250}
          className="h-auto w-auto object-contain mb-4"
        />
        <p className="text-center text-gray-500 italic text-sm">
          Logo original de la Red de Abastecimiento Rosa Elena Morales
        </p>
      </section>

      {/* 4. TRANSICIÓN */}
      <section className="bg-primary-light py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-8">
            De red a almacén
          </h2>
          <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
            <p>
              Las compras colectivas y el trabajo compartido de vecinas y vecinos dieron paso a un punto de venta y acopio comunitario.
            </p>
            <p>
              En <strong className="text-primary-dark">diciembre de 2021</strong> se inauguró el <strong className="text-primary-dark">Almacén Popular Rosa Elena Morales</strong>. La iniciativa pasó de las compras por encargo a un espacio de abastecimiento comunitario con productos básicos a precios justos y económicos.
            </p>
            <p>
              En <strong className="text-primary-dark">abril de 2023</strong>, el Almacén se trasladó y abrió en {LUGAR_APERTURAS}, donde continúa este proyecto de economía solidaria y organización vecinal.
            </p>
          </div>
        </div>
      </section>

      {/* 5. SENTIDO COMUNITARIO */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="border-l-4 border-primary pl-6 text-gray-700 italic text-lg leading-relaxed">
            El Almacén se construye con el trabajo voluntario de vecinas y vecinos. Las compras, la organización y los turnos de atención sostienen un espacio que pone el abastecimiento y el cuidado de la comunidad en el centro.
          </p>
        </div>
      </section>

      {/* 6. CÓMO FUNCIONA HOY */}
      <section className="bg-background py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark text-center mb-12">
            Cómo funciona hoy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tarjetas.map(({ title, desc, icon }) => (
              <div key={title} className="bg-white rounded-lg shadow-sm p-8 flex flex-col gap-4">
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

      {/* 7. CTA FINAL */}
      <section className="bg-primary py-24 px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-8">
            ¿Quieres ser parte de esta historia?
          </h2>
          <Link
            href="/participar"
            className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-md hover:bg-gray-100 transition-colors text-lg"
          >
            Quiero participar
          </Link>
        </div>
      </section>
    </div>
  );
}
