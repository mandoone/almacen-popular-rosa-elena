# Informes del proyecto

Esta carpeta contiene las fuentes y salidas documentales de la Web Almacén Popular
Rosa Elena Morales. La guía oficial es
`design-system/docs/ADS-002_sistema_documental.md`.

## Estructura

```text
reports/
├── sources/
│   ├── avance-almacen/
│   └── tecnico-interno/
├── html/
│   ├── avance-almacen/
│   └── tecnico-interno/
└── pdf/
    ├── avance-almacen/
    └── tecnico-interno/
```

## Markdown fuente

- Informes dirigidos al Almacén: `reports/sources/avance-almacen/`.
- Informes técnicos: `reports/sources/tecnico-interno/`.

El Markdown es la fuente oficial. Debe contener la metadata definida en ADS-002 y
no puede incluir secretos ni datos personales de pedidos.

## HTML

Los HTML generados se guardan en la carpeta equivalente bajo `reports/html/`.
Los dos archivos `preview_2026-07-11_*_v0.2.html` son referencias visuales aprobadas
y no deben eliminarse ni rediseñarse.

## PDF

Los PDF se guardarán en `reports/pdf/<tipo>/` únicamente después de revisar y
aprobar visualmente el HTML. Los PDF de prueba no se versionan ni se publican.

## Convención de nombres

```text
YYYY-MM-DD_tipo-descripcion_vN.N.ext
```

Se usa el mismo nombre base para `.md`, `.html` y `.pdf`. `preview_` identifica
maquetas; no identifica una versión enviada.

## Publicación en Drive

1. Actualizar el Markdown en el repo.
2. Generar y aprobar el HTML.
3. Generar el PDF final cuando corresponda.
4. Copiar HTML/PDF aprobados a las carpetas de documentación o versiones enviadas
   del Drive del Almacén.
5. No editar la copia de Drive como fuente: cualquier corrección vuelve al Markdown
   del repo y genera una versión nueva.

El repo conserva el sistema y las fuentes; Drive conserva copias publicadas y
versiones entregadas.
