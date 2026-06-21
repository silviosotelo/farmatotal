/** Registro global de widgets del motor (lookup por `type`). */
import type { WidgetSchema } from './schema/types'

const widgets = new Map<string, WidgetSchema>()

export function registerWidget(schema: WidgetSchema): WidgetSchema {
    widgets.set(schema.type, schema)
    return schema
}

export function getWidget(type: string): WidgetSchema | undefined {
    return widgets.get(type)
}

export function listWidgets(): WidgetSchema[] {
    return [...widgets.values()]
}

export function hasWidget(type: string): boolean {
    return widgets.has(type)
}
