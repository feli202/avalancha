## Escalado e Ignición

### Escalado después de la primera Fundición

La primera vuelta es larga y despareja a propósito; desde la segunda, las compras repetibles crecen mucho más y la vuelta se vuelve rápida.

- Estratos: cada nivel de Permeabilidad rinde ×(1 + 0,3 · Fundiciones), con softcap a las 20 Fundiciones (pasadas 20, cuenta la raíz). La Presión (el peso) no escala: con ×(1 + 0,5 · F) en las dos, la Presión llegaba al 90 % de la producción. Los estratos se abren llenos desde el inicio de cada vuelta: con el nodo Estratos nv1 se abren los 8 juntos, con s_8 = 291 y cada uno 2 (la separación) más que el de abajo.

- Compras con Esquirlas: aparecen dos repetibles nuevas: Esquirla de fuego (la Temperatura de las Brasas ×1,01 por nivel) y Geoda (Esquirlas/s ×2 por nivel). El nivel L cuesta 10^(1 + L); sin tope. Son permanentes; el bot las compra con lo que sobra después de las mejoras de la Escarcha. Con un paso de costo menor a 1 la Esquirla de fuego arma un bucle Temperatura → Escarcha → Esquirlas → Temperatura que adelanta la Ignición horas.

- Cristales: con Fusión del Infinito los Cristales pasan de 1e308 con el freno de [fundicion.md](fundicion.md); en el simulador llegan a e450 a las 6:40, e520 a las 8:00, e700 a las 9:30 y ~e1.000 en la Ignición.

- Regla: ninguna vuelta después de la quinta debería durar más de 20 minutos activos; las últimas, 3–5 minutos. En el simulador: vueltas 2.ª a 4.ª de 33, 29 y 25 min; entre las 4:00 y la Fusión (5:26) duran 1,5–2 min (sin Fusión cada Fundición da lo mismo, así que conviene fundir seguido); después, 6–8 min, y desde las 9:33 todas ≤ 5 min.

### Ignición (5.778 K, el fin de la Capa 2)

- Al llegar a 5.778 K (la temperatura de la superficie del Sol) la pila deja de ser arena fundida: se vuelve plasma. En el simulador, a las 9:56, con 107 Fundiciones y ~10^5 Brasas totales.

- Cinemática: el Horno se pone blanco, la pila se ilumina desde adentro, los granos dejan de caer en cruz y por un instante caen también en diagonal; el borde de la pila se curva hasta formar un círculo y aparece, apenas un segundo, el símbolo π. Corte a negro: "Capa 3 próximamente".

- Pantalla de resumen como la de la Capa 1 (tiempo, Fundiciones, Temperatura máxima, Vidrio, foto de la pila en plasma), descargable, con links a Discord e itch.io.

- Puente a la Capa 3: en la barra lateral aparece la silueta de la Capa 3 (un círculo). La Capa 3 cambia las físicas de la pila (derrumbes en diagonal), toca el espacio y el tiempo, y π es clave en lo simbólico y en lo jugable. En la Capa 2 solo se insinúa: nada de mecánicas de la Capa 3 todavía.
