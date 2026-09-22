/**
 * Jardín procedural de tulipanes y rosas.
 *
 * Las flores también se dibujan con `InstancedMesh`: hay una única geometría de
 * pétalo, una de tallo y una de hoja, y aquí se precalculan las matrices de
 * cada instancia (flor → pétalo). Así un jardín de ~120 flores con más de 2000
 * pétalos cuesta sólo tres llamadas de dibujo.
 */
import * as THREE from 'three'
import { paleta, universo } from '../scene/palette'
import {
  barajar,
  clamp,
  crearRng,
  enteroAleatorio,
  lerp,
  puntoEnCascaraEsferica,
  rangoAleatorio,
} from './math'

export type TipoFlor = 'tulipan' | 'rosa'

export interface Flor {
  posicion: THREE.Vector3
  rotacionY: number
  inclinacion: number
  escala: number
  alturaTallo: number
  tipo: TipoFlor
  color: THREE.Color
  /** Velocidad de deriva orbital alrededor del centro del universo. */
  velocidad: number
}

/** Matrices y colores listos para volcar en un `InstancedMesh`. */
export interface LoteInstancias {
  matrices: THREE.Matrix4[]
  colores: THREE.Color[]
}

/** Piezas procedurales de un tipo de flor, más la matriz de mundo de cada flor. */
export interface PiezasFlor {
  petalos: LoteInstancias
  tallos: LoteInstancias
  hojas: LoteInstancias
  /** Matriz de mundo de la flor completa: la que usa un modelo .glb importado. */
  mundo: THREE.Matrix4[]
}

export interface InstanciasJardin {
  porTipo: Record<TipoFlor, PiezasFlor>
  flores: Flor[]
}

// ───────────────────────────────── Geometrías ────────────────────────────────

/**
 * Pétalo: un plano deformado en forma de gota, ahuecado hacia dentro.
 * El origen queda en la base del pétalo para poder rotarlo desde el tallo.
 */
export function crearGeometriaPetalo(
  curvatura = 0.5,
  punta = 0.65,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1, 1.6, 8, 14)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    // Las posiciones vienen en float32, así que (y + 0.8) puede quedar en un
    // negativo minúsculo; sin acotar, Math.pow devolvería NaN en la base.
    const v = clamp((y + 0.8) / 1.6, 0, 1) // 0 en la base, 1 en la punta
    const ancho = Math.sin(Math.PI * Math.pow(v, punta)) * (1 - 0.22 * v)
    const nx = x * ancho
    // Ahuecado lateral + inclinación hacia fuera conforme sube el pétalo.
    const z = -curvatura * (nx * nx * 2.4) - 0.3 * v * v
    pos.setXYZ(i, nx, y, z)
  }
  geo.translate(0, 0.8, 0)
  geo.computeVertexNormals()
  return geo
}

/** Hoja larga y acintada, con una leve ondulación. */
export function crearGeometriaHoja(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1, 2.6, 4, 16)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const v = clamp((y + 1.3) / 2.6, 0, 1)
    const ancho = Math.sin(Math.PI * Math.pow(v, 0.5)) * 0.42
    const nx = x * ancho
    const z = Math.sin(v * Math.PI * 1.6) * 0.22 - nx * nx * 1.2
    pos.setXYZ(i, nx, y, z)
  }
  geo.translate(0, 1.3, 0)
  geo.computeVertexNormals()
  return geo
}

/** Tallo: cilindro fino con el origen en la base. */
export function crearGeometriaTallo(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.035, 0.06, 1, 7, 1, false)
  geo.translate(0, 0.5, 0)
  return geo
}

// ────────────────────────────── Armado del jardín ─────────────────────────────

const PETALOS_TULIPAN = 6
const PETALOS_ROSA = 21

/** Matrices locales de los pétalos de un tulipán (copa cerrada, dos coronas). */
function petalosDeTulipan(alturaTallo: number): THREE.Matrix4[] {
  const matrices: THREE.Matrix4[] = []
  for (let i = 0; i < PETALOS_TULIPAN; i++) {
    const corona = i < 3 ? 0 : 1
    const indiceEnCorona = corona === 0 ? i : i - 3
    const angulo =
      (indiceEnCorona / 3) * Math.PI * 2 + (corona === 0 ? 0 : Math.PI / 3)
    const inclinacion = corona === 0 ? 0.32 : 0.16
    const escala = corona === 0 ? 0.46 : 0.4

    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const euler = new THREE.Euler(inclinacion, angulo, 0, 'YXZ')
    q.setFromEuler(euler)
    m.compose(
      new THREE.Vector3(
        Math.sin(angulo) * 0.04,
        alturaTallo,
        Math.cos(angulo) * 0.04,
      ),
      q,
      new THREE.Vector3(escala, escala * 1.05, escala),
    )
    matrices.push(m)
  }
  return matrices
}

