/**
 * Utilidades matemáticas y de aleatoriedad.
 *
 * Todo el universo 3D se genera con un PRNG sembrado: así la distribución es
 * "100% aleatoria" a la vista pero reproducible entre recargas y entre el
 * servidor de desarrollo y el build de producción.
 */

/** PRNG rápido y determinista (mulberry32). */
export function crearRng(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash de cadena a entero de 32 bits, para sembrar el PRNG desde texto. */
export function hashCadena(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v

/** Número aleatorio en [min, max). */
export const rangoAleatorio = (rng: () => number, min: number, max: number) =>
  min + rng() * (max - min)

/** Entero aleatorio en [0, max). */
export const enteroAleatorio = (rng: () => number, max: number) =>
  Math.floor(rng() * max)

/** Fisher-Yates sobre una copia del array. */
export function barajar<T>(items: readonly T[], rng: () => number): T[] {
  const copia = items.slice()
  for (let i = copia.length - 1; i > 0; i--) {
    const j = enteroAleatorio(rng, i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/**
 * Punto aleatorio dentro de una cáscara esférica [radioInterior, radioExterior].
 * Se usa para repartir las palabras y las flores por el universo sin que se
 * amontonen en el centro (distribución uniforme en volumen, no en radio).
 */
export function puntoEnCascaraEsferica(
  rng: () => number,
  radioInterior: number,
  radioExterior: number,
): [number, number, number] {
  const u = rng()
  const v = rng()
  const w = rng()
  const theta = u * Math.PI * 2
  const phi = Math.acos(2 * v - 1)
  const r3 = lerp(radioInterior ** 3, radioExterior ** 3, w)
  const r = Math.cbrt(r3)
  const sinPhi = Math.sin(phi)
  return [
    r * sinPhi * Math.cos(theta),
    r * Math.cos(phi),
    r * sinPhi * Math.sin(theta),
  ]
}
