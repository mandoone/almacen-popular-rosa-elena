# Generación oficial de PDF desde HTML

## Regla principal

El HTML aprobado es la **fuente visual maestra**. El PDF debe reproducir su
apariencia de pantalla y no reinterpretarlo mediante estilos de impresión.

El procedimiento oficial usa:

- Chromium mediante Playwright Python;
- `media="screen"`;
- `print_background=True`;
- tamaño A4;
- `prefer_css_page_size=True`;
- márgenes PDF de `0 mm`;
- escala estándar `0.98`;
- QA visual obligatoria antes de marcar un archivo como `FINAL`.

> **Nunca generar los informes del Almacén con `media="print"` como fuente
> visual.**

Ese flujo produjo repetidamente diferencias respecto del HTML aprobado: doble
borde en badges o chips, pérdida de `border-radius`, esquinas rectas y otros
cambios pequeños de layout y apariencia.

## HTML autocontenido

Los HTML `FINAL` deberían ser autocontenidos para que el render sea reproducible:

- CSS inline o embebido;
- imágenes en data URI o en URLs absolutas estables;
- sin dependencias relativas frágiles.

El script oficial usa `page.set_content(...)`, por lo que no depende de cargar el
documento mediante `file://`.

## Uso permitido de `@media print`

`@media print` puede existir únicamente para necesidades de paginación, por
ejemplo:

- `break-inside`;
- `page-break-inside`;
- `break-after`;
- `page-break-after`.

No debe cambiar bordes, `outline`, `border-radius`, colores, fondos, sombras,
espaciados, badges, tarjetas, portada ni ningún elemento de identidad visual.

## Comando oficial

```bash
python scripts/render-informe-pdf.py ruta/al/informe.html ruta/al/informe.pdf
```

La salida es opcional. Si se omite, el PDF se crea junto al HTML con el mismo
nombre base:

```bash
python scripts/render-informe-pdf.py ruta/al/informe.html
```

La escala puede cambiarse explícitamente con `--scale`. Para usar un ejecutable
de Chromium específico, indicar `--chromium` o la variable de entorno
`CHROMIUM_PATH`.

El tooling es Python independiente de Next.js. Si Playwright Python no está
instalado:

```bash
python -m pip install playwright
python -m playwright install chromium
```

El script nunca instala dependencias automáticamente.

## QA obligatoria

Antes de declarar un PDF como `FINAL`, comparar visualmente el HTML maestro y el
PDF y confirmar:

1. la portada conserva el mismo `border-radius` del HTML;
2. badges y chips tienen un único borde;
3. tarjetas y secciones conservan sus esquinas redondeadas;
4. colores y fondos son equivalentes;
5. logo e imágenes son correctos;
6. tablas no tienen cortes ni desbordes;
7. no hay páginas vacías;
8. no hay contenido cortado;
9. la cantidad de páginas es razonable;
10. versión y fecha son coherentes entre portada, ficha documental, HTML, PDF y
    nombre del archivo.

Si el PDF no es visualmente equivalente al HTML, **no se corrige manualmente el
PDF**. Se corrige el flujo o el CSS y se vuelve a generar desde el HTML maestro.

## Escala

`0.98` es el estándar validado el 30-09-2026. Solo debe cambiarse explícitamente
si un informe nuevo lo requiere y después de completar nuevamente el QA visual.

## Método validado

Procedimiento validado el 30-09-2026 con
`2026-09-30_informe-consolidado_estado-proyecto_v1.8_FINAL`.

Resultado:

- 6 páginas;
- esquinas redondeadas correctas;
- sin doble borde;
- paridad visual satisfactoria con el HTML.
