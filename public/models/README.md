# Modelos opcionales

El jardín del universo es **procedural**: los tulipanes y las rosas se generan
con código en `src/utils/flowers.ts`, así que la escena funciona sin ningún
archivo aquí dentro.

Si quieres usar modelos reales, deja en esta carpeta:

| Archivo                       | Sustituye a           |
| ----------------------------- | --------------------- |
| `tulipan.glb` / `tulipan.gltf` | Los tulipanes         |
| `rosa.glb` / `rosa.gltf`       | Las rosas             |

`src/scene/useOptionalModels.ts` los detecta al arrancar (con una petición
`HEAD`) y `src/scene/Flowers.tsx` pasa a instanciarlos en lugar de la geometría
procedural. Si sólo dejas uno de los dos, el otro tipo de flor sigue siendo
procedural.

Requisitos del modelo:

- Una flor completa (tallo incluido), con la base en el origen y creciendo
  hacia **+Y**.
- Altura aproximada de 1,5 unidades; la escena aplica después su propia escala.
- Cuantas menos mallas tenga, mejor: cada malla del `.glb` se convierte en un
  `InstancedMesh` propio.
