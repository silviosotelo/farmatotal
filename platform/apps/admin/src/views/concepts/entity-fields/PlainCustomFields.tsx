import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import { FormItem } from '@/components/ui/Form'
import { apiGetEntityFields, type EntityField } from '@/services/EntityFieldsService'

const selCls = 'h-11 rounded-md border border-gray-200 dark:border-gray-600 bg-transparent px-3 text-sm w-full'

/**
 * Variante de campos personalizados para formularios de ESTADO PLANO (no react-hook-form).
 * Lee la config (settings mod_<entity>_fields) y renderiza los campos no-builtin,
 * enlazados a un objeto `value` (la columna custom jsonb) vía onChange.
 */
const PlainCustomFields = ({
    settingsKey,
    value,
    onChange,
}: {
    settingsKey: string
    value: Record<string, unknown>
    onChange: (next: Record<string, unknown>) => void
}) => {
    const [fields, setFields] = useState<EntityField[]>([])

    useEffect(() => {
        apiGetEntityFields(settingsKey)
            .then((cfg) => setFields(cfg.fields.filter((f) => !f.builtin && f.enabled !== false)))
            .catch(() => setFields([]))
    }, [settingsKey])

    if (fields.length === 0) return null
    const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })

    return (
        <>
            <div className="md:col-span-2 mt-2 text-sm font-semibold text-gray-600">Campos personalizados</div>
            {fields.map((f) => (
                <div key={f.key} className={f.width === 'full' || f.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <FormItem label={<>{f.label} {f.required ? <span className="text-red-500">*</span> : null}</>}>
                        {f.type === 'boolean' ? (
                            <div className="mt-1">
                                <Checkbox checked={!!value[f.key]} onChange={(c) => set(f.key, c)} />
                            </div>
                        ) : f.type === 'textarea' ? (
                            <Input textArea rows={3} value={(value[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                        ) : f.type === 'select' ? (
                            <Select
                                options={[
                                    { value: '', label: '—' },
                                    ...(f.options ?? []).map((o) => ({ value: o, label: o })),
                                ]}
                                value={(value[f.key] as string) ? { value: value[f.key] as string, label: value[f.key] as string } : { value: '', label: '—' }}
                                onChange={(o) => set(f.key, o?.value)}
                            />
                        ) : (
                            <Input
                                type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'}
                                value={(value[f.key] as string) ?? ''}
                                onChange={(e) => set(f.key, e.target.value)}
                            />
                        )}
                    </FormItem>
                </div>
            ))}
        </>
    )
}

export default PlainCustomFields
