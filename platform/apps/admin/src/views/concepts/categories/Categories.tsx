import { useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Table from '@/components/ui/Table'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import Loading from '@/components/shared/Loading'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import PlainCustomFields from '@/views/concepts/entity-fields/PlainCustomFields'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, type Category } from '@/services/CategoryService'

const { Tr, Th, Td, THead, TBody } = Table

const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

type CatForm = { id?: string; name: string; slug: string; parentId: string; active: boolean; custom: Record<string, unknown> }
const empty: CatForm = { name: '', slug: '', parentId: '', active: true, custom: {} }

const Categories = () => {
    const { data, isLoading, mutate } = useSWR(['/catalog/categories'], () => apiGetCategories(), { revalidateOnFocus: false })
    const cats = (data?.data ?? []) as Category[]
    const [form, setForm] = useState<CatForm | null>(null)
    const [saving, setSaving] = useState(false)
    const set = <K extends keyof CatForm>(k: K, v: CatForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

    const openNew = () => setForm({ ...empty })
    const openEdit = (c: Category) =>
        setForm({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId ?? '', active: c.active, custom: (c.custom as Record<string, unknown>) ?? {} })

    const save = async () => {
        if (!form || !form.name.trim()) return
        setSaving(true)
        try {
            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim() || slugify(form.name),
                parentId: form.parentId || null,
                active: form.active,
                custom: form.custom && Object.keys(form.custom).length ? form.custom : null,
            }
            if (form.id) await apiUpdateCategory(form.id, payload)
            else await apiCreateCategory(payload)
            setForm(null)
            await mutate()
            toast.push(<Notification type="success">Categoría guardada</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="mb-1">Categorías</h3>
                        <p className="text-gray-500">{cats.length} categorías · jerárquicas, con campos personalizados</p>
                    </div>
                    {!form && <Button variant="solid" onClick={openNew}>Nueva categoría</Button>}
                </div>

                {form && (
                    <Card>
                        <h6 className="mb-3">{form.id ? 'Editar categoría' : 'Nueva categoría'}</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FormItem label="Nombre *">
                                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
                            </FormItem>
                            <FormItem label="Slug">
                                <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="se genera del nombre" />
                            </FormItem>
                            <FormItem label="Categoría padre">
                                <Select
                                    options={[
                                        { value: '', label: '(raíz)' },
                                        ...cats.filter((c) => c.id !== form.id).map((c) => ({ value: c.id, label: c.name })),
                                    ]}
                                    value={
                                        [
                                            { value: '', label: '(raíz)' },
                                            ...cats.filter((c) => c.id !== form.id).map((c) => ({ value: c.id, label: c.name })),
                                        ].find((o) => o.value === form.parentId)
                                    }
                                    onChange={(o) => set('parentId', o?.value ?? '')}
                                />
                            </FormItem>
                            <div className="flex items-center gap-2 pt-6">
                                <Switcher checked={form.active} onChange={(c) => set('active', c)} />
                                <span className="text-sm text-gray-600">Activa</span>
                            </div>
                            <PlainCustomFields settingsKey="mod_category_fields" value={form.custom} onChange={(c) => set('custom', c)} />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button variant="solid" loading={saving} onClick={save}>Guardar</Button>
                            <Button variant="plain" onClick={() => setForm(null)}>Cancelar</Button>
                        </div>
                    </Card>
                )}

                <Card>
                    <Table>
                        <THead>
                            <Tr className="text-left text-xs text-gray-400">
                                <Th className="py-1">Nombre</Th><Th>Slug</Th><Th>Estado</Th><Th></Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {cats.map((c) => (
                                <Tr key={c.id} className="border-t border-gray-100 dark:border-gray-700">
                                    <Td className="py-1.5">{c.name}</Td>
                                    <Td className="text-gray-500">{c.slug}</Td>
                                    <Td><Tag className={c.active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}>{c.active ? 'Activa' : 'Inactiva'}</Tag></Td>
                                    <Td className="text-right"><Button size="xs" onClick={() => openEdit(c)}>Editar</Button></Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </Card>
            </div>
        </Loading>
    )
}

export default Categories
