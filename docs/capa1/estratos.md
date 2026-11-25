# Capa 1 · Estratos

Núcleo: `src/core/estratos.ts`. Vista: `src/ui/Estratos.svelte`, `src/render/embudo.ts` (física pura), `estratos.worker.ts`, `estratosLienzo.ts`. Config: `config_capa1.json → estratos`. Referencia: `balance/ref_estratos.py`. Tests: `tests/estratos.test.ts`, `tests/embudo.test.ts`.

## Qué son

Lo que deja ir más allá del Infinito: se abren con el nodo Estratos (pide Ruptura nv1). 8 pilas debajo de la principal; la arena que se escurre llena el estrato 1, el 1 al 2, etc. Cada estrato guarda `s_k` (log10 de granos) que **no se pierde en el Infinito**. Más llenos y profundos → más **Presión**, que se suma a log10 V (multiplicada por la Densidad).

## Fórmulas (por segundo de Arena; quietos en el Defecto Vidrio)

```
al abrir k:  s_1 = 25,  s_k = s_(k−1) − sep          (se llena de golpe hasta su tope)
sep     = 2, o 1,75 / 1,5 / 1,25 / 1 con Capilaridad
flujo   = 0,00042 × Estratos.flujo_x × impulso                    (log10/s)
impulso = 1 + (Inercia.impulso_x − 1) × min(1, t / 600)          (t = s desde el último Infinito)
γ_k     = flujo × (1 + 0,3 × Permeabilidad_k) × (k == 1 ? f1 : 1) × (1 + 0,003 × s_(k+1))
f1      = clamp(log10(Caudal) / 30, 0,5, 3)
s_k    += γ_k × dt,  nunca más que s_(k−1) − sep
Presión = Σ_k  0,03 × k^e × Presión.w_x × (1 + 0,25 × NivelPresión_k) × lleno_k × s_k
e       = 1, o 1,05 / 1,1 / 1,15 / 1,2 con Sedimento II
lleno_k = Abismo.lleno_x si está en su tope (el 1 siempre), si no 1
```

- Empuje: el estrato de abajo acelera al de arriba (0,003 por orden de `s_(k+1)`; el último abierto no tiene). Con 0,1 la cadena explotaba.
- Al abrir, el estrato nuevo suma `0,03 × k × s_k` de Presión desde el primer segundo (×1e2,3 el primero … ×1e118,8 el octavo).

## Compras (log10 de Cristales, redondeado)

- Abrir el estrato k: 0, 2, 4, 7, 11, 16, 22, 29.
- Permeabilidad del estrato k (k = 0..7), nivel L: `1 + k + 0,6×L + 0,1×L³/6`.
- Presión del estrato k: misma fórmula (`presion` en config).

El término cúbico hace que se suban parejos.

## Vista: el embudo 2D

- Pixel art (elegido entre maquetas en `mockups/estratos/`). Arriba el casquete de la pila principal; debajo ocho bandejas cada vez más angostas unidas por paredes en diagonal, y un noveno estrato vacío como fondo cerrado (`FONDO`/`HORNO`: en la Capa 2 será el Horno).
- Física de arena (gravedad y deslizamiento a 45°, grilla 120×92) en un worker a 20 pasos/s que **se crea al entrar y se termina al salir**. Cada grano con su color de la paleta equipada.
- Poros del piso que se abren con el nivel; estratos cerrados = roca con "Estrato N · costo"; el próximo alcanzable se agrieta; al abrirlo la roca salta y la bandeja se llena.
- Llenado visual `s_k / (s_k + 6)` hasta 0,9 y chorro `log2(1 + γ/γ_base)`: solo visual.
- Ficha de tamaño fijo: granos, ritmo (×N por minuto), aporte ×10^(aporte × D), desglose de velocidad y las dos mejoras (Permeabilidad: gema de hielo; Presión: placa de prensa). Se elige tocando o con flechas.
- Celular: embudo centrado a todo el ancho, márgenes iguales, aporte adentro del estrato, ficha que se achica y scrollea adentro en 360×640.
- Medido: 60 fps en 1366×768 (0,42 ms/cuadro), ~59 en 390×844 con CPU ÷4. Sin animaciones de fondo con ahorro.
