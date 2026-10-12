# Lo que ve la comunidad y lo que guardamos en el Almacén

Esta explicación acompaña la preparación local. La tienda actual todavía no cambia y no se carga ningún producto nuevo.

## Una oferta pública puede tener varias marcas físicas

Ejemplo ilustrativo, sin acreditar la marca del aceite actual:

```text
CLIENTE                         EQUIPO DEL ALMACÉN
Aceite vegetal Económico        Botella Reyes 1 L → registro propio
$1.700 · imagen genérica        Botella Marca X 1 L → otro registro
Disponible / Agotado            Marca, contenido, stock y costo de cada una
```

La **oferta pública** reúne productos equivalentes. El **SKU** es el registro del producto físico. Aunque el cliente no vea la marca en una oferta Económico, el Almacén mantiene esa información para saber qué compró, cuánto queda y qué entregó.

| Cambio | Qué conserva el sistema |
|---|---|
| Cambia el proveedor, misma marca y botella | El mismo SKU; cada compra conserva proveedor, fecha y costo. |
| Cambia la marca de la botella | Otro SKU. Puede seguir en la misma oferta Económico si es equivalente. |
| Cambia de1 L a900 ml | Otro SKU y una presentación distinta; no se entrega como si fuera1 L. |

Por ejemplo, la misma botella puede comprarse primero a La Oferta y luego a Mayorista X. Esto no crea dos productos. El proveedor corresponde a la compra, no a la identidad del producto.

## Económico conserva la marca por dentro

“Mostrar como Económico” solo decide cómo se presenta la oferta. No borra la marca física, el historial ni el stock. Necesitamos conocer marca y formato aunque no se publiquen, para evitar mezclar botellas distintas o atribuirles el costo equivocado.

Cuando se ofrece una marca concreta —por ejemplo Lavaloza Fuzol900 ml— esa marca sí aparece públicamente y debe coincidir con el producto entregado. Pan o Empanadas no necesitan una marca artificial.

## Una imagen debe representar la oferta

Una fotografía donde se ve DE REYES puede hacer pensar que siempre se entregará esa marca. Por eso Aceite vegetal Económico usa una representación genérica, sin una marca comprometida. Si una oferta promete una marca específica, su imagen debe corresponder a esa marca y presentación.

Omar ya revisó la cobertura de fotos contra la comanda y entregó el trabajo a Carolina. Ella completa faltantes, corrige asociaciones y prepara la carpeta final. Esta preparación no abre otra lista de fotos ni modifica Drive. La autorización de uso de las imágenes sigue siendo una revisión separada.

## Qué falta para el próximo paso

Omar ya envió las preguntas a Nadia. No se solicitan respuestas nuevas aquí. Mientras llegan, el simulador permite revisar propuestas y comprobar compatibilidad sin guardar nada. Los tres casos Fuzol900/Ballerina750 ya están acreditados para esa prueba local; las identidades restantes y las propuestas de Omar siguen pendientes.

“CUMPLE” significa que la propuesta pasó las comprobaciones locales. No significa que ya fue cargada ni que la tienda cambió. Una migración TEST deberá autorizarse en otra tarea, con respaldo y comparación de datos.
