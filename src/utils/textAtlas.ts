/**
 * Atlas de texto para el campo de apodos.
 *
 * Un `InstancedMesh` comparte una única geometría y un único material, así que
 * no puede tener una geometría de texto distinta por instancia. La solución es
 * dibujar TODOS los apodos una sola vez en un canvas (una celda por apodo) y
 * subir ese canvas como textura: cada instancia es un simple plano que muestra
 * el trozo de textura que le toca, seleccionado con un atributo de instancia.
 *
 * Optimización: el texto es monocromo, así que sólo se sube el canal alfa como
 * textura de un byte por téxel (`RedFormat`). El color lo pone el shader por
 * instancia. Un atlas de 4096×1728 ocupa ~7 MB en vez de ~28 MB.
 */
import * as THREE from 'three'

/** Rectángulo UV y proporción del texto dibujado en una celda. */
export interface CeldaAtlas {
  /** Desplazamiento UV de la esquina inferior izquierda del recorte. */
  offsetU: number
  offsetV: number
  /** Escala UV del recorte (escalaV es negativa: el atlas se lee de arriba abajo). */
  escalaU: number
  escalaV: number
  /** Ancho / alto del texto, para que las palabras largas no se deformen. */
  aspecto: number
}

export interface AtlasTexto {
  textura: THREE.DataTexture
  celdas: CeldaAtlas[]
  ancho: number
  alto: number
  dispose: () => void
}

export interface OpcionesAtlas {
  anchoCelda?: number
  altoCelda?: number
  tamanoFuente?: number
  familiaFuente?: string
  maxDimension?: number
}

const FAMILIA_POR_DEFECTO =
  '"Quicksand", "Trebuchet MS", "Segoe UI", system-ui, sans-serif'

/**
 * Espera a que la tipografía esté disponible antes de pintar el atlas.
 * Sin esto, el canvas puede dibujarse con la fuente de reserva y quedarse así.
 */
export async function esperarFuente(
  familia = FAMILIA_POR_DEFECTO,
  tamano = 48,
): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  try {
    await document.fonts.load(`${tamano}px ${familia}`)
    await document.fonts.ready
  } catch {
    // Sin conexión o fuente no disponible: se usa la pila de reserva.
  }
}

/**
 * Dibuja `textos` en un atlas y devuelve la textura junto con el recorte UV de
 * cada uno. Si no caben todos, se recorta la lista al máximo que admita el
 * tamaño de textura indicado.
 */
export function crearAtlasTexto(
  textos: readonly string[],
  opciones: OpcionesAtlas = {},
): AtlasTexto {
  const {
    anchoCelda = 512,
    altoCelda = 72,
    tamanoFuente = 46,
    familiaFuente = FAMILIA_POR_DEFECTO,
    maxDimension = 4096,
  } = opciones

  const columnas = Math.max(1, Math.floor(maxDimension / anchoCelda))
  const filasMax = Math.max(1, Math.floor(maxDimension / altoCelda))
  const cabidas = Math.min(textos.length, columnas * filasMax)
  const filas = Math.max(1, Math.ceil(cabidas / columnas))

  const ancho = columnas * anchoCelda
  const alto = filas * altoCelda

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo crear el contexto 2D del atlas')

  ctx.clearRect(0, 0, ancho, alto)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'

  const margen = Math.round(altoCelda * 0.16)
  const anchoUtil = anchoCelda - margen * 2
  const celdas: CeldaAtlas[] = []

  for (let i = 0; i < cabidas; i++) {
    const texto = textos[i]
    const columna = i % columnas
    const fila = Math.floor(i / columnas)
    const x0 = columna * anchoCelda
    const y0 = fila * altoCelda

    // Ajusta el cuerpo de letra hasta que el apodo quepa en la celda.
    let tamano = tamanoFuente
    let medida = 0
    do {
      ctx.font = `600 ${tamano}px ${familiaFuente}`
      medida = ctx.measureText(texto).width
      if (medida <= anchoUtil) break
      tamano -= 2
    } while (tamano > 12)

    const anchoTexto = Math.min(Math.ceil(medida), anchoUtil)
    ctx.fillText(texto, x0 + margen, y0 + altoCelda / 2)

    // El recorte cubre sólo el texto real, no la celda entera.
    const recorteAncho = anchoTexto + margen * 2
    celdas.push({
      offsetU: x0 / ancho,
      // v crece hacia abajo (flipY = false), así que el borde inferior del
      // recorte es la fila más alta del atlas y la escala en V es negativa.
      offsetV: (y0 + altoCelda) / alto,
      escalaU: recorteAncho / ancho,
      escalaV: -altoCelda / alto,
      aspecto: recorteAncho / altoCelda,
    })
  }

  // Sólo el canal alfa: un byte por téxel.
  const pixeles = ctx.getImageData(0, 0, ancho, alto).data
  const alfa = new Uint8Array(ancho * alto)
  for (let i = 0, j = 3; i < alfa.length; i++, j += 4) alfa[i] = pixeles[j]

  const textura = new THREE.DataTexture(
    alfa,
    ancho,
    alto,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  )
  textura.flipY = false
  textura.generateMipmaps = true
  textura.minFilter = THREE.LinearMipmapLinearFilter
  textura.magFilter = THREE.LinearFilter
  textura.wrapS = THREE.ClampToEdgeWrapping
  textura.wrapT = THREE.ClampToEdgeWrapping
  textura.anisotropy = 4
  textura.needsUpdate = true

  return {
    textura,
    celdas,
    ancho,
    alto,
    dispose: () => textura.dispose(),
  }
}
