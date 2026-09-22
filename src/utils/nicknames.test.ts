/**
 * El contrato del generador: los apodos obligatorios de `data.json` nunca se
 * pierden, los inventados salen SÓLO del nombre propio, y no hay repetidos.
 */
import { describe, expect, it } from 'vitest'
import { apodosBase, carta, nombre } from '../content'
import { crearApodos, inventarApodos, multiplicarIndices } from './nicknames'

const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

describe('data.json', () => {
  it('trae la carta completa', () => {
    expect(carta.titulo.length).toBeGreaterThan(0)
    expect(carta.mensaje.length).toBeGreaterThan(0)
    expect(carta.boton_abrir.length).toBeGreaterThan(0)
    expect(carta.boton_universo.length).toBeGreaterThan(0)
  })

  it('trae el nombre y los apodos base obligatorios', () => {
    expect(nombre).toBe('Camila')
    expect(apodosBase).toContain('Camote')
    expect(apodosBase).toContain('Camilin Pipilin')
    expect(apodosBase.length).toBe(6)
  })
})

describe('inventarApodos', () => {
  const inventados = inventarApodos(nombre)

  it('inventa decenas de apodos', () => {
    expect(inventados.length).toBeGreaterThanOrEqual(40)
  })

  it('todos arrancan por un trozo del nombre, sin palabras de fuera', () => {
    // "Camila" sólo puede dar apodos que empiecen por Cami-, Kami-, Mil- o Mila-.
    const permitidos = ['cami', 'kami', 'mil']
    for (const apodo of inventados) {
      const limpio = sinTildes(apodo)
      expect(
        permitidos.some((p) => limpio.startsWith(p)),
        `"${apodo}" no deriva del nombre`,
      ).toBe(true)
    }
  })

  it('no cuela cariños de catálogo', () => {
    const prohibidas = [
      'corazon', 'princesa', 'reina', 'chiquita', 'cielo', 'amor',
      'vida', 'bombon', 'estrella', 'flor', 'dulce', 'miel',
    ]
    for (const apodo of inventados) {
      const limpio = sinTildes(apodo)
      for (const mala of prohibidas) expect(limpio).not.toContain(mala)
    }
  })

  it('se adapta a otro nombre', () => {
    const otros = inventarApodos('Valeria')
    expect(otros.some((a) => sinTildes(a).startsWith('vale'))).toBe(true)
    expect(otros.some((a) => sinTildes(a).startsWith('cami'))).toBe(false)
  })

  it('no produce recortes de menos de cuatro letras', () => {
    for (const apodo of inventados) {
      expect(apodo.replace(/[^\p{L}]/gu, '').length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('crearApodos', () => {
  const apodos = crearApodos()

  it('conserva todos los apodos base', () => {
    for (const base of apodosBase) expect(apodos).toContain(base)
  })

  it('llega a decenas de apodos únicos', () => {
    expect(apodos.length).toBeGreaterThanOrEqual(45)
    expect(new Set(apodos).size).toBe(apodos.length)
  })

  it('no deja cadenas vacías ni espacios sobrantes', () => {
    for (const apodo of apodos) {
      expect(apodo).toBe(apodo.trim())
      expect(apodo.length).toBeGreaterThan(0)
    }
  })

  it('es determinista entre ejecuciones', () => {
    expect(crearApodos()).toEqual(apodos)
  })
})

describe('multiplicarIndices', () => {
  it('llena las miles de instancias usando todos los apodos', () => {
    const total = 4200
    const apodos = crearApodos()
    const indices = multiplicarIndices(apodos.length, total)

    expect(indices.length).toBe(total)
    expect(new Set(indices).size).toBe(apodos.length)
    for (const i of indices) expect(i).toBeLessThan(apodos.length)
  })

  it('reparte de forma pareja, sin apodos infrarrepresentados', () => {
    const apodos = crearApodos()
    const indices = multiplicarIndices(apodos.length, 4200)
    const cuentas = new Array<number>(apodos.length).fill(0)
    for (const i of indices) cuentas[i]++
    expect(Math.max(...cuentas) - Math.min(...cuentas)).toBeLessThanOrEqual(1)
  })
})
