// Un ícono por sistema, dibujado con la geometría del juego (viewBox -8 -8 16 16, solo trazo): la Pila un montículo de
// arena, la Red un rombo de celdas, los Estratos losas apiladas, los Defectos una red con una dislocación, la Escarcha un
// copo de seis brazos, el Relicario una gema tallada. Los usan la barra de Cristalización y los sectores del Motor.
export const ICONOS: Record<string, string> = {
  pila: 'M-7.5 6h15M-6 6-1.5-1 0-4.5 1.5-1 6 6M-3.5 2h7',
  red: 'M0-7 7 0 0 7-7 0ZM-3.5-3.5 3.5 3.5M3.5-3.5-3.5 3.5',
  estratos: 'M-7-6.5h14l-1.5 3h-11ZM-6-1h12l-1.5 3h-9ZM-5 4.5h10l-1.5 3h-7Z',
  defectos: 'M-7-3.5h14M-7 3.5h14M-3.5-7V7M3.5-7V0M1.5 0V7', // una dislocación: la línea de la red que se corre
  escarcha: 'M0-7V7M-6-3.5 6 3.5M-6 3.5 6-3.5M0-7-1.5-5.5M0-7 1.5-5.5M0 7-1.5 5.5M0 7 1.5 5.5',
  relicario: 'M-6-2.5-3.5-6h7L6-2.5 0 7ZM-6-2.5H6M-3.5-6-1.5-2.5 0 7M3.5-6 1.5-2.5 0 7',
}
