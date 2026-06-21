/** Widget Texto / Párrafo (leaf). Contenido HTML (dinámico) + tipografía/estilo. */
import { createElement } from 'react'
import { defineWidget } from '../schema/types'

export const text = defineWidget({
    type: 'text',
    label: 'Texto',
    group: 'Básico',
    props: {
        html: { $type: 'richtext', label: 'Contenido', default: 'Escribí aquí el contenido…', dynamic: true, group: 'Contenido' },
        align: {
            $type: 'enum',
            label: 'Alineación',
            default: 'left',
            responsive: true,
            options: [
                { value: 'left', label: 'Izquierda' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Derecha' },
            ],
            style: { css: 'text-align' },
            group: 'Estilo',
        },
        color: { $type: 'color', label: 'Color', style: { css: 'color' }, group: 'Estilo' },
        typography: { $type: 'typography', label: 'Tipografía', responsive: true, style: { css: 'font' }, group: 'Estilo' },
    },
    render: (s, h) => {
        const html = s.html == null ? '' : String(s.html)
        return createElement('div', { className: h.rootClass, dangerouslySetInnerHTML: { __html: html } })
    },
})
