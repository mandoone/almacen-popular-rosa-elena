import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  APERTURAS_PUBLICAS_2026,
  HORARIO_APERTURAS,
  LUGAR_APERTURAS,
  NOMBRE_ALMACEN,
} from '../src/lib/fase9/contenidoPublico.ts';

test('publica las siete aperturas confirmadas con horario y lugar informados', () => {
  assert.equal(APERTURAS_PUBLICAS_2026.length, 7);
  assert.deepEqual(
    APERTURAS_PUBLICAS_2026.map(({ fechaIso }) => fechaIso),
    [
      '2026-09-19',
      '2026-10-03',
      '2026-10-17',
      '2026-11-07',
      '2026-11-21',
      '2026-12-05',
      '2026-12-19',
    ]
  );
  assert.equal(HORARIO_APERTURAS, '11:00–15:00');
  assert.match(LUGAR_APERTURAS, /Gamero 2670, Independencia/);
});

test('el nombre público no contiene la duplicación histórica', () => {
  assert.equal(NOMBRE_ALMACEN, 'Almacén Popular Rosa Elena Morales');
  assert.doesNotMatch(NOMBRE_ALMACEN, /Morales Morales/);
});

test('las páginas públicas contienen las secciones principales de Fase 9', async () => {
  const archivos = await Promise.all(
    [
      '../src/app/page.tsx',
      '../src/app/historia/page.tsx',
      '../src/app/rosa-elena/page.tsx',
      '../src/app/participar/page.tsx',
    ].map((ruta) => readFile(new URL(ruta, import.meta.url), 'utf8'))
  );
  const contenido = archivos.join('\n');
  for (const titulo of [
    'Cómo funciona el Almacén',
    'Nuestra Historia',
    'Quién fue Rosa Elena',
    'Comunidad, participación y aportes',
    'Próximos sábados de apertura',
    '¿Tienes preguntas?',
  ]) {
    assert.match(contenido, new RegExp(titulo.replace(/[¿?]/g, '.')));
  }
  assert.doesNotMatch(contenido, /9 y 23 de mayo|Morales Morales/i);
});

test('Fase 9: contacto publicado tiene una única fuente compartida', async () => {
  const contenido = await readFile(new URL('../src/lib/fase9/contenidoPublico.ts', import.meta.url), 'utf8');
  const footer = await readFile(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  const participar = await readFile(new URL('../src/app/participar/page.tsx', import.meta.url), 'utf8');
  const tienda = await readFile(new URL('../src/app/tienda/page.tsx', import.meta.url), 'utf8');
  assert.match(contenido, /CONTACTO_WHATSAPP_NUMERO/);
  assert.match(footer, /CONTACTO_WHATSAPP_URL/);
  assert.match(participar, /CONTACTO_INSTAGRAM_URL/);
  assert.match(tienda, /CONTACTO_WHATSAPP_NUMERO/);
  assert.doesNotMatch(`${footer}\n${participar}\n${tienda}`, /56950807172|almacenpopular\.rosamoralesm/);
});
