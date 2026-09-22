/**
 * Generador de apodos del Universo Camila.
 *
 * Regla del proyecto: **sólo el nombre**. Nada de "corazón", "princesa" ni
 * cariños de catálogo. Todos los apodos inventados son deformaciones del
 * nombre propio que viene en `data.json`, al modo en que se deforman los
 * nombres entre amigos en Perú y Chile: diminutivos, apócopes, aumentativos,
 * alargamientos, reduplicaciones y grafías juguetonas.
 *
 * A la lista se suman, sin tocar, los `apodos_base` de `data.json`.
 */
import { apodosBase, nombre as nombrePorDefecto } from '../content'
import { barajar, crearRng, enteroAleatorio, hashCadena } from './math'

const VOCALES = 'aeiouáéíóú'

const esVocal = (c: string) => VOCALES.includes(c.toLowerCase())

const capitalizar = (t: string) =>
  t.length === 0 ? t : t[0].toUpperCase() + t.slice(1).toLowerCase()

/** Quita tildes para comparar duplicados ("Camilín" ≈ "Camilin"). */
const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** Sólo letras, para poder cortar y pegar sin arrastrar signos. */
const limpiar = (t: string) => t.replace(/[^\p{L}]/gu, '')

// ─────────────────────────── Raíces sacadas del nombre ───────────────────────

/**
 * Raíces que terminan en consonante y sirven de base a los sufijos.
 * Para "Camila": "Camil" (el nombre sin la vocal final) y "Mil" (su cola).
 * No se usan sueltas como apodo: nadie llama "Camil" a nadie.
 */
function raicesConsonanticas(nombre: string): string[] {
  const n = limpiar(nombre).toLowerCase()
  if (n.length < 4) return []

  const sinVocalFinal = (t: string) => {
    let r = t
    while (r.length > 2 && esVocal(r[r.length - 1])) r = r.slice(0, -1)
    return r
  }

  const raices = new Set<string>()
  raices.add(sinVocalFinal(n))
  // La cola del nombre también funciona: "Camila" → "mila" → "mil".
  if (n.length >= 5) raices.add(sinVocalFinal(n.slice(2)))

  return [...raices].filter((r) => r.length >= 3).map(capitalizar)
}

/**
 * Raíces que ya funcionan como apodo por sí solas.
 * Para "Camila": "Camila", "Cami", "Mila", "Mili".
 * Se exige un mínimo de 4 letras: los recortes de tres ("Cam", "Mil") suenan
 * a error de tecleo, no a apodo.
 */
function raicesVocalicas(nombre: string): string[] {
  const n = limpiar(nombre).toLowerCase()
  const raices = new Set<string>()
  raices.add(n)
  if (n.length >= 5) {
    raices.add(n.slice(0, 4)) // apócope: Cami
    raices.add(n.slice(2)) // cola: Mila
  }
  // Cola corta acabada en -i: Mil → Mili.
  for (const consonantica of raicesConsonanticas(nombre)) {
    if (consonantica.length <= 4) raices.add(consonantica.toLowerCase() + 'i')
  }

  return [...raices].filter((r) => r.length >= 4).map(capitalizar)
}

// ──────────────────────────────── Terminaciones ──────────────────────────────

/**
 * Sufijos que se pegan a una raíz consonántica. Están elegidos uno a uno para
 * que el resultado suene a apodo de verdad y no a generador automático:
 * diminutivos, aumentativos de broma y las formas en -ucho/-azo/-inga tan de
 * Perú y Chile.
 */
const SUFIJOS = [
  'ita',
  'ín',
  'ina',
  'inga',
  'acha',
  'ucha',
  'uchi',
  'uca',
  'ona',
  'onga',
  'aza',
  'ota',
  'eta',
  'is',
  'ú',
]

/** Cambia la C inicial por K: la grafía de chat de toda la vida. */
function conK(palabra: string): string | null {
  const n = limpiar(palabra)
  if (!/^c[aeiou]/i.test(n)) return null
  return capitalizar('k' + n.slice(1))
}

/** "Camila" → "Camilaaa". Alargar la vocal final es puro grito de amiga. */
function alargar(palabra: string, veces: number): string {
  const n = limpiar(palabra)
  return capitalizar(n + n[n.length - 1].repeat(veces))
}

// ────────────────────────────── Motor principal ──────────────────────────────

