import raw from './data.json'
import type { ContenidoUniverso } from './types'

/** Punto único de lectura del contenido editable. */
export const contenido: ContenidoUniverso = raw

export const carta = contenido.carta
export const apodosBase = contenido.apodos_base
export const nombre = contenido.nombre

export type { Carta, ContenidoUniverso } from './types'
