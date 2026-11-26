## La Fundición

El reinicio de la Capa 2: fundís las Capas 0 y 1 enteras y ganás Brasas.

- Requisito: llegar a 1e308 Cristales totales en la vuelta actual. Hasta el fuego de Ruptura, los Cristales se frenan ahí, así que 1e308 es a la vez el tope y la puerta.

- Brasas al fundir:

\text{Brasas} = \left\lfloor M_B \cdot \left(\frac{\log_{10} C}{308}\right)^{q} \right\rfloor,\quad q = 5{,}2 \;(\times 1{,}387\text{ con Ruptura II de fuego})

Antes de Fusión del Infinito los Cristales se frenan en el tope, así que cada Fundición da M_B Brasas. M_B = (1 + Crisol) × 1,002^cargas × (1 + 0,05 × cargas con Facetas de fuego), donde "cargas" son las cargas 2–5 completas. Las primeras Fundiciones dan 1 Brasa; el Crisol llega a nv1 a las ~2:20 (2 por Fundición) y a nv4 a las ~9:00.

- Con Fusión del Infinito, los Cristales de un Infinito pasado el tope cuentan `tope + (log10 C − tope)^0,757` (tope = log10 1,8e308). Sin ese freno, el bucle Cristales → Permeabilidad/Presión (costo cúbico) → Presión → Cristales duplica el exponente cada ~3 min. Y las Brasas son una potencia de log10 C (no 10^((log10 C − 308)/50) como en el punto de partida): con la exponencial siempre convenía esperar más y una sola vuelta terminaba la capa.

- Bot (Fundición automática): sin Fusión, "apenas llegás" (en el tope; si puede pagar el próximo nodo de fuego y ese nodo todavía no está en nv4, espera hasta 30 min). Con Fusión, "multiplicar mis Brasas": funde cuando la Fundición suma ×0,223 a las Brasas totales, como mucho 5 min después de llegar al tope. Antes de fundir intenta hasta 2 cargas de Defectos.

| Al fundir | Qué pasa |
|---|---|
| Se reinicia | Toda la Capa 0 (Energía, granos, compras, compresiones, Mutaciones) y toda la Capa 1 (Cristales, niveles normales de la Red, reliquias e inventario, Estratos, Escarcha no eterna, Esquirlas, Defectos completos) |
| Se conserva | La Automatización y su configuración |
| Permanente (es de fuego) | Brasas, Vidrio, Temperatura, niveles de fuego de los nodos, el Horno y sus mejoras, Escarcha eterna y sus mejoras, inventario doble, liberaciones, cargas de Defectos, el reparto del calor |

- Fundición automática: más adelante (con un nivel de fuego), con las mismas reglas que el Infinito automático ("apenas llegás" o "multiplicar mis Brasas"). La carga 1 de cada Defecto (la de la Capa 1) se reinicia y se rehace en cada vuelta; las cargas 2–5 son permanentes y, con alguna hecha, el Defecto cuenta como completo desde el inicio de la vuelta.

- Visual: la pila se derrite desde el centro hacia afuera, el hielo de la Capa 1 se evapora y queda una brasa en el medio. Es el momento más grande de la capa: tiene que sentirse.
