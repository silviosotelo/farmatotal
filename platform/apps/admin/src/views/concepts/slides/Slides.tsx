import { useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import {
    apiGetSlides,
    apiCreateSlide,
    apiUpdateSlide,
    apiDeleteSlide,
    DAYS,
    type Slide,
} from '@/services/SlideService'
import useSWR from 'swr'

const blank = {
    title: '',
    imageDesktop: '',
    imageMobile: '',
    linkHref: '',
    days: [] as number[],
    position: 0,
    active: true,
}

const Slides = () => {
    const { data, isLoading, mutate } = useSWR(['/slides'], () => apiGetSlides())
    const slides = (data?.data ?? []) as Slide[]
    const [form, setForm] = useState({ ...blank })
    const [saving, setSaving] = useState(false)

    const toggleDay = (d: number) =>
        setForm((f) => ({
            ...f,
            days: f.days.includes(d)
                ? f.days.filter((x) => x !== d)
                : [...f.days, d].sort(),
        }))

    const create = async () => {
        if (!form.title.trim()) return
        setSaving(true)
        try {
            await apiCreateSlide(form)
            setForm({ ...blank })
            await mutate()
            toast.push(<Notification type="success">Banner creado</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (s: Slide) => {
        await apiUpdateSlide(s.id, { active: !s.active })
        await mutate()
    }

    const remove = async (s: Slide) => {
        await apiDeleteSlide(s.id)
        await mutate()
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Slider y banners del inicio</h3>
                    <p className="text-gray-500">
                        Es el <strong>carrusel del hero de la página de inicio</strong> (no un
                        widget): cada slide es una imagen con link. Como en el WordPress,
                        se programa por días de la semana y por dispositivo (imagen
                        desktop / mobile). El home muestra solo los del día actual.
                    </p>
                </div>

                <Card>
                    <h6 className="mb-3">Nuevo banner</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm">Título (interno)</label>
                            <Input
                                value={form.title}
                                onChange={(e) =>
                                    setForm({ ...form, title: e.target.value })
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm">Link al hacer click</label>
                            <Input
                                value={form.linkHref}
                                onChange={(e) =>
                                    setForm({ ...form, linkHref: e.target.value })
                                }
                                placeholder="/catalogo"
                            />
                        </div>
                        <div>
                            <label className="text-sm">Imagen Desktop (URL)</label>
                            <Input
                                value={form.imageDesktop}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        imageDesktop: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm">Imagen Mobile (URL)</label>
                            <Input
                                value={form.imageMobile}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        imageMobile: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="mt-3">
                        <label className="text-sm block mb-1">
                            Días que se muestra (vacío = todos)
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {DAYS.map((d) => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => toggleDay(d.value)}
                                    className={`px-3 py-1 rounded-full text-sm border ${
                                        form.days.includes(d.value)
                                            ? 'bg-brand-orange text-white border-transparent'
                                            : 'bg-white text-gray-600 border-gray-300'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button variant="solid" loading={saving} onClick={create}>
                            Crear banner
                        </Button>
                    </div>
                </Card>

                <Card>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b">
                                <th className="py-2">Banner</th>
                                <th>Desktop</th>
                                <th>Mobile</th>
                                <th>Días</th>
                                <th>Estado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {slides.map((s) => (
                                <tr key={s.id} className="border-b last:border-0">
                                    <td className="py-2 font-medium">{s.title}</td>
                                    <td>
                                        {s.imageDesktop ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={s.imageDesktop}
                                                alt=""
                                                className="h-10 rounded"
                                            />
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td>
                                        {s.imageMobile ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={s.imageMobile}
                                                alt=""
                                                className="h-10 rounded"
                                            />
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td>
                                        {s.days.length === 0 ? (
                                            <Tag className="bg-sky-100 text-sky-600">
                                                Todos
                                            </Tag>
                                        ) : (
                                            s.days
                                                .map(
                                                    (d) =>
                                                        DAYS.find(
                                                            (x) => x.value === d,
                                                        )?.label,
                                                )
                                                .join(' ')
                                        )}
                                    </td>
                                    <td>
                                        <Switcher
                                            checked={s.active}
                                            onChange={() => toggleActive(s)}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <Button
                                            size="xs"
                                            customColorClass={() =>
                                                'text-error border-error'
                                            }
                                            onClick={() => remove(s)}
                                        >
                                            Borrar
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {slides.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-6 text-center text-gray-400"
                                    >
                                        Sin banners todavía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            </div>
        </Loading>
    )
}

export default Slides
