'use client'

// API pública de @ft/ui consumida por el store (Next App Router).
// 'use client' marca todos los componentes Ecme como client components, para que
// funcionen como islas interactivas dentro de los temas (que pueden ser Server
// Components). El admin (Vite) importa por subpath/alias y NO usa este barrel,
// así que esta directiva no lo afecta.
export * from './ui'
export * from './shared'
