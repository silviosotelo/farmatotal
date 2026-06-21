/** Catálogo de widgets del motor. Importar este módulo registra todos. */
import { registerWidget } from '../registry'
import { heading } from './heading'
import { button } from './button'
import { image } from './image'
import { text } from './text'
import { container } from './container'
import { loop } from './loop'

export const coreWidgets = [heading, button, image, text, container, loop]

for (const w of coreWidgets) registerWidget(w)

export { heading, button, image, text, container, loop }
