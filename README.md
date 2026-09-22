# Universo Camila

Una carta que se abre en 2D y se convierte en un universo 3D: miles de apodos
flotando entre tulipanes y rosas.

## Comandos

El gestor de paquetes es **pnpm**. No se usa npm en ningún punto del proyecto.

```bash
pnpm install   # dependencias
pnpm dev       # servidor de desarrollo
pnpm build     # comprobación de tipos + empaquetado de producción
pnpm test      # pruebas del generador de apodos
pnpm lint      # oxlint
```

## Cómo editar el contenido

Todo el texto vive en **`src/content/data.json`**. Ningún componente tiene
cadenas escritas a mano.

```json
{
  "carta": {
    "titulo": "...",
    "mensaje": "Una línea.\nOtra línea.",
    "boton_abrir": "Leer carta",
    "boton_universo": "Conoce mi mundo 🤧"
  },
  "nombre": "Camila",
  "apodos_base": ["Camote", "Camotito", "..."]
}
```

- `titulo` y `mensaje`: lo que se lee en la carta. `mensaje` admite varias
  líneas con `\n`; cada una entra con su propia animación.
- `boton_abrir` y `boton_universo`: el texto de los dos botones. Admiten emoji.
- `nombre`: de aquí salen **todos** los apodos inventados. Si lo cambias,
  cambia el universo entero.
- `apodos_base`: apodos **obligatorios**, que aparecen tal cual.

## Estructura

```
public/models/    Modelos .glb/.gltf opcionales (ver su README)
src/content/      data.json + su tipo y punto único de lectura
src/components/   UI 2D: carta, botones, HUD (animados con GSAP)
src/scene/        Universo 3D: canvas, luces, partículas, flores, apodos
src/utils/        Matemáticas, generador de apodos, atlas de texto, jardín
```

## Cómo se generan los apodos

Regla del proyecto: **sólo el nombre**. Nada de "corazón", "princesa" ni
cariños de catálogo. `src/utils/nicknames.ts` toma el campo `nombre` y lo
deforma como se deforman los nombres entre amigos en Perú y Chile:

| Motor              | De "Camila" sale                         |
| ------------------ | ---------------------------------------- |
| Sufijos            | Camilita, Camilucha, Camilona, Camilinga, Camilaza, Milita, Milonga |
| Raíces sueltas     | Cami, Camis, Mila, Mili, Camirris        |
| Alargamientos      | Camiii, Camilaaa, Milaaa                 |
| Reduplicación      | Cami Cami, Mila Mila                     |
| Grafía con K       | Kami, Kamila, Kamilita, Kamilucha         |

Salen unos 60 apodos únicos, más los `apodos_base` que aparecen intactos. Esa
lista se multiplica hasta las 4200 instancias del universo, repartidas por
rondas barajadas para que ningún apodo quede infrarrepresentado.

Las pruebas comprueban que ningún apodo se salga del nombre y que no se cuele
ninguna palabra de catálogo.

En desarrollo, `src/utils/validation.ts` imprime en consola el recuento y una
muestra, y comprueba que no falte ningún apodo base.

## Rendimiento: por qué todo es `InstancedMesh`

Las 4200 palabras flotantes son **un solo `InstancedMesh`**, no 4200 geometrías
de texto:

1. `src/utils/textAtlas.ts` dibuja todos los apodos en un atlas de canvas, una
   celda cada uno, y sube sólo el canal alfa como textura de un byte por téxel
   (una fracción de lo que costaría en RGBA).
2. Cada instancia elige su recorte del atlas con un `InstancedBufferAttribute`
   (`aUvRect`), su color (`aColor`) y su animación (`aAnim`).
3. El vertex shader hace la órbita, el cabeceo, la aparición escalonada y el
   encarado a cámara. Por fotograma, la CPU sólo actualiza `uTiempo`.

El jardín sigue la misma idea: una geometría de pétalo, una de tallo y una de
hoja, instanciadas por tipo de flor. Los colores de pétalos, tallos y apodos
están en `src/scene/palette.ts`.

## La carta

La carta es una hoja de papel de verdad: proporción Letter (8,5 × 11), papel
crema con rayado de cuaderno, tinta marrón y lacre rojo en el botón. Los
colores viven en variables CSS al principio de `src/index.css`.

Es responsive: en móvil ocupa el ancho completo con proporción 3/4, en pantallas
bajas se ajusta al contenido, y si el mensaje es largo la hoja crece y la capa
se puede desplazar. Los botones tienen 44 px de alto mínimo para el dedo.

## Capas y clics

```
z-index  0   .lienzo      canvas WebGL
z-index  1   .escena::after  velo radial (pointer-events: none)
z-index 10   .capa-carta  carta 2D
z-index 20   .hud         apodos y botón de volver
```

Las capas 10 y 20 son contenedores con `pointer-events: none`; sólo sus hijos
interactivos lo recuperan, y los pierden al desvanecerse. Así el canvas 3D
siempre recibe el ratón cuando le toca, sin que ninguna capa transparente le
robe los clics.
