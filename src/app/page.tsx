import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO */}
      <section className="bg-primary-dark text-white py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center min-h-[80vh]">
        <div className="relative w-40 h-40 mb-8">
          <Image
            src="/images/logo.png"
            alt="Logo Almacén Popular Rosa Elena Morales Morales"
            fill
            className="object-contain"
            sizes="160px"
            priority
          />
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold max-w-4xl mb-6 leading-tight">
          Almacén Popular <br className="hidden sm:block" /> Rosa Elena Morales Morales
        </h1>
        <p className="text-primary-light text-lg sm:text-xl max-w-2xl mb-10">
          Proyecto comunitario sin fines de lucro • Población Juan Antonio Ríos
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/tienda"
            className="bg-white text-primary-dark font-semibold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors"
          >
            Ver productos
          </Link>
          <Link
            href="/rosa-elena"
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-md hover:bg-white/10 transition-colors"
          >
            Conoce nuestra historia
          </Link>
        </div>
      </section>

      {/* 2. PRÓXIMA APERTURA */}
      <section className="bg-primary-light py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-full text-primary-dark shrink-0">
              {/* Calendar Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-dark mb-2">
                Próximos sábados de apertura
              </h2>
              <p className="text-primary-dark/80 font-medium text-lg">
                Abrimos 2 sábados al mes • 11:00 AM • Gamero 2670, Independencia
              </p>
            </div>
          </div>
          <Link
            href="/participar"
            className="shrink-0 bg-primary-dark text-white font-medium px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            ¿Cómo funciona?
          </Link>
        </div>
      </section>

      {/* 3. QUÉ SOMOS */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-6 leading-tight">
              Un almacén de y para la comunidad
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              Somos un proyecto comunitario sin fines de lucro, autogestionado por pobladores y pobladoras de la Población Juan Antonio Ríos.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed">
              Nuestro objetivo es garantizar que todas las familias de nuestro territorio puedan acceder a productos básicos y de primera necesidad a precios justos y económicos, enfrentando juntos el alza del costo de la vida a través de la organización vecinal.
            </p>
          </div>
          <div className="space-y-8">
            {/* Tarjeta 1 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-14 h-14 bg-primary-light/30 rounded-lg flex items-center justify-center text-primary-dark">
                {/* Cart Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl text-primary-dark mb-2">Precios justos</h3>
                <p className="text-gray-600 text-lg">No buscamos ganancia monetaria. Los productos se entregan al precio de costo para apoyar la economía familiar.</p>
              </div>
            </div>
            {/* Tarjeta 2 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-14 h-14 bg-primary-light/30 rounded-lg flex items-center justify-center text-primary-dark">
                {/* Handshake Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl text-primary-dark mb-2">Autogestión</h3>
                <p className="text-gray-600 text-lg">Funcionamos gracias a turnos rotativos de trabajo voluntario realizados por los mismos vecinos y vecinas.</p>
              </div>
            </div>
            {/* Tarjeta 3 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-14 h-14 bg-primary-light/30 rounded-lg flex items-center justify-center text-primary-dark">
                {/* Heart / Community Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl text-primary-dark mb-2">Comunidad</h3>
                <p className="text-gray-600 text-lg">Un espacio pensado para y por los pobladores de la JAR, fortaleciendo el tejido social de nuestro barrio.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NUESTRA INSPIRACIÓN */}
      <section className="bg-background py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="w-full lg:w-1/3 shrink-0 flex justify-center">
            <div className="relative w-full max-w-[300px] aspect-[3/4]">
              <Image
                src="/images/rosa-elena-1.jpg"
                alt="Retrato de Rosa Elena Morales Morales"
                fill
                className="object-cover rounded-lg grayscale shadow-xl"
                sizes="(max-width: 768px) 100vw, 300px"
              />
            </div>
          </div>
          <div className="w-full lg:w-2/3 text-center lg:text-left">
            <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">
              Nuestra Inspiración
            </h2>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-primary-dark mb-2">
              Rosa Elena Morales Morales
            </h3>
            <p className="text-gray-500 font-medium mb-6">1930 — 18 de agosto de 1976</p>
            <p className="text-gray-700 text-lg leading-relaxed mb-8">
              Dirigenta vecinal de nuestra población, secretaria del Comité local Juan Antonio Ríos del Partido Comunista y dirigenta de la Junta de Abastecimiento y Control de Precios durante el gobierno de Salvador Allende. Secuestrada y desaparecida por la DINA el 18 de agosto de 1976. Su memoria nos inspira.
            </p>
            <Link
              href="/rosa-elena"
              className="inline-block bg-primary text-white font-medium px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
            >
              Conocer su historia completa
            </Link>
          </div>
        </div>
      </section>

      {/* 5. SÚMATE */}
      <section className="bg-primary py-24 px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            ¿Quieres ser parte de este proyecto?
          </h2>
          <p className="text-primary-light text-lg sm:text-xl mb-10 leading-relaxed">
            Buscamos vecinas y vecinos que quieran participar en turnos rotativos y ayudar a que este proyecto llegue a más personas.
          </p>
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
