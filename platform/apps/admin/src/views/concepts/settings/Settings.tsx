import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { apiGetSetting, apiSetSetting } from '@/services/CmsService'

type StoreCfg = {
    name: string
    email: string
    phone: string
    address: string
    currency: string
    locale: string
}

function SettingsSection<T>({
    settingKey,
    initial,
    render,
}: {
    settingKey: string
    initial: T
    render: (v: T, set: (v: T) => void) => React.ReactNode
}) {
    const [value, setValue] = useState<T>(initial)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        apiGetSetting<T>(settingKey)
            .then((r) => {
                if (r?.value) setValue({ ...initial, ...(r.value as object) } as T)
            })
            .catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const save = async () => {
        setSaving(true)
        try {
            await apiSetSetting(settingKey, value)
            toast.push(<Notification type="success">Guardado</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <div className="flex flex-col gap-3 max-w-xl">{render(value, setValue)}</div>
            <div className="mt-5">
                <Button variant="solid" loading={saving} onClick={save}>
                    Guardar cambios
                </Button>
            </div>
        </Card>
    )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-gray-600">{label}</label>
        <div className="w-72">{children}</div>
    </div>
)

/**
 * Ajustes = SOLO datos del negocio. Pagos, Envíos y Correos tienen sus propias
 * páginas dedicadas (Pagos / Envíos / Correos) — acá NO se duplican para evitar
 * dos fuentes de verdad. Impuestos también tiene su módulo.
 */
const Settings = () => {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Ajustes del negocio</h3>
                <p className="text-gray-500">
                    Datos generales del comercio. Los pagos, envíos, correos e impuestos se
                    configuran en sus propias secciones del menú.
                </p>
            </div>

            <SettingsSection<StoreCfg>
                settingKey="store"
                initial={{ name: '', email: '', phone: '', address: '', currency: 'PYG', locale: 'es-PY' }}
                render={(v, set) => (
                    <>
                        <Field label="Nombre del negocio">
                            <Input value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} />
                        </Field>
                        <Field label="Email de contacto">
                            <Input value={v.email} onChange={(e) => set({ ...v, email: e.target.value })} />
                        </Field>
                        <Field label="Teléfono">
                            <Input value={v.phone} onChange={(e) => set({ ...v, phone: e.target.value })} />
                        </Field>
                        <Field label="Dirección">
                            <Input value={v.address} onChange={(e) => set({ ...v, address: e.target.value })} />
                        </Field>
                        <Field label="Moneda (ISO 4217)">
                            <Input value={v.currency} onChange={(e) => set({ ...v, currency: e.target.value })} />
                        </Field>
                        <Field label="Locale">
                            <Input value={v.locale} onChange={(e) => set({ ...v, locale: e.target.value })} />
                        </Field>
                    </>
                )}
            />
        </div>
    )
}

export default Settings
