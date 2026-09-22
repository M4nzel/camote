/**
 * Movimiento de cámara del paso 2D → 3D.
 *
 * Mientras se lee la carta, la cámara está muy lejos y sólo se intuye el polvo
 * estelar. Al pulsar el botón del universo, GSAP hace el zoom de entrada hasta
 * el interior de la nube de apodos y, al terminar, cede el control al usuario.
 */
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import type * as THREE from 'three'
import { camara } from './palette'

interface Props {
  revelado: boolean
  /** Se llama cuando el zoom termina, para ceder el control orbital. */
  onZoomCompleto?: (completo: boolean) => void
}

export function CameraRig({ revelado, onZoomCompleto }: Props) {
  const camaraTres = useThree((estado) => estado.camera) as THREE.PerspectiveCamera
  const avisoRef = useRef(onZoomCompleto)
  useEffect(() => {
    avisoRef.current = onZoomCompleto
  }, [onZoomCompleto])

  // Posición inicial: lejos, mirando al centro del universo.
  useEffect(() => {
    camaraTres.position.set(...camara.lejos)
    camaraTres.lookAt(0, 0, 0)
  }, [camaraTres])

  useEffect(() => {
    const destino = revelado ? camara.cerca : camara.lejos
    avisoRef.current?.(false)

    const linea = gsap.timeline({
      onComplete: () => avisoRef.current?.(revelado),
    })

    linea.to(
      camaraTres.position,
      {
        x: destino[0],
        y: destino[1],
        z: destino[2],
        duration: revelado ? 3.4 : 1.6,
        ease: revelado ? 'power3.inOut' : 'power2.inOut',
        onUpdate: () => camaraTres.lookAt(0, 0, 0),
      },
      0,
    )

    // Un pequeño empujón de campo de visión vende mejor la entrada al universo.
    linea.to(
      camaraTres,
      {
        fov: revelado ? 62 : 50,
        duration: revelado ? 3.4 : 1.6,
        ease: 'power2.inOut',
        onUpdate: () => camaraTres.updateProjectionMatrix(),
      },
      0,
    )

    return () => {
      linea.kill()
    }
  }, [revelado, camaraTres])

  return null
}
