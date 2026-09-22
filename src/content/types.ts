/**
 * Contrato de `data.json`. Ningún componente debe escribir textos a mano:
 * todo lo visible en la UI 2D y en el universo 3D sale de aquí.
 */
export interface Carta {
  titulo: string
  mensaje: string
  boton_abrir: string
  boton_universo: string
}

export interface ContenidoUniverso {
  carta: Carta
  /** Nombre propio del que se derivan todos los apodos inventados. */
  nombre: string
  apodos_base: string[]
}
