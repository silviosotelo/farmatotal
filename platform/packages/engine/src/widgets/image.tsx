/** Widget Imagen (leaf). src dinámico + dimensiones/estilo por selector. */
import { createElement } from 'react'
import { defineWidget } from '../schema/types'

export const image = defineWidget({
    type: 'image',
    label: 'Imagen',
    group: 'Básico',
    props: {
        src: { $type: 'media', label: 'Imagen (URL)', default: '', dynamic: true, group: 'Contenido' },
        alt: { $type: 'string', label: 'Texto alternativo', default: '', group: 'Contenido' },
        width: { $type: 'length', label: 'Ancho', default: { value: 100, unit: '%' }, responsive: true, style: { css: 'width' }, group: 'Estilo' },
        radius: { $type: 'length', label: 'Radio de borde', default: { value: 0, unit: 'px' }, style: { css: 'border-radius' }, group: 'Estilo' },
        objectFit: {
            $type: 'enum',
            label: 'Ajuste',
            default: 'cover',
            options: [
                { value: 'cover', label: 'Cubrir' },
                { value: 'contain', label: 'Contener' },
                { value: 'fill', label: 'Rellenar' },
            ],
            style: { css: 'object-fit' },
            group: 'Estilo',
        },
    },
    render: (s, h) => {
        const src = typeof s.src === 'string' ? s.src : (s.src as { url?: string } | undefined)?.url || ''
        const alt = typeof s.alt === 'string' ? s.alt : ''
        if (!src) {
            return createElement(
                'div',
                { className: h.rootClass, style: { background: '#f3f4f6', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 } },
                'Imagen',
            )
        }
        // eslint-disable-next-line @next/next/no-img-element
        return createElement('img', { className: h.rootClass, src, alt })
    },
})
