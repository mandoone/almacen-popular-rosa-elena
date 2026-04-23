import Image from "next/image";
import Link from "next/link";

const tarjetas = [
  {
    title: "2 sábados al mes",
    desc: "Abrimos 2 sábados por mes a partir de las 11:00 AM en Gamero 2670, Independencia",
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
    title: "Precio de costo",
    desc: "Los productos se venden al precio de costo, sin margen de ganancia para nadie",
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
            Todo comenzó en 2020
          </h2>
          <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
            <p>
              En agosto de 2020, en plena pandemia y crisis económica, un grupo de vecinos y vecinas de la Población Juan Antonio Ríos decidió organizarse para enfrentar juntos el alza del costo de la vida.
            </p>
            <p>
              Así nació la <strong className="text-primary-dark">RED DE ABASTECIMIENTO ROSA ELENA MORALES MORALES</strong>, una compra colectiva de productos básicos que permitía generar ahorro en el presupuesto mensual de alimentación e higiene de las familias participantes.
            </p>
            <p>
              El nombre fue un homenaje a Rosa Elena Morales Morales, dirigenta vecinal de la población secuestrada y desaparecida por la DINA el 18 de agosto de 1976 — exactamente 44 años antes del lanzamiento de la red.
            </p>
          </div>
        </div>
      </section>

      {/* 3. LOGO RED */}
      <section className="bg-background py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <Image
          src="/images/logo-red.png"
          alt="Logo Red de Abastecimiento Rosa Elena Morales Morales"
          width={200}
          height={250}
          className="object-contain mb-4"
        />
        <p className="text-center text-gray-500 italic text-sm">
          Logo original de la Red de Abastecimiento Rosa Elena Morales Morales
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
              Con el tiempo, y gracias al compromiso creciente de los pobladores y pobladoras, la red evolucionó hacia algo más permanente.
            </p>
            <p>
              Nació así el <strong className="text-primary-dark">ALMACÉN POPULAR ROSA ELENA MORALES MORALES</strong>, un espacio físico en la sede vecinal donde cada cierto tiempo — actualmente 2 sábados al mes — los vecinos pueden acceder a productos básicos a precio de costo.
            </p>
            <p>
              En su inauguración, la comunidad celebró este nuevo proyecto que representa un paso más en la construcción de una economía solidaria y popular en el territorio.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CITA INAUGURACIÓN */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <blockquote className="border-l-4 border-primary pl-6 text-gray-700 italic text-lg leading-relaxed mb-4">
            "Hace un tiempo con nuestrxs compañerxs quisimos dar un giro a lo que era la red de abastecimiento y llegamos a la idea que hoy en día está en funcionamiento. Queremos agradecer a todas las personas que estuvieron con nosotrxs en la inauguración del Almacén Popular Rosa Elena Morales Morales."
          </blockquote>
          <p className="text-gray-500 text-sm pl-6">
            — Publicación Instagram, inauguración del almacén
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
