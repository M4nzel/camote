/**
 * Capa flotante que acompaña al universo 3D.
 *
 * Muestra apodos generados encadenándose, y el botón de volver a la carta.
 * Todo el texto sale de los apodos generados o de `data.json`: aquí no hay ni
 * una cadena escrita a mano.
 */
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { carta } from '../content'
import { ActionButton } from './ActionButton'

interface Props {
  visible: boolean
  apodos: readonly string[]
  onVolver: () => void
}

export function UniverseHud({ visible, apodos, onVolver }: Props) {
  const capaRef = useRef<HTMLDivElement>(null)
  const apodoRef = useRef<HTMLParagraphElement>(null)
  const [indice, setIndice] = useState(0)

  // Entrada y salida de la capa completa.
  useEffect(() => {
    const capa = capaRef.current
    if (!capa) return
    const tween = gsap.to(capa, {
      opacity: visible ? 1 : 0,
      y: visible ? 0 : 18,
      duration: 0.9,
      delay: visible ? 0.6 : 0,
      ease: 'power2.out',
    })
    return () => {
      tween.kill()
    }
  }, [visible])

  // Relevo de apodos: uno cada tres segundos y medio.
  useEffect(() => {
    if (!visible || apodos.length === 0) return
    const id = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % apodos.length)
    }, 3500)
    return () => window.clearInterval(id)
  }, [visible, apodos.length])

  // Cada relevo entra con su propia animación.
  useEffect(() => {
    const nodo = apodoRef.current
    if (!nodo || !visible) return
    const tween = gsap.fromTo(
      nodo,
      { opacity: 0, y: 14, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' },
    )
    return () => {
      tween.kill()
    }
  }, [indice, visible])

  return (
    <div
      ref={capaRef}
      className={`hud ${visible ? 'hud--visible' : ''}`.trim()}
      aria-hidden={!visible}
    >
      <p ref={apodoRef} className="hud__apodo">
        {apodos[indice] ?? ''}
      </p>
      <ActionButton
        etiqueta={carta.boton_abrir}
        variante="discreta"
        onClick={onVolver}
        tabIndex={visible ? 0 : -1}
      />
    </div>
  )
}
