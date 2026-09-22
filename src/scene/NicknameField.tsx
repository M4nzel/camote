/**
 * Campo de apodos: miles de palabras flotando y orbitando por el universo.
 *
 * Rendimiento — reglas que este componente respeta:
 *   · UN solo `InstancedMesh` para las ~4200 palabras (una llamada de dibujo).
 *     Nunca se instancia una geometría de texto por palabra.
 *   · El texto sale de un atlas: cada instancia elige su recorte UV con un
 *     `InstancedBufferAttribute`.
 *   · La órbita, el cabeceo y el encarado a cámara se calculan en la GPU, en el
 *     vertex shader. La CPU no toca ninguna matriz por fotograma: sólo sube un
 *     `uTiempo`.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import { paleta, universo } from './palette'
import type { AtlasTexto } from '../utils/textAtlas'
import { crearRng, puntoEnCascaraEsferica, rangoAleatorio } from '../utils/math'
import { multiplicarIndices } from '../utils/nicknames'

const VERTEX = /* glsl */ `
  uniform float uTiempo;
  uniform float uRevelado;
  uniform float uEscala;

  attribute vec4 aUvRect;   // xy = origen UV del recorte, zw = tamaño del recorte
  attribute vec3 aColor;
  attribute vec3 aAnim;     // x = velocidad orbital, y = fase, z = retardo de aparición

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vOpacidad;

  void main() {
    // Centro y escala vienen de la matriz de instancia.
    vec3 centro = vec3(instanceMatrix[3]);
    float anchoInst = length(instanceMatrix[0].xyz);
    float altoInst  = length(instanceMatrix[1].xyz);

    // Órbita alrededor del eje vertical del universo.
    float angulo = uTiempo * aAnim.x;
    float s = sin(angulo);
    float c = cos(angulo);
    vec3 p = vec3(
      centro.x * c - centro.z * s,
      centro.y,
      centro.x * s + centro.z * c
    );
    // Cabeceo suave, desfasado por instancia.
    p.y += sin(uTiempo * 0.55 + aAnim.y) * 0.45;

    // Aparición escalonada: cada palabra tiene su propio retardo.
    float t = clamp((uRevelado - aAnim.z) / max(1.0 - aAnim.z, 0.0001), 0.0, 1.0);
    float brote = t * t * (3.0 - 2.0 * t);

    // Billboard: el quad se construye en espacio de cámara, así el texto
    // siempre mira al espectador sin coste en CPU.
    vec4 mvCentro = modelViewMatrix * vec4(p, 1.0);
    vec2 esquina = position.xy * vec2(anchoInst, altoInst) * uEscala * brote;
    vec4 mvPos = mvCentro + vec4(esquina, 0.0, 0.0);

    vUv = aUvRect.xy + uv * aUvRect.zw;
    vColor = aColor;

    // Se desvanecen de lejos y de muy cerca, para no saturar la imagen.
    float dist = -mvCentro.z;
    vOpacidad = brote
      * (1.0 - smoothstep(60.0, 150.0, dist))
      * smoothstep(4.0, 16.0, dist);

    gl_Position = projectionMatrix * mvPos;
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uOpacidad;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vOpacidad;

  void main() {
    // El atlas guarda sólo la cobertura del texto (un byte por téxel).
    float cobertura = texture2D(uAtlas, vUv).r;
    float alfa = cobertura * vOpacidad * uOpacidad;
    if (alfa < 0.01) discard;
    gl_FragColor = vec4(vColor, alfa);
    #include <colorspace_fragment>
  }
`

interface Props {
  atlas: AtlasTexto
  /** Cuando pasa a true, las palabras brotan por el universo. */
  revelado: boolean
  total?: number
  /** Altura en unidades de mundo de una palabra. */
  altura?: number
}

