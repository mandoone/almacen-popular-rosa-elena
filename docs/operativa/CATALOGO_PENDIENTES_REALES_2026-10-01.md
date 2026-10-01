# Catálogo TEST: correspondencias y pendientes reales

La matriz completa es [MATRIZ_CATALOGO_2026-10-01.csv](MATRIZ_CATALOGO_2026-10-01.csv): 56 maestros, 54 comerciales y dos fixtures excluidas del conteo. La matriz usa el readback TEST; no afirma que el stock técnico sea físico. Poroto burro y Detergente concentrado permanecen inactivos e históricos; Empanadas sigue POR_APERTURA sin oferta real.

## Criterio aplicado

Respuesta directa Nadia/Omar 01/10 > documento Nadia «Avances PAGINA ALMACÉN» (09/09, actualizado 10/09) > comanda y Diseño de compra preparados para 03/10 > histórico. Fuente consultada de solo lectura por Google Drive. No se modificaron esas fuentes.

El documento acredita abarrotes envasados, paquetes de fideos, manga Swan, envases de detergente 5 L, unidad de Pasta Pepsodent 90 g, paquetes Tork/servilletas y esponjas por unidad. Azúcar y Sal son envasados con referencia kilo. No se convierten en granel por estar expresados en kilos.

En Diseño de compra Octubre, B3:H3 distingue Producto, Inventario, Diseño, «Costo x K», Venta y cantxcosto. «Venta» describe la dimensión comercial: no transforma automáticamente todos los costos en tarifa por litro/gramo. En envasados, la cantidad diseñada × costo forma el importe: Pasta 6 × 630 = 3.780, Fideos Parma 30 × 489 = 14.670, Tallarines Luchetti 30 × 659 = 19.770, Tork 8 × 1.289 = 10.312, Esponjas 50 × 100 = 5.000. Nadia acredita la unidad comercial; costo aplicado por esa misma unidad, factor 1. En granel el encabezado por kilo y la respuesta humana permiten convertir a la base histórica de stock.

Se resolvieron siete precios por nombre/SKU y unidad comercial coincidentes: Natura 2.150, Azúcar 900, Sal 350, Fuzol 1.000, Desinfectante suelo (Todos) 1.100, Shampoo/Bálsamo Ballerina 1.400 cada uno. Se corrigieron tilde/capitalización de Papel Higiénico, Paños amarillos y Pan de masa madre. No se fusionaron SKU.

Trece costos adicionales trazables por unidad comercial: Azúcar 690, Tallarines Parma 536, Fideos Parma 489, Sal 299, Tallarines Luchetti 659, Fideos Luchetti 725, Manga Swan 8.350, Detergente 5 L 1.290, con suavizante 1.690, Pasta Pepsodent 90 g 630, Toalla Tork 1.289, Servilletas 300u 990, Esponjas 100. Precios de comanda prevalecen sobre cualquier fórmula de margen: no corregir automáticamente Arroz integral ni Paños aunque costo supere venta.

## Preguntas comerciales restantes (agrupar en una revisión)

1. Identidad de variantes: VOR/VDR (020–021), salsa Toddo/Vergel/Colunquen (028), cloro gel Igenix/Excel/Excell (031–032), cloro Económico/Clorinda (033), limpiador genérico/Wyn (048), bolsas Virutex/Toddo (052). Indicar si reemplazan o conviven, y a qué ID corresponde cada lista. No crear ni fusionar aún.
2. Formato/base del costo: Natura/vegetal (022–023), Jabón 1 L (039), Fuzol (040), Nova x3 (042), desinfectante Todos (044), Shampoo/Bálsamo Ballerina (046–047). Confirmar el costo por **envase/paquete actual**, con volumen o cantidad cuando no coincide explícitamente entre fuentes.
3. Costos sin fuente positiva: Harina Integral (007), Mote (013), Papel Higiénico 6u (035), Afeitadora (051), Pan (053), Empanadas (054). Entregar valor, fecha y respaldo; un cero o casilla vacía no acredita costo.

Cada pregunta está marcada PENDING_HUMANO por ID. No reabrir granel, pesos rápidos, roles, usernames, horarios ni las bajas ya acreditadas.

## Evidencia y repetición

Plan y snapshots privados en operativa.local; backup remoto TEST antes del lote, stock/IDs conservados y auditoría/costos solo agregan filas. El script rechaza campos de stock y colisiones, permite repetir un plan sin duplicar cambios y verifica todos los campos no autorizados. Nunca publica IDs privados ni el contenido de snapshots.

```powershell
node scripts/consolidar-catalogo-test.mjs operativa.local/granel-despues.json
node scripts/run-test-env.mjs scripts/migrar-catalogo-operativo-test.mjs --apply-plan operativa.local/plan-catalogo-bloque2.json
# Después del readback: regenerar matriz desde catalogo-<hash>-despues.json.
```

Toda cifra de esta matriz es comercial TEST, no stock físico ni saldo financiero. Production no modificada.
