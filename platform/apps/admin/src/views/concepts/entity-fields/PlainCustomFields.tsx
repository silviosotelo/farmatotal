import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
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
                    <label className="text-sm">
                        {f.label} {f.required ? <span className="text-red-500">*</span> : null}
                    </label>
                    {f.type === 'boolean' ? (
                        <div className="mt-1">
                            <Checkbox checked={!!value[f.key]} onChange={(c) => set(f.key, c)} />
                        </div>
                    ) : f.type === 'textarea' ? (
                        <textarea className={selCls + ' h-auto py-2'} rows={3} value={(value[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                    ) : f.type === 'select' ? (
                        <select className={selCls} value={(value[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                            <option value="">—</option>
                            {(f.options ?? []).map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'}
                            value={(value[f.key] as string) ?? ''}
                            onChange={(e) => set(f.key, e.target.value)}
                        />
                    )}
                </div>
            ))}
        </>
    )
}

export default PlainCustomFields
