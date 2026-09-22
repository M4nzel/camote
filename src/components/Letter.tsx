/**
 * La carta en 2D y toda su coreografía GSAP.
 *
 * Secuencia:
 *   1. `sobre`    — el sobre cerrado con el título y el botón de abrir.
 *   2. `carta`    — la solapa se abre, el papel sube y las líneas del mensaje
 *                   entran escalonadas; al final aparece el botón del universo.
 *   3. `universo` — toda la capa 2D se desvanece hacia arriba y avisa al padre
 *                   para que arranque el zoom de cámara.
 *
 * Ningún texto está escrito aquí: todo sale de `src/content/data.json`.
 */
import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { carta } from '../content'
import { ActionButton } from './ActionButton'

export type Fase = 'sobre' | 'carta' | 'universo'

interface Props {
  fase: Fase
  onAbrir: () => void
  onUniverso: () => void
  /** Se dispara cuando la capa 2D ya ha terminado de desvanecerse. */
  onDesvanecida?: () => void
}

export function Letter({ fase, onAbrir, onUniverso, onDesvanecida }: Props) {
  const capaRef = useRef<HTMLDivElement>(null)
  const sobreRef = useRef<HTMLDivElement>(null)
  const solapaRef = useRef<HTMLDivElement>(null)
  const papelRef = useRef<HTMLDivElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const lineasRef = useRef<HTMLDivElement>(null)
  const botonAbrirRef = useRef<HTMLButtonElement>(null)
  const botonUniversoRef = useRef<HTMLButtonElement>(null)
  const avisoRef = useRef(onDesvanecida)
  useEffect(() => {
    avisoRef.current = onDesvanecida
  }, [onDesvanecida])

  const lineas = useMemo(
    () => carta.mensaje.split('\n').filter((linea) => linea.trim().length > 0),
    [],
  )

  // Entrada inicial del sobre. Se guarda la línea de tiempo para poder
  // completarla de golpe si la lectora pulsa antes de que termine.
  const entradaRef = useRef<gsap.core.Timeline | null>(null)
  useEffect(() => {
    // `fromTo` y no `from`: en una línea de tiempo, los hijos que arrancan más
    // tarde pueden tomar como destino el valor inicial que ya se les aplicó.
    // Declarando los dos extremos, el resultado es siempre el mismo.
    const entrada = gsap.timeline({ defaults: { ease: 'power2.out' } })
    entrada
      .fromTo(
        sobreRef.current,
        { y: 60, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' },
        0,
      )
      .fromTo(
        tituloRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
        0.25,
      )
      .fromTo(
        botonAbrirRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0.55,
      )

    entradaRef.current = entrada
    return () => {
      entrada.kill()
    }
  }, [])

  // Apertura de la carta. Se lanza una sola vez y sobrevive a los cambios de
  // fase: sólo se descarta al desmontar, nunca se revierten sus estilos.
  const aperturaRef = useRef<gsap.core.Timeline | null>(null)
  useEffect(() => {
    if (fase === 'sobre' || aperturaRef.current) return
    // Si la entrada aún corría, se salta al final: de lo contrario sus tweens
    // pisarían el desvanecido del botón de abrir.
    entradaRef.current?.progress(1)

    const linea = gsap.timeline({ defaults: { ease: 'power3.out' } })
    linea
      .to(botonAbrirRef.current, { opacity: 0, y: -12, duration: 0.35 })
      .to(solapaRef.current, { rotateX: -170, duration: 0.9 }, '-=0.1')
      .fromTo(
        papelRef.current,
        { yPercent: 12, opacity: 0, scaleY: 0.86 },
        { yPercent: 0, opacity: 1, scaleY: 1, duration: 0.9 },
        '-=0.45',
      )
      .fromTo(
        Array.from(lineasRef.current?.children ?? []),
        { y: 22, opacity: 0, filter: 'blur(6px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.16 },
        '-=0.4',
      )
      .fromTo(
        botonUniversoRef.current,
        { y: 22, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' },
        '-=0.15',
      )

    aperturaRef.current = linea
  }, [fase])

  useEffect(
    () => () => {
      aperturaRef.current?.kill()
    },
    [],
  )

  // Desvanecido de la UI 2D al entrar al universo, y reaparición al volver.
  useEffect(() => {
    if (fase === 'sobre') return
    const saliendo = fase === 'universo'
    // La carta se va (o vuelve) con la apertura ya resuelta, nunca a medias.
    if (saliendo) aperturaRef.current?.progress(1)

    const tween = gsap.to(sobreRef.current, {
      y: saliendo ? -70 : 0,
      opacity: saliendo ? 0 : 1,
      scale: saliendo ? 0.94 : 1,
      filter: saliendo ? 'blur(14px)' : 'blur(0px)',
      duration: 1.1,
      ease: 'power2.inOut',
      onComplete: () => {
        if (saliendo) avisoRef.current?.()
      },
    })

    return () => {
      tween.kill()
    }
  }, [fase])

  const oculta = fase === 'universo'

  return (
    <div
      ref={capaRef}
      className={`capa-carta ${oculta ? 'capa-carta--oculta' : ''}`.trim()}
      // Cuando la carta se va, la capa deja de capturar clics para que el
      // canvas 3D reciba el ratón sin que ningún z-index lo bloquee.
      aria-hidden={oculta}
    >
      <div ref={sobreRef} className="sobre">
        <div ref={solapaRef} className="sobre__solapa" aria-hidden="true" />

        <div className="sobre__cuerpo">
          <h1 ref={tituloRef} className="sobre__titulo">
            {carta.titulo}
          </h1>

          {/* El botón de abrir no se desmonta al pasar de fase: GSAP necesita
              seguir teniéndolo para desvanecerlo. */}
          <ActionButton
            ref={botonAbrirRef}
            etiqueta={carta.boton_abrir}
            onClick={onAbrir}
            className={fase === 'sobre' ? '' : 'boton--retirado'}
            tabIndex={fase === 'sobre' ? 0 : -1}
          />

          {fase !== 'sobre' && (
            <div ref={papelRef} className="papel">
              <div ref={lineasRef} className="papel__mensaje">
                {lineas.map((linea, i) => (
                  <p key={i} className="papel__linea">
                    {linea}
                  </p>
                ))}
              </div>
              <ActionButton
                ref={botonUniversoRef}
                etiqueta={carta.boton_universo}
                variante="magica"
                onClick={onUniverso}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
