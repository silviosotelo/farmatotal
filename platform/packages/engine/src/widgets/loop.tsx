/**
 * Widget Loop (data-bound). Repite un TEMPLATE de tarjeta (sus hijos) sobre el
 * resultado del query de productos, con bindings por ítem (`item.*`).
 *
 * El render acá es solo el WRAPPER (grilla). El host (store) hace el fetch y
 * repite el template por ítem inyectando `ctx.item`; en el editor, el canvas
 * muestra el template UNA vez con datos de muestra.
 */
import { createElement } from 'react'
import { defineWidget } from '../schema/types'

export const loop = defineWidget({
    type: 'loop',
    label: 'Loop de productos',
    group: 'Datos',
    acceptsChildren: true,
    props: {
        source: {
            $type: 'enum',
            label: 'Origen',
            default: 'all',
            options: [
                { value: 'all', label: 'Todos' },
                { value: 'onPromo', label: 'En oferta' },
                { value: 'featured', label: 'Destacados' },
                { value: 'newest', label: 'Más nuevos' },
            ],
            group: 'Query',
        },
        categorySlug: { $type: 'categoryRef', label: 'Categoría', default: '', group: 'Query' },
        orderBy: {
            $type: 'enum',
            label: 'Ordenar por',
            default: 'createdAt',
            options: [
                { value: 'createdAt', label: 'Fecha' },
                { value: 'title', label: 'Nombre' },
                { value: 'priceWeb', label: 'Precio' },
                { value: 'random', label: 'Aleatorio' },
            ],
            group: 'Query',
        },
        order: {
            $type: 'enum',
            label: 'Dirección',
            default: 'desc',
            options: [
                { value: 'desc', label: 'Descendente' },
                { value: 'asc', label: 'Ascendente' },
            ],
            group: 'Query',
        },
        limit: { $type: 'number', label: 'Cantidad', default: 8, group: 'Query' },
        columns: { $type: 'number', label: 'Columnas', default: 4, group: 'Layout' },
        gap: { $type: 'length', label: 'Espaciado', default: { value: 16, unit: 'px' }, style: { css: 'gap' }, group: 'Estilo' },
    },
    render: (s, h) => {
        const cols = Number(s.columns) || 4
        return createElement(
            'div',
            { className: h.rootClass, style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } },
            h.children,
        )
    },
})