export function NicknameField({
  atlas,
  revelado,
  total = universo.totalApodos,
  altura = 1.0,
}: Props) {
  const mallaRef = useRef<THREE.InstancedMesh>(null)

  const coloresPaleta = useMemo(
    () => paleta.apodos.map((hex) => new THREE.Color(hex)),
    [],
  )

  // Geometría compartida + atributos por instancia. Se calcula una sola vez.
  const geometria = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1)
    const celdas = atlas.celdas
    const indices = multiplicarIndices(celdas.length, total)

    const uvRect = new Float32Array(total * 4)
    const color = new Float32Array(total * 3)
    const anim = new Float32Array(total * 3)
    const rng = crearRng(9182736)

    for (let i = 0; i < total; i++) {
      const celda = celdas[indices[i]]
      uvRect[i * 4 + 0] = celda.offsetU
      uvRect[i * 4 + 1] = celda.offsetV
      uvRect[i * 4 + 2] = celda.escalaU
      uvRect[i * 4 + 3] = celda.escalaV

      const c = coloresPaleta[Math.floor(rng() * coloresPaleta.length)]
      color[i * 3 + 0] = c.r
      color[i * 3 + 1] = c.g
      color[i * 3 + 2] = c.b

      anim[i * 3 + 0] = rangoAleatorio(rng, -0.09, 0.09) // velocidad orbital
      anim[i * 3 + 1] = rangoAleatorio(rng, 0, Math.PI * 2) // fase del cabeceo
      anim[i * 3 + 2] = rng() * 0.75 // retardo de aparición
    }

    geo.setAttribute('aUvRect', new THREE.InstancedBufferAttribute(uvRect, 4))
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3))
    geo.setAttribute('aAnim', new THREE.InstancedBufferAttribute(anim, 3))
    return geo
  }, [atlas, total, coloresPaleta])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTiempo: { value: 0 },
          uRevelado: { value: 0 },
          uEscala: { value: 1 },
          uOpacidad: { value: 0.9 },
          uAtlas: { value: atlas.textura },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [atlas],
  )

  // Posición y tamaño de cada palabra: lo único que va en la matriz de instancia.
  useLayoutEffect(() => {
    const malla = mallaRef.current
    if (!malla) return
    const rng = crearRng(5150)
    const matriz = new THREE.Matrix4()
    const posicion = new THREE.Vector3()
    const rotacion = new THREE.Quaternion()
    const escala = new THREE.Vector3()
    const uvRect = geometria.getAttribute('aUvRect')

    for (let i = 0; i < total; i++) {
      const [x, y, z] = puntoEnCascaraEsferica(
        rng,
        universo.radioInterior,
        universo.radioExterior,
      )
      posicion.set(x, y, z)
      // El recorte del atlas conserva la proporción real del texto: las
      // palabras largas ocupan un quad más ancho y no se deforman.
      const anchoPx = uvRect.array[i * 4 + 2] * atlas.ancho
      const altoPx = Math.abs(uvRect.array[i * 4 + 3]) * atlas.alto
      const aspecto = anchoPx / altoPx
      const alto = altura * rangoAleatorio(rng, 0.65, 1.5)
      escala.set(alto * aspecto, alto, 1)
      matriz.compose(posicion, rotacion, escala)
      malla.setMatrixAt(i, matriz)
    }
    malla.instanceMatrix.needsUpdate = true
  }, [geometria, total, altura, atlas])

  // Aparición dirigida por GSAP, igual que la UI 2D.
  useEffect(() => {
    const tween = gsap.to(material.uniforms.uRevelado, {
      value: revelado ? 1 : 0,
      duration: revelado ? 3.2 : 0.8,
      ease: revelado ? 'power2.out' : 'power2.in',
    })
    return () => {
      tween.kill()
    }
  }, [revelado, material])

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

  return (
    <instancedMesh
      ref={mallaRef}
      args={[geometria, material, total]}
      frustumCulled={false}
      renderOrder={2}
    />
  )
}
