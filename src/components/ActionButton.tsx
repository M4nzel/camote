/** Botón de la carta. El texto siempre llega desde `data.json`. */
import type { ButtonHTMLAttributes, Ref } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  etiqueta: string
  variante?: 'principal' | 'magica' | 'discreta'
  ref?: Ref<HTMLButtonElement>
}

export function ActionButton({
  etiqueta,
  variante = 'principal',
  className = '',
  ref,
  ...resto
}: Props) {
  return (
    <button
      ref={ref}
      type="button"
      className={`boton boton--${variante} ${className}`.trim()}
      {...resto}
    >
      <span className="boton__brillo" aria-hidden="true" />
      <span className="boton__texto">{etiqueta}</span>
    </button>
  )
}
