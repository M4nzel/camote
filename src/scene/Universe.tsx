/**
 * El canvas WebGL: fondo, luces, polvo estelar, jardín y campo de apodos.
 *
 * Vive siempre detrás de la UI 2D (z-index 0 frente al 10 de la capa de la
 * carta). El control orbital sólo se monta cuando el zoom ha terminado, para
 * que no compita con la animación de cámara de GSAP.
 */
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { AtlasTexto } from '../utils/textAtlas'
import { CameraRig } from './CameraRig'
import { Flowers } from './Flowers'
import { Lights } from './Lights'
import { NicknameField } from './NicknameField'
import { Particles } from './Particles'
import { camara, paleta } from './palette'

interface Props {
  revelado: boolean
  atlas: AtlasTexto | null
}

export function Universe({ revelado, atlas }: Props) {
  const [orbitalListo, setOrbitalListo] = useState(false)

  return (
    <Canvas
      className="lienzo"
      // React Three Fiber aplica estilos en línea al contenedor, y esos ganan
      // a cualquier clase: por eso la posición se fija aquí y el CSS sólo se
      // ocupa del z-index.
      style={{ position: 'fixed', inset: 0 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 50, near: 0.1, far: 500, position: camara.lejos }}
    >
      <color attach="background" args={[paleta.fondoProfundo]} />
      <fog attach="fog" args={[paleta.fondoMedio, 80, 260]} />

      <Lights />
      <Particles />
      <Flowers revelado={revelado} />
      {atlas && <NicknameField atlas={atlas} revelado={revelado} />}

      <CameraRig revelado={revelado} onZoomCompleto={setOrbitalListo} />
      {orbitalListo && revelado && (
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          minDistance={10}
          maxDistance={130}
          autoRotate
          autoRotateSpeed={0.35}
        />
      )}
    </Canvas>
  )
}
