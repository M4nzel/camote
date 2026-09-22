/**
 * Detección de modelos opcionales en `/public/models`.
 *
 * El jardín procedural funciona sin ningún asset. Si alguien deja un
 * `tulipan.glb` o un `rosa.glb` en `public/models/`, este hook lo detecta en
 * caliente y la escena pasa a usarlo para ese tipo de flor. La comprobación se
 * hace con una petición HEAD para no descargar el modelo dos veces ni provocar
 * un error de Suspense cuando el archivo no existe.
 */
import { useEffect, useState } from 'react'
import type { TipoFlor } from '../utils/flowers'

export type ModelosFlores = Partial<Record<TipoFlor, string>>

const base = import.meta.env.BASE_URL
const RUTAS: Record<TipoFlor, string[]> = {
  tulipan: [`${base}models/tulipan.glb`, `${base}models/tulipan.gltf`],
  rosa: [`${base}models/rosa.glb`, `${base}models/rosa.gltf`],
}

async function primeraRutaDisponible(rutas: string[]): Promise<string | null> {
  for (const ruta of rutas) {
    try {
      const respuesta = await fetch(ruta, { method: 'HEAD' })
      // El servidor de desarrollo de Vite responde 200 con index.html para
      // rutas desconocidas, así que también se comprueba el tipo de contenido.
      const tipo = respuesta.headers.get('content-type') ?? ''
      if (respuesta.ok && !tipo.includes('text/html')) return ruta
    } catch {
      // Sin red o ruta inexistente: se sigue con la siguiente.
    }
  }
  return null
}

export function useOptionalModels(): ModelosFlores {
  const [modelos, setModelos] = useState<ModelosFlores>({})

  useEffect(() => {
    let vigente = true
    const tipos = Object.keys(RUTAS) as TipoFlor[]
    Promise.all(tipos.map((tipo) => primeraRutaDisponible(RUTAS[tipo]))).then(
      (rutas) => {
        if (!vigente) return
        const encontrados: ModelosFlores = {}
        rutas.forEach((ruta, i) => {
          if (ruta) encontrados[tipos[i]] = ruta
        })
        setModelos(encontrados)
      },
    )
    return () => {
      vigente = false
    }
  }, [])

  return modelos
}
