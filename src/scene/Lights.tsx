/** Iluminación del universo: una base cálida, dos focos de color y un halo. */
import { paleta } from './palette'

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} color={paleta.brillo} />
      {/* Núcleo cálido del universo, en el centro de la escena. */}
      <pointLight position={[0, 0, 0]} intensity={220} distance={70} color={paleta.nebulosaCalida} />
      {/* Contraluz frío para separar las flores del fondo. */}
      <pointLight position={[-24, 18, -20]} intensity={340} distance={110} color={paleta.nebulosaFria} />
      <directionalLight position={[12, 20, 14]} intensity={1.1} color={paleta.brillo} />
      <hemisphereLight args={[paleta.nebulosaCalida, paleta.fondoMedio, 0.5]} />
    </>
  )
}
