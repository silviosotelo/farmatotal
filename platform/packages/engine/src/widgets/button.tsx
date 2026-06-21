/** Widget Botón (leaf). Texto + enlace (ambos dinámicos) + estilos por selector. */
import { createElement } from 'react'
import { defineWidget } from '../schema/types'

export const button = defineWidget({
    type: 'button',
    label: 'Botón',
    group: 'Básico',
    props: {
        text: { $type: 'string', label: 'Texto', default: 'Botón', dynamic: true, group: 'Contenido' },
        link: { $type: 'link', label: 'Enlace', default: '#', dynamic: true, group: 'Contenido' },
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
        bg: { $type: 'color', label: 'Fondo', default: '#111827', style: { selector: '{{WRAPPER}} a', css: 'background-color' }, group: 'Estilo' },
        color: { $type: 'color', label: 'Color del texto', default: '#ffffff', style: { selector: '{{WRAPPER}} a', css: 'color' }, group: 'Estilo' },
        padding: { $type: 'length', label: 'Padding', default: { value: 12, unit: 'px' }, style: { selector: '{{WRAPPER}} a', css: 'padding' }, group: 'Estilo' },
        radius: { $type: 'length', label: 'Radio de borde', default: { value: 8, unit: 'px' }, style: { selector: '{{WRAPPER}} a', css: 'border-radius' }, group: 'Estilo' },
    },
    render: (s, h) => {
        const href = typeof s.link === 'string' ? s.link : (s.link as { url?: string } | undefined)?.url || '#'
        const text = s.text == null || s.text === '' ? 'Botón' : String(s.text)
        return createElement(
            'div',
            { className: h.rootClass },
            createElement('a', { href, style: { display: 'inline-block', textDecoration: 'none' } }, text),
        )
    },
})
