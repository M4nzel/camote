/** Paleta compartida por la UI 2D (variables CSS) y el universo 3D. */
export const paleta = {
  fondoProfundo: '#080312',
  fondoMedio: '#1b0b2e',
  nebulosaCalida: '#ff8fc7',
  nebulosaFria: '#6f7bff',
  brillo: '#ffe9f4',
  /** Colores con los que se tiñen los apodos flotantes. */
  apodos: ['#ffd7ec', '#ffb3d9', '#c6b8ff', '#9fe8ff', '#fff3c4', '#ffffff'],
  /** Tulipanes y rosas: todo el jardín en amarillos y dorados. */
  petalosTulipan: ['#ffd23f', '#ffc300', '#ffe27a', '#f7b733', '#ffdd6b'],
  petalosRosa: ['#f5c518', '#ffd95a', '#e8a91d', '#ffcf40', '#ffe9a3'],
  tallo: '#3f8f5f',
  hoja: '#4aa96c',
} as const

/** Radios de la nube de apodos y del jardín de flores. */
export const universo = {
  /* La nube de apodos es una cáscara esférica ancha: las miles de palabras
     necesitan volumen de sobra para leerse con profundidad y no formar un muro. */
  radioInterior: 16,
  radioExterior: 112,
  radioJardinInterior: 7,
  radioJardinExterior: 38,
  totalApodos: 4200,
  totalFlores: 140,
} as const

/** Posiciones de cámara del zoom 2D → 3D. */
export const camara: {
  lejos: [number, number, number]
  cerca: [number, number, number]
} = {
  /** Muy lejos, mientras se lee la carta. */
  lejos: [0, 6, 150],
  /** Dentro de la nube de apodos, tras el zoom. */
  cerca: [0, 8, 46],
}
