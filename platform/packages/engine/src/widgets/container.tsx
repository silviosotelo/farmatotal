/** Widget Container (layout). Flex/Grid + gap/padding/fondo; renderiza sus hijos. */
import { createElement } from 'react'
import { defineWidget } from '../schema/types'

export const container = defineWidget({
    type: 'container',
    label: 'Contenedor',
    group: 'Layout',
    acceptsChildren: true,
    props: {
        layout: {
            $type: 'enum',
            label: 'Disposición',
            default: 'column',
            options: [
                { value: 'column', label: 'Columna (vertical)' },
                { value: 'row', label: 'Fila (horizontal)' },
                { value: 'grid', label: 'Grilla' },
            ],
            group: 'Layout',
        },
        columns: { $type: 'number', label: 'Columnas (grilla)', default: 3, group: 'Layout' },
        align: {
            $type: 'enum',
            label: 'Alineación',
            default: 'stretch',
            options: [
                { value: 'stretch', label: 'Estirar' },
                { value: 'flex-start', label: 'Inicio' },
                { value: 'center', label: 'Centro' },
                { value: 'flex-end', label: 'Fin' },
            ],
            style: { css: 'align-items' },
            group: 'Layout',
        },
        gap: { $type: 'length', label: 'Espaciado', default: { value: 16, unit: 'px' }, style: { css: 'gap' }, group: 'Estilo' },
        padding: { $type: 'length', label: 'Padding', default: { value: 16, unit: 'px' }, style: { css: 'padding' }, group: 'Estilo' },
        bg: { $type: 'color', label: 'Fondo', style: { css: 'background-color' }, group: 'Estilo' },
        radius: { $type: 'length', label: 'Radio de borde', default: { value: 0, unit: 'px' }, style: { css: 'border-radius' }, group: 'Estilo' },
    },
    render: (s, h) => {
        const layout = typeof s.layout === 'string' ? s.layout : 'column'
        const cols = Number(s.columns) || 3
        const style: Record<string, string> =
            layout === 'grid'
                ? { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
                : { display: 'flex', flexDirection: layout === 'row' ? 'row' : 'column' }
        return createElement('div', { className: h.rootClass, style }, h.children)
    },
})
