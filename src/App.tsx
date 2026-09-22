/**
 * Universo Camila — orquestador de las tres fases.
 *
 *   sobre  →  carta  →  universo
 *
 * El canvas WebGL está siempre montado detrás de la UI; lo que cambia es la
 * fase, que dispara a la vez la coreografía 2D (GSAP en `Letter`) y la 3D
 * (zoom de cámara, brote del jardín y aparición de los apodos).
 */
import { useEffect, useState } from 'react'
import { Letter } from './components/Letter'
import type { Fase } from './components/Letter'
import { UniverseHud } from './components/UniverseHud'
import { Universe } from './scene/Universe'
import { useNicknameAtlas } from './scene/useNicknameAtlas'
import { validarContenido } from './utils/validation'

export default function App() {
  const [fase, setFase] = useState<Fase>('sobre')
  const [hudVisible, setHudVisible] = useState(false)
  const { apodos, atlas } = useNicknameAtlas()

  useEffect(() => {
    if (import.meta.env.DEV) validarContenido(apodos)
  }, [apodos])

  const volverALaCarta = () => {
    setHudVisible(false)
    setFase('carta')
  }

  return (
    <main className={`escena escena--${fase}`}>
      <Universe revelado={fase === 'universo'} atlas={atlas} />

      <Letter
        fase={fase}
        onAbrir={() => setFase('carta')}
        onUniverso={() => setFase('universo')}
        onDesvanecida={() => setHudVisible(true)}
      />

      <UniverseHud visible={hudVisible} apodos={apodos} onVolver={volverALaCarta} />
    </main>
  )
}
