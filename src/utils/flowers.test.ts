/**
 * El jardín se construye con geometrías deformadas a mano y con matrices
 * precalculadas: un solo NaN se propaga a la esfera envolvente y three.js deja
 * de dibujar la flor entera. Estas pruebas cierran esa puerta.
 */
import { describe, expect, it } from 'vitest'
import {
  crearGeometriaHoja,
  crearGeometriaPetalo,
  crearGeometriaTallo,
  generarJardin,
} from './flowers'

const sinNaN = (geometria: ReturnType<typeof crearGeometriaPetalo>) => {
  const posiciones = geometria.attributes.position.array
  for (let i = 0; i < posiciones.length; i++) {
    if (!Number.isFinite(posiciones[i])) return false
  }
  return true
}

describe('geometrías procedurales', () => {
  it('el pétalo no tiene vértices NaN', () => {
    expect(sinNaN(crearGeometriaPetalo())).toBe(true)
  })

  it('la hoja no tiene vértices NaN', () => {
    expect(sinNaN(crearGeometriaHoja())).toBe(true)
  })

  it('el tallo no tiene vértices NaN', () => {
    expect(sinNaN(crearGeometriaTallo())).toBe(true)
  })

  it('las geometrías calculan una esfera envolvente válida', () => {
    for (const geo of [crearGeometriaPetalo(), crearGeometriaHoja(), crearGeometriaTallo()]) {
      geo.computeBoundingSphere()
      expect(Number.isFinite(geo.boundingSphere?.radius ?? NaN)).toBe(true)
    }
  })
})

describe('generarJardin', () => {
  const jardin = generarJardin(40, 1234)

  it('reparte las flores entre tulipanes y rosas', () => {
    expect(jardin.flores.length).toBe(40)
    expect(jardin.porTipo.tulipan.mundo.length).toBeGreaterThan(0)
    expect(jardin.porTipo.rosa.mundo.length).toBeGreaterThan(0)
    expect(jardin.porTipo.tulipan.mundo.length + jardin.porTipo.rosa.mundo.length).toBe(40)
  })

  it('da un tallo por flor y varios pétalos', () => {
    for (const tipo of ['tulipan', 'rosa'] as const) {
      const piezas = jardin.porTipo[tipo]
      expect(piezas.tallos.matrices.length).toBe(piezas.mundo.length)
      expect(piezas.petalos.matrices.length).toBeGreaterThan(piezas.mundo.length)
      expect(piezas.petalos.colores.length).toBe(piezas.petalos.matrices.length)
      expect(piezas.hojas.colores.length).toBe(piezas.hojas.matrices.length)
    }
  })

  it('no produce ninguna matriz con valores NaN', () => {
    for (const tipo of ['tulipan', 'rosa'] as const) {
      const piezas = jardin.porTipo[tipo]
      for (const lote of [piezas.petalos, piezas.tallos, piezas.hojas]) {
        for (const matriz of lote.matrices) {
          expect(matriz.elements.every(Number.isFinite)).toBe(true)
        }
      }
    }
  })

  it('es determinista para una misma semilla', () => {
    const otro = generarJardin(40, 1234)
    expect(otro.porTipo.rosa.mundo[0].elements).toEqual(jardin.porTipo.rosa.mundo[0].elements)
  })
})
