/**
 * Comprobación de arranque: verifica que `data.json` se lee bien y que la
 * combinación "apodos base + apodos inventados" funciona.
 * Sólo se ejecuta en desarrollo.
 */
import { apodosBase, carta, contenido, nombre } from '../content'
import { inventarApodos } from './nicknames'

export function validarContenido(apodosFinales: readonly string[]): void {
  const faltan = (['titulo', 'mensaje', 'boton_abrir', 'boton_universo'] as const).filter(
    (campo) => typeof carta[campo] !== 'string' || carta[campo].length === 0,
  )

  const inventados = inventarApodos(nombre)
  const baseIncluida = apodosBase.every((apodo) => apodosFinales.includes(apodo))
  const duplicados = apodosFinales.length !== new Set(apodosFinales).size

  console.group('%c🌸 Universo Camila — validación de contenido', 'color:#ff8fc7')
  console.log('data.json leído:', contenido)
  if (faltan.length > 0) console.error('Campos vacíos en la carta:', faltan)
  console.table({
    'Nombre de origen': nombre,
    'Apodos base (data.json)': apodosBase.length,
    'Apodos inventados desde el nombre': inventados.length,
    'Apodos únicos finales': apodosFinales.length,
  })
  console.log('Base:', apodosBase.join(' · '))
  console.log('Inventados:', inventados.join(' · '))
  console.assert(baseIncluida, 'Faltan apodos base en la lista final')
  console.assert(!duplicados, 'Hay apodos duplicados en la lista final')
  console.log(
    baseIncluida && !duplicados && faltan.length === 0
      ? '%c✔ Todo correcto'
      : '%c✘ Revisa los avisos de arriba',
    baseIncluida && !duplicados && faltan.length === 0
      ? 'color:#6ee7a4'
      : 'color:#ff6b6b',
  )
  console.groupEnd()
}
