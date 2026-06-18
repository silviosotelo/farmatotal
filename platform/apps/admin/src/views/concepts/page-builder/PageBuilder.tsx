import { useState } from 'react'
import { useNavigate } from 'react-router'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { apiGetPages, apiCreatePage } from '@/services/CmsService'

/**
 * Editor visual (plugin page_builder) — landing.
 * Lista las páginas del CMS y abre cada una en el constructor Chai Builder
 * (/concepts/cms/builder/:id). El motor de edición + bloques data-bound viven
 * en cms/PageBuilder.tsx y components/chai/blocks.tsx.
 */
const PageBuilder = () => {
    const navigate = useNavigate()
    const { data, isLoading, mutate } = useSWR('/cms/pages', () => apiGetPages().then((r) => r.data), {
        revalidateOnFocus: false,
    })
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [creating, setCreating] = useState(false)

    const create = async () => {
        if (!title.trim() || !slug.trim()) {
            toast.push(<Notification type="warning">Completá título y slug</Notification>, { placement: 'top-center' })
            return
        }
        setCreating(true)
        try {
            const page = await apiCreatePage({ slug: slug.trim(), title: title.trim(), blocks: [] })
            await mutate()
            setTitle('')
            setSlug('')
            navigate(`/concepts/cms/builder/${page.id}`)
        } catch (e) {
            toast.push(
                <Notification type="danger">{(e as Error)?.message || 'Error al crear'}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Editor visual</h3>
                <p className="text-gray-500">
                    Construí páginas con bloques arrastrables (Chai Builder). Elegí una página para editar o creá una
                    nueva.
                </p>
            </div>

            <Card>
                <h6 className="mb-3">Nueva página</h6>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[200px]">
                        <label className="mb-1 block text-sm text-gray-500">Título</label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Página de inicio" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="mb-1 block text-sm text-gray-500">Slug</label>
                        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="home" />
                    </div>
                    <Button variant="solid" loading={creating} onClick={create}>
                        Crear y editar
                    </Button>
                </div>
            </Card>

            <Card>
                <h6 className="mb-3">Páginas</h6>
                {isLoading ? (
                    <p className="text-gray-400">Cargando…</p>
                ) : !data?.length ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                        Todavía no hay páginas. Creá la primera arriba.
                    </div>
                ) : (
                    <div className="flex flex-col divide-y">
                        {data.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-800">{p.title}</div>
                                    <div className="text-xs text-gray-400">
                                        /{p.slug} · {p.published ? 'publicada' : 'borrador'}
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => navigate(`/concepts/cms/builder/${p.id}`)}>
                                    Editar
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default PageBuilder
