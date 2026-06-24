import { useEffect, useState } from 'react'
import { Controller, type Control } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import { apiGetEntityFields, type EntityField } from '@/services/EntityFieldsService'

const selCls = 'h-11 rounded-md border border-gray-200 dark:border-gray-600 bg-transparent px-3 text-sm w-full'

/**
 * Renderiza los CAMPOS PERSONALIZADOS (no-builtin) de una entidad según su config
 * (settings mod_<entity>_fields). Los valores se enlazan a `custom.<key>` del form
 * (react-hook-form), que mapea a la columna `custom` jsonb. Reutilizable en cualquier
 * formulario de entidad (producto, categoría, sucursal).
 */
const CustomFieldsSection = ({ settingsKey, control }: { settingsKey: string; control: Control<any> }) => {
    const [fields, setFields] = useState<EntityField[]>([])

    useEffect(() => {
        apiGetEntityFields(settingsKey)
            .then((cfg) => setFields(cfg.fields.filter((f) => !f.builtin && f.enabled !== false)))
            .catch(() => setFields([]))
    }, [settingsKey])

    if (fields.length === 0) return null

    return (
        <Card>
            <h4 className="mb-6">Campos personalizados</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((f) => (
                    <div key={f.key} className={f.width === 'full' || f.type === 'textarea' ? 'md:col-span-2' : ''}>
                        <FormItem label={<>{f.label} {f.required ? <span className="text-red-500">*</span> : null}</>}>
                            <Controller
                                name={`custom.${f.key}`}
                                control={control}
                                render={({ field }) => {
                                    const v = field.value
                                    if (f.type === 'boolean') {
                                        return <Switcher checked={!!v} onChange={(c) => field.onChange(c)} />
                                    }
                                    if (f.type === 'textarea') {
                                        return (
                                            <Input textArea rows={3} value={v ?? ''} onChange={(e) => field.onChange(e.target.value)} />
                                        )
                                    }
                                    if (f.type === 'select') {
                                        return (
                                            <Select
                                                options={[
                                                    { value: '', label: '—' },
                                                    ...(f.options ?? []).map((o) => ({ value: o, label: o })),
                                                ]}
                                                value={v ? { value: v, label: v } : { value: '', label: '—' }}
                                                onChange={(o) => field.onChange(o?.value)}
                                            />
                                        )
                                    }
                                    const inputType = f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'
                                    return <Input type={inputType} value={v ?? ''} onChange={(e) => field.onChange(e.target.value)} />
                                }}
                            />
                        </FormItem>
                    </div>
                ))}
            </div>
        </Card>
    )
}

export default CustomFieldsSection
