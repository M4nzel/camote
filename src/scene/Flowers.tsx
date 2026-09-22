/**
 * Jardín flotante: tulipanes y rosas repartidos por el universo.
 *
 * Igual que los apodos, todo va con `InstancedMesh`: por cada tipo de flor hay
 * tres llamadas de dibujo (pétalos, tallos, hojas) para ~60 flores y cientos de
 * pétalos.
 *
 * Si se dejan modelos en `public/models` (`tulipan.glb` / `rosa.glb`), ese tipo
 * de flor pasa a dibujarse con el modelo, también instanciado. Sin modelos, el
 * jardín procedural se dibuja igual: la escena nunca se queda vacía.
 */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import {
  crearGeometriaHoja,
  crearGeometriaPetalo,
  crearGeometriaTallo,
  generarJardin,
} from '../utils/flowers'
import type { LoteInstancias, PiezasFlor, TipoFlor } from '../utils/flowers'
import { universo } from './palette'
import { useOptionalModels } from './useOptionalModels'

interface Props {
  revelado: boolean
  cantidad?: number
}

/** Un `InstancedMesh` cuyas matrices y colores se cargan una sola vez. */
function Lote({
  geometria,
  material,
  lote,
  renderOrder,
}: {
  geometria: THREE.BufferGeometry
  material: THREE.Material
  lote: LoteInstancias
  renderOrder?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const malla = ref.current
    if (!malla) return
    for (let i = 0; i < lote.matrices.length; i++) {
      malla.setMatrixAt(i, lote.matrices[i])
      malla.setColorAt(i, lote.colores[i])
    }
    malla.instanceMatrix.needsUpdate = true
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    malla.computeBoundingSphere()
  }, [lote])

  if (lote.matrices.length === 0) return null

  return (
    <instancedMesh
      ref={ref}
      args={[geometria, material, lote.matrices.length]}
      renderOrder={renderOrder}
    />
  )
}

/** Flores procedurales de un tipo: tallo, hojas y pétalos. */
function FlorProcedural({
  piezas,
  geometrias,
  materiales,
}: {
  piezas: PiezasFlor
  geometrias: { petalo: THREE.BufferGeometry; tallo: THREE.BufferGeometry; hoja: THREE.BufferGeometry }
  materiales: { petalo: THREE.Material; verde: THREE.Material }
}) {
  return (
    <>
      <Lote geometria={geometrias.tallo} material={materiales.verde} lote={piezas.tallos} />
      <Lote geometria={geometrias.hoja} material={materiales.verde} lote={piezas.hojas} />
      <Lote
        geometria={geometrias.petalo}
        material={materiales.petalo}
        lote={piezas.petalos}
        renderOrder={1}
      />
    </>
  )
}

/**
 * Flores a partir de un `.glb`: cada malla del modelo se instancia una vez por
 * flor, reutilizando su geometría y su material originales.
 */
function FlorDeModelo({ ruta, mundo }: { ruta: string; mundo: THREE.Matrix4[] }) {
  const { scene } = useGLTF(ruta)

  // Aplana el modelo a pares geometría/material en espacio del modelo.
  const partes = useMemo(() => {
    const encontradas: { geometria: THREE.BufferGeometry; material: THREE.Material }[] = []
    scene.updateMatrixWorld(true)
    scene.traverse((objeto) => {
      const malla = objeto as THREE.Mesh
      if (!malla.isMesh) return
      const geometria = malla.geometry.clone()
      geometria.applyMatrix4(malla.matrixWorld)
      const material = Array.isArray(malla.material) ? malla.material[0] : malla.material
      encontradas.push({ geometria, material })
    })
    return encontradas
  }, [scene])

  useEffect(
    () => () => {
      partes.forEach((parte) => parte.geometria.dispose())
    },
    [partes],
  )

  return (
    <>
      {partes.map((parte, i) => (
        <InstanciasDeModelo
          key={i}
          geometria={parte.geometria}
          material={parte.material}
          mundo={mundo}
        />
      ))}
    </>
  )
}

function InstanciasDeModelo({
  geometria,
  material,
  mundo,
}: {
  geometria: THREE.BufferGeometry
  material: THREE.Material
  mundo: THREE.Matrix4[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const malla = ref.current
    if (!malla) return
    for (let i = 0; i < mundo.length; i++) malla.setMatrixAt(i, mundo[i])
    malla.instanceMatrix.needsUpdate = true
    malla.computeBoundingSphere()
  }, [mundo])

  if (mundo.length === 0) return null

  return <instancedMesh ref={ref} args={[geometria, material, mundo.length]} />
}

export function Flowers({ revelado, cantidad = universo.totalFlores }: Props) {
  const grupoRef = useRef<THREE.Group>(null)
  const jardin = useMemo(() => generarJardin(cantidad), [cantidad])
  const modelos = useOptionalModels()

  const geometrias = useMemo(
    () => ({
      petalo: crearGeometriaPetalo(),
      tallo: crearGeometriaTallo(),
      hoja: crearGeometriaHoja(),
    }),
    [],
  )

  const materiales = useMemo(
    () => ({
      petalo: new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.45,
        metalness: 0.05,
        emissive: new THREE.Color('#3a2404'),
        emissiveIntensity: 0.6,
      }),
      verde: new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0,
      }),
    }),
    [],
  )

  useEffect(
    () => () => {
      Object.values(geometrias).forEach((g) => g.dispose())
      Object.values(materiales).forEach((m) => m.dispose())
    },
    [geometrias, materiales],
  )

  // El jardín brota al revelar el universo.
  useEffect(() => {
    const grupo = grupoRef.current
    if (!grupo) return
    const destino = revelado ? 1 : 0.001
    const tween = gsap.to(grupo.scale, {
      x: destino,
      y: destino,
      z: destino,
      duration: revelado ? 2.4 : 0.6,
      ease: revelado ? 'back.out(1.4)' : 'power2.in',
    })
    return () => {
      tween.kill()
    }
  }, [revelado])

  // Deriva lenta de todo el jardín, para que el universo nunca esté quieto.
  useFrame((_, delta) => {
    if (grupoRef.current) grupoRef.current.rotation.y += delta * 0.018
  })

  const tipos: TipoFlor[] = ['tulipan', 'rosa']

  return (
    <group ref={grupoRef} scale={0.001}>
      {tipos.map((tipo) => {
        const piezas = jardin.porTipo[tipo]
        const ruta = modelos[tipo]
        const procedural = (
          <FlorProcedural piezas={piezas} geometrias={geometrias} materiales={materiales} />
        )
        return ruta ? (
          <Suspense key={tipo} fallback={procedural}>
            <FlorDeModelo ruta={ruta} mundo={piezas.mundo} />
          </Suspense>
        ) : (
          <group key={tipo}>{procedural}</group>
        )
      })}
    </group>
  )
}
