/**
 * Prepara la lista de apodos y su atlas de textura.
 *
 * El atlas se pinta una sola vez, después de que la tipografía esté cargada,
 * y se libera al desmontar. Mientras no esté listo, el campo de apodos
 * sencillamente no se dibuja: la escena arranca igual.
 */
import { useEffect, useMemo, useState } from 'react'
import { crearApodos } from '../utils/nicknames'
import { crearAtlasTexto, esperarFuente } from '../utils/textAtlas'
import type { AtlasTexto } from '../utils/textAtlas'

export function useNicknameAtlas() {
  const apodos = useMemo(() => crearApodos(), [])
  const [atlas, setAtlas] = useState<AtlasTexto | null>(null)

  useEffect(() => {
    let vigente = true
    let creado: AtlasTexto | null = null

    esperarFuente().then(() => {
      if (!vigente) return
      creado = crearAtlasTexto(apodos)
      setAtlas(creado)
    })

    return () => {
      vigente = false
      creado?.dispose()
    }
  }, [apodos])

  return { apodos, atlas }
}
