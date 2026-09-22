/**
 * Polvo estelar de fondo: un único `Points` con varios miles de partículas.
 * Parpadean y giran en el shader, así que no cuestan nada en CPU.
 */
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { crearRng, puntoEnCascaraEsferica, rangoAleatorio } from '../utils/math'
import { paleta } from './palette'

const VERTEX = /* glsl */ `
  uniform float uTiempo;
  uniform float uTamano;
  uniform float uPixelRatio;

  attribute float aFase;
  attribute float aTamano;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vBrillo;

  void main() {
    float angulo = uTiempo * 0.012;
    float s = sin(angulo);
    float c = cos(angulo);
    vec3 p = vec3(
      position.x * c - position.z * s,
      position.y,
      position.x * s + position.z * c
    );

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // El factor de distancia mantiene las estrellas visibles tanto desde el
    // punto de vista lejano de la carta como desde dentro del universo.
    gl_PointSize = uTamano * aTamano * uPixelRatio * (130.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 26.0);

    vColor = aColor;
    vBrillo = 0.45 + 0.55 * sin(uTiempo * 1.4 + aFase);
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uOpacidad;

  varying vec3 vColor;
  varying float vBrillo;

  void main() {
    // Punto redondo con caída suave: evita el cuadrado duro del point sprite.
    float d = length(gl_PointCoord - 0.5);
    float alfa = smoothstep(0.5, 0.06, d) * vBrillo * uOpacidad;
    if (alfa < 0.01) discard;
    gl_FragColor = vec4(vColor, alfa);
    #include <colorspace_fragment>
  }
`

interface Props {
  total?: number
  opacidad?: number
}

export function Particles({ total = 2600, opacidad = 0.8 }: Props) {
  const geometria = useMemo(() => {
    const rng = crearRng(31415)
    const posiciones = new Float32Array(total * 3)
    const colores = new Float32Array(total * 3)
    const fases = new Float32Array(total)
    const tamanos = new Float32Array(total)
    const paletaColores = paleta.apodos.map((hex) => new THREE.Color(hex))

    for (let i = 0; i < total; i++) {
      const [x, y, z] = puntoEnCascaraEsferica(rng, 14, 120)
      posiciones[i * 3 + 0] = x
      posiciones[i * 3 + 1] = y
      posiciones[i * 3 + 2] = z

      const c = paletaColores[Math.floor(rng() * paletaColores.length)]
      colores[i * 3 + 0] = c.r
      colores[i * 3 + 1] = c.g
      colores[i * 3 + 2] = c.b

      fases[i] = rangoAleatorio(rng, 0, Math.PI * 2)
      tamanos[i] = rangoAleatorio(rng, 0.4, 1.8)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colores, 3))
    geo.setAttribute('aFase', new THREE.BufferAttribute(fases, 1))
    geo.setAttribute('aTamano', new THREE.BufferAttribute(tamanos, 1))
    return geo
  }, [total])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTiempo: { value: 0 },
          uTamano: { value: 2.6 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uOpacidad: { value: opacidad },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [opacidad],
  )

  useFrame((_, delta) => {
    // Escribir en un uniform cada fotograma es la forma correcta de animar en
    // la GPU: no es estado de React, es memoria del material.
    // oxlint-disable-next-line react/immutability
    material.uniforms.uTiempo.value += delta
  })

  useEffect(
    () => () => {
      geometria.dispose()
      material.dispose()
    },
    [geometria, material],
  )

  return <points args={[geometria, material]} frustumCulled={false} />
}