/**
 * Inventa apodos a partir del nombre propio, y sólo de él.
 * No devuelve los `apodos_base`: de eso se encarga `crearApodos`.
 */
export function inventarApodos(nombre: string = nombrePorDefecto): string[] {
  const consonanticas = raicesConsonanticas(nombre)
  const vocalicas = raicesVocalicas(nombre)
  const inventados: string[] = []

  const agregar = (apodo: string | null) => {
    if (apodo && limpiar(apodo).length >= 4) inventados.push(apodo)
  }

  // Sufijos sobre las raíces consonánticas: el grueso de la lista.
  for (const raiz of consonanticas) {
    for (const sufijo of SUFIJOS) agregar(capitalizar(raiz + sufijo))
  }

  for (const raiz of vocalicas) {
    // La raíz vale por sí sola.
    agregar(raiz)
    // Las acabadas en -i admiten la -s final y el -rris tan chileno.
    if (raiz.toLowerCase().endsWith('i')) {
      agregar(`${raiz}s`)
      agregar(capitalizar(`${raiz}rris`))
    }
    // Alargamientos.
    agregar(alargar(raiz, 2))
    agregar(alargar(raiz, 3))
    // Reduplicación, sólo si no queda un trabalenguas.
    if (raiz.length <= 6) agregar(`${raiz} ${raiz}`)
    // Grafía con K.
    agregar(conK(raiz))
  }

  // Grafía con K también sobre el diminutivo principal: Kamilita.
  if (consonanticas.length > 0) {
    agregar(conK(consonanticas[0] + 'ita'))
    agregar(conK(consonanticas[0] + 'ucha'))
  }

  return inventados
}

/**
 * Lista final de apodos únicos: primero los obligatorios de `data.json`,
 * después los inventados a partir del nombre, todos deduplicados y barajados.
 */
export function crearApodos(
  base: readonly string[] = apodosBase,
  nombre: string = nombrePorDefecto,
  maxUnicos = 256,
): string[] {
  const vistos = new Set<string>()
  const unicos: string[] = []

  const agregar = (apodo: string) => {
    const texto = apodo.replace(/\s+/g, ' ').trim()
    const clave = normalizar(texto)
    if (texto.length === 0 || vistos.has(clave)) return
    vistos.add(clave)
    unicos.push(texto)
  }

  base.forEach(agregar)
  const obligatorios = unicos.length

  const rng = crearRng(hashCadena(nombre + base.join('|')))
  barajar(inventarApodos(nombre), rng).forEach(agregar)

  // Los obligatorios se mantienen siempre; el resto se recorta al tope.
  return unicos.slice(0, Math.max(obligatorios, maxUnicos))
}

/**
 * Multiplica la lista de apodos hasta `total` entradas repartidas al azar.
 * Reparte por rondas barajadas para que ninguno quede infrarrepresentado
 * entre las miles de instancias del universo.
 */
export function multiplicarApodos(
  apodos: readonly string[],
  total: number,
  semilla = 20260921,
): string[] {
  if (apodos.length === 0) return []
  const rng = crearRng(semilla)
  const resultado: string[] = []
  while (resultado.length < total) {
    const ronda = barajar(apodos, rng)
    for (const apodo of ronda) {
      if (resultado.length >= total) break
      resultado.push(apodo)
    }
  }
  return resultado
}

/**
 * Multiplica devolviendo índices en vez de cadenas: es lo que consume el
 * `InstancedMesh`, que sólo necesita saber qué celda del atlas dibujar.
 */
export function multiplicarIndices(
  cantidadApodos: number,
  total: number,
  semilla = 20260921,
): Uint16Array {
  const indices = new Uint16Array(total)
  if (cantidadApodos === 0) return indices
  const rng = crearRng(semilla)
  const orden = Array.from({ length: cantidadApodos }, (_, i) => i)
  let cursor = cantidadApodos
  let ronda: number[] = []
  for (let i = 0; i < total; i++) {
    if (cursor >= cantidadApodos) {
      ronda = barajar(orden, rng)
      cursor = 0
    }
    indices[i] = ronda[cursor++]
  }
  return indices
}

/** Apodo aleatorio, para los guiños sueltos de la UI 2D. */
export function apodoAleatorio(apodos: readonly string[], rng = Math.random) {
  return apodos[enteroAleatorio(rng, apodos.length)]
}
