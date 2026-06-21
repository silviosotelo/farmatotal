/**
 * Widget de prueba: Heading / Título.
 * Demuestra los 5 pilares del motor: configuración + selectors→CSS + responsive
 * (font-size por breakpoint) + binding dinámico (texto) + render compartido.
 */
import { createElement } from 'react'
import { defineWidget } from '../schema/types'

const TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

export const heading = defineWidget({
    type: 'heading',
    label: 'Título',
    group: 'Básico',
    props: {
        text: {
            $type: 'string',
            label: 'Texto',
            default: 'Título de sección',
            dynamic: true,
            group: 'Contenido',
        },
        tag: {
            $type: 'enum',
            label: 'Etiqueta HTML',
            default: 'h2',
            options: TAGS.map((t) => ({ value: t, label: t.toUpperCase() })),
            group: 'Contenido',
        },
        link: {
            $type: 'link',
            label: 'Enlace (opcional)',
            dynamic: true,
            group: 'Contenido',
        },
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
        color: {
            $type: 'color',
            label: 'Color',
            style: { css: 'color' },
            group: 'Estilo',
        },
        typography: {
            $type: 'typography',
            label: 'Tipografía',
            responsive: true,
            style: { css: 'font' /* expandido por el compilador */ },
            group: 'Estilo',
        },
    },
    render: (s, h) => {
        const tag = typeof s.tag === 'string' && (TAGS as readonly string[]).includes(s.tag) ? s.tag : 'h2'
        const text = s.text == null || s.text === '' ? 'Título de sección' : String(s.text)
        const href = typeof s.link === 'string' ? s.link : (s.link as { url?: string } | undefined)?.url
        const inner = href ? createElement('a', { href }, text) : text
        return createElement(tag, { className: h.rootClass }, inner)
    },
})
