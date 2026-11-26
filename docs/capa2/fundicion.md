## La Fundición

El reinicio de la Capa 2: fundís las Capas 0 y 1 enteras y ganás Brasas.

- Requisito: llegar a 1e308 Cristales totales en la vuelta actual. Hasta el fuego de Ruptura, los Cristales se frenan ahí, así que 1e308 es a la vez el tope y la puerta.

- Brasas al fundir (punto de partida):

\text{Brasas} = \left\lfloor 10^{\frac{\max(0,\ \log_{10} C - 308)}{50}} \times M_B \right\rfloor

Antes del fuego de Ruptura el exponente es 0, así que cada Fundición da M_B Brasas (al principio, 1). M_B sube con el Horno (mejora Crisol), con Cristalografía II de fuego (según las cargas de Defectos completas) y con Ruptura II de fuego (las Brasas escalan mejor cuanto más pasás de 1e308). Las primeras Fundiciones dan pocas Brasas (1, 2, 3…), como los primeros Puntos de Eternidad, y cada una vale mucho.

| Al fundir | Qué pasa |
|---|---|
| Se reinicia | Toda la Capa 0 (Energía, granos, compras, compresiones, Mutaciones) y toda la Capa 1 (Cristales, niveles normales de la Red, reliquias e inventario, Estratos, Escarcha no eterna, Esquirlas, Defectos completos) |
| Se conserva | La Automatización y su configuración |
| Permanente (es de fuego) | Brasas, Vidrio, Temperatura, niveles de fuego de los nodos, el Horno y sus mejoras, Escarcha eterna y sus mejoras, inventario doble, liberaciones, cargas de Defectos, el reparto del calor |

- Fundición automática: más adelante (con un nivel de fuego), con las mismas reglas que el Infinito automático ("apenas llegás" o "multiplicar mis Brasas").

- Visual: la pila se derrite desde el centro hacia afuera, el hielo de la Capa 1 se evapora y queda una brasa en el medio. Es el momento más grande de la capa: tiene que sentirse.