/** Matrices locales de los pétalos de una rosa (espiral áurea, capas abiertas). */
function petalosDeRosa(rng: () => number, alturaTallo: number): THREE.Matrix4[] {
  const matrices: THREE.Matrix4[] = []
  const anguloAureo = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < PETALOS_ROSA; i++) {
    const t = i / (PETALOS_ROSA - 1)
    const angulo = i * anguloAureo
    // Las capas exteriores se abren y caen; el centro queda apretado.
    const inclinacion = lerp(0.05, 1.35, Math.pow(t, 1.25))
    const radio = lerp(0.02, 0.3, t)
    const escala = lerp(0.16, 0.44, Math.pow(t, 0.8))
    const altura = alturaTallo + lerp(0.14, -0.02, t)

    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(inclinacion, angulo, rangoAleatorio(rng, -0.12, 0.12), 'YXZ'),
    )
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.sin(angulo) * radio, altura, Math.cos(angulo) * radio),
      q,
      new THREE.Vector3(escala, escala, escala),
    )
    matrices.push(m)
  }
  return matrices
}

/** Matriz local del tallo, escalado a la misma altura que reciben los pétalos. */
function talloDeFlor(alturaTallo: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(1, alturaTallo, 1),
  )
}

/** Una o dos hojas saliendo de la parte baja del tallo. */
function hojasDeFlor(rng: () => number): THREE.Matrix4[] {
  const cantidad = 1 + enteroAleatorio(rng, 2)
  const matrices: THREE.Matrix4[] = []
  for (let i = 0; i < cantidad; i++) {
    const angulo = rangoAleatorio(rng, 0, Math.PI * 2)
    const escala = rangoAleatorio(rng, 0.32, 0.5)
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rangoAleatorio(rng, 0.5, 0.95), angulo, 0, 'YXZ'),
    )
    matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(0, rangoAleatorio(rng, 0.12, 0.4), 0),
        q,
        new THREE.Vector3(escala, escala, escala),
      ),
    )
  }
  return matrices
}

/**
 * Genera el jardín completo y devuelve, ya aplanadas, las matrices de mundo de
 * cada pétalo, tallo y hoja listas para volcarse en un `InstancedMesh`.
 */
export function generarJardin(
  cantidad: number = universo.totalFlores,
  semilla = 77123,
): InstanciasJardin {
  const rng = crearRng(semilla)
  const flores: Flor[] = []

  const coloresTulipan = paleta.petalosTulipan.map((c) => new THREE.Color(c))
  const coloresRosa = paleta.petalosRosa.map((c) => new THREE.Color(c))
  const colorTallo = new THREE.Color(paleta.tallo)
  const colorHoja = new THREE.Color(paleta.hoja)

  const lote = (): LoteInstancias => ({ matrices: [], colores: [] })
  const piezas = (): PiezasFlor => ({
    petalos: lote(),
    tallos: lote(),
    hojas: lote(),
    mundo: [],
  })
  const porTipo: Record<TipoFlor, PiezasFlor> = {
    tulipan: piezas(),
    rosa: piezas(),
  }

  const tipos = barajar(
    Array.from({ length: cantidad }, (_, i): TipoFlor =>
      i % 2 === 0 ? 'tulipan' : 'rosa',
    ),
    rng,
  )

  for (let i = 0; i < cantidad; i++) {
    const tipo = tipos[i]
    const [x, y, z] = puntoEnCascaraEsferica(
      rng,
      universo.radioJardinInterior,
      universo.radioJardinExterior,
    )
    const alturaTallo =
      tipo === 'tulipan'
        ? rangoAleatorio(rng, 1.1, 1.7)
        : rangoAleatorio(rng, 0.9, 1.4)
    const flor: Flor = {
      posicion: new THREE.Vector3(x, y * 0.55, z),
      rotacionY: rangoAleatorio(rng, 0, Math.PI * 2),
      inclinacion: rangoAleatorio(rng, -0.35, 0.35),
      escala: rangoAleatorio(rng, 1.3, 2.7),
      alturaTallo,
      tipo,
      color:
        tipo === 'tulipan'
          ? coloresTulipan[enteroAleatorio(rng, coloresTulipan.length)]
          : coloresRosa[enteroAleatorio(rng, coloresRosa.length)],
      velocidad: rangoAleatorio(rng, -0.05, 0.05),
    }
    flores.push(flor)

    // Matriz de mundo de la flor completa.
    const mundo = new THREE.Matrix4().compose(
      flor.posicion,
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(flor.inclinacion, flor.rotacionY, flor.inclinacion * 0.5, 'YXZ'),
      ),
      new THREE.Vector3(flor.escala, flor.escala, flor.escala),
    )

    const destino = porTipo[tipo]
    destino.mundo.push(mundo)

    const locales =
      tipo === 'tulipan'
        ? petalosDeTulipan(alturaTallo)
        : petalosDeRosa(rng, alturaTallo)
    for (const local of locales) {
      destino.petalos.matrices.push(
        new THREE.Matrix4().multiplyMatrices(mundo, local),
      )
      destino.petalos.colores.push(flor.color)
    }

    destino.tallos.matrices.push(
      new THREE.Matrix4().multiplyMatrices(mundo, talloDeFlor(alturaTallo)),
    )
    destino.tallos.colores.push(colorTallo)

    for (const local of hojasDeFlor(rng)) {
      destino.hojas.matrices.push(
        new THREE.Matrix4().multiplyMatrices(mundo, local),
      )
      destino.hojas.colores.push(colorHoja)
    }
  }

  return { porTipo, flores }
}
