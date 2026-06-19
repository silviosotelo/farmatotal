# Ecme — UI Components

Catálogo de los componentes UI del template Ecme (admin). La verdad de las props sale del source en `src/components/ui/<Componente>/` (o `src/components/shared/` cuando se indica). Los snippets son ejemplos mínimos. Import por defecto: `import X from '@/components/ui/X'` (o named desde `@/components/ui`).

> Nota: `Grid` y `Typography` no son componentes Ecme, son patrones de clases utilitarias Tailwind. `Maps` usa la librería `react-simple-maps`. `Charts` es el wrapper `@/components/shared/Chart` (ApexCharts).

## Índice

| Componente | Propósito |
|---|---|
| [Alert](#alert) | Mensaje contextual (success/info/warning/danger) con icono y cierre. |
| [Avatar](#avatar) | Representa un usuario/entidad con imagen, icono o iniciales. |
| [Badge](#badge) | Indicador numérico o de punto, autónomo o anclado a un hijo. |
| [Button](#button) | Botón con variantes, tamaños, estados de carga/disabled e icono. |
| [Calendar](#calendar) | Calendario inline para seleccionar una o varias fechas. |
| [Cards](#cards) | Contenedor con cuerpo y header/footer opcionales. |
| [Carousel](#carousel) | Carrusel deslizable horizontal o vertical con API controlable. |
| [Charts](#charts) | Wrapper de ApexCharts con opciones del tema. |
| [Checkbox](#checkbox) | Casilla de verificación individual o agrupada. |
| [DatePicker](#datepicker) | Input con dropdown de calendario para elegir fecha/hora. |
| [Dialog](#dialog) | Modal centrado para contenido superpuesto. |
| [Drawer](#drawer) | Panel deslizante desde un borde de la pantalla. |
| [Dropdown](#dropdown) | Menú flotante de acciones sobre un toggle. |
| [FormControl](#formcontrol) | Sistema de formularios (Form/FormItem/FormContainer). |
| [Grid](#grid) | Grilla por clases utilitarias Tailwind. |
| [Input](#input) | Campo de entrada de texto (con afijos y modo textarea). |
| [InputGroup](#inputgroup) | Agrupa Input, Addon y botones en un control unificado. |
| [Maps](#maps) | Mapas geográficos vía react-simple-maps. |
| [Menu](#menu) | Menú de navegación vertical (sidebar) con grupos/colapsables. |
| [Pagination](#pagination) | Control de paginación prev/next con números de página. |
| [Progress](#progress) | Barra o círculo de progreso en porcentaje. |
| [Radio](#radio) | Botón de opción única, agrupable. |
| [Segment](#segment) | Control segmentado (toggle de botones). |
| [Select](#select) | Selector enriquecido (búsqueda, multi, async) sobre react-select. |
| [Skeleton](#skeleton) | Placeholder animado de carga. |
| [Slider](#slider) | Deslizante para valor numérico o rango. |
| [Spinner](#spinner) | Indicador de carga giratorio. |
| [Steps](#steps) | Indicador de pasos/wizard multietapa. |
| [Switcher](#switcher) | Interruptor on/off booleano. |
| [Table](#table) | Tabla estilizada compuesta por subcomponentes semánticos. |
| [Tabs](#tabs) | Pestañas navegables con contenido conmutable. |
| [Tag](#tag) | Etiqueta para estados/categorías con afijos. |
| [TimeInput](#timeinput) | Campo de entrada de hora por segmentos. |
| [Timeline](#timeline) | Línea de tiempo vertical de eventos. |
| [Toast](#toast) | API imperativa de notificaciones flotantes. |
| [Tooltip](#tooltip) | Globo informativo al hover/focus. |
| [Typography](#typography) | Estilos tipográficos por clases utilitarias. |
| [Upload](#upload) | Selector/cargador de archivos (botón o drag & drop). |

---

## Alert
- **Propósito**: Mensaje contextual (success/info/warning/danger) con icono y cierre opcional.
- **Import**: `import Alert from '@/components/ui/Alert'`
- **Props clave**: `type?: 'success' | 'info' | 'warning' | 'danger'` (default `warning`) — color/icono; `title?: ReactNode` — encabezado; `showIcon?: boolean` — muestra icono de estado; `closable?: boolean` — botón de cierre; `customIcon?/customClose?: ReactNode` — overrides; `duration?: number` (default 3000) — auto-cierre en ms (0 = no auto); `onClose?: (e) => void`; `triggerByToast?: boolean` — uso interno de toasts.
- **Variantes/sub-componentes**: 4 tipos de estado; con/sin `title`; con/sin icono; cerrable. Sin compound components.
- **Ejemplo**:
```tsx
import Alert from '@/components/ui/Alert'

const Basic = () => (
    <Alert type="success" showIcon closable>
        Additional description and information about copywriting.
    </Alert>
)

export default Basic
```

## Avatar
- **Propósito**: Representa un usuario/entidad con imagen, icono o iniciales.
- **Import**: `import Avatar from '@/components/ui/Avatar'`
- **Props clave**: `src?: string` / `srcSet?: string` / `alt?: string` — imagen; `icon?: ReactNode` — icono; `size?: 'lg' | 'md' | 'sm' | number` (default `md`) — tamaño (px si number); `shape?: 'circle' | 'round' | 'square'` (default `circle`); `onClick?: () => void`. Si no hay `src`/`icon`, usa los children (iniciales) con auto-escalado.
- **Variantes/sub-componentes**: `Avatar.Group` (AvatarGroup) con `maxCount` (default 4), `chained`, `omittedAvatarContent`, `omittedAvatarTooltip`, `omittedAvatarTooltipProps`, `onOmittedAvatarClick`.
- **Ejemplo**:
```tsx
import Avatar from '@/components/ui/Avatar'
import { HiOutlineUser } from 'react-icons/hi'

const Type = () => (
    <div className="flex items-center">
        <Avatar className="mr-4">AT</Avatar>
        <Avatar className="mr-4" icon={<HiOutlineUser />} />
        <Avatar className="mr-4" src="/img/avatars/thumb-1.jpg" />
    </div>
)

export default Type
```

## Badge
- **Propósito**: Indicador numérico o de punto, autónomo o anclado a un hijo (ej. avatar).
- **Import**: `import Badge from '@/components/ui/Badge'`
- **Props clave**: `content?: string | number` — texto/número; si se omite, renderiza un punto (dot); `maxCount?: number` (default 99) — si `content` numérico lo supera muestra `N+`; `badgeStyle?: CSSProperties` — estilo del badge; `innerClass?: string` — clase del badge interno; `children?` — elemento al que se ancla (modo wrapper).
- **Variantes/sub-componentes**: badge con número, con texto, modo dot (sin content), inline o envolviendo un hijo. Sin compound components.
- **Ejemplo**:
```tsx
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { HiOutlineUser } from 'react-icons/hi'

const Basic = () => (
    <Badge content={9}>
        <Avatar icon={<HiOutlineUser />} />
    </Badge>
)

export default Basic
```

## Button
- **Propósito**: Botón con variantes, tamaños, estados de carga/disabled e icono.
- **Import**: `import Button from '@/components/ui/Button'`
- **Props clave**: `variant?: 'solid' | 'plain' | 'default'` (default `default`); `size?: 'lg' | 'md' | 'sm' | 'xs'` (hereda de Form/InputGroup/Config); `shape?: 'round' | 'circle' | 'none'` (default `round`); `icon?: ReactNode` + `iconAlignment?: 'start' | 'end'`; `loading?: boolean` — muestra Spinner; `disabled?: boolean`; `block?: boolean` — ancho completo; `active?: boolean`; `asElement?: ElementType` — renderiza otro tag; `onClick?: (e) => void`; `customColorClass?: (state) => string`.
- **Variantes/sub-componentes**: 3 variants, 4 sizes, 3 shapes; estados active/disabled/loading; icon-only (solo `icon` sin children). Sin compound components.
- **Ejemplo**:
```tsx
import Button from '@/components/ui/Button'

const Variant = () => (
    <div className="inline-flex gap-2">
        <Button>Default</Button>
        <Button variant="solid">Solid</Button>
        <Button variant="plain">Plain</Button>
    </div>
)

export default Variant
```

## Calendar
- **Propósito**: Calendario inline para seleccionar una o varias fechas (reexporta `DatePicker/Calendar`).
- **Import**: `import Calendar from '@/components/ui/Calendar'`
- **Props clave**: `value?: Date | null` (o `Date[]` si `multipleSelection`); `onChange?(value)`; `multipleSelection?: boolean` — selección múltiple; hereda de `CalendarSharedProps`: `minDate?/maxDate?: Date`, `disableDate?: (date) => boolean`, `dateViewCount?: number` (meses visibles), `firstDayOfWeek?: 'monday' | 'sunday'`, `renderDay?`, `defaultView?`, `disableOutOfMonth?`, `weekendDays?`.
- **Variantes/sub-componentes**: vista simple/múltiple, selección única vs múltiple, deshabilitar fechas/rango. Sin compound components.
- **Ejemplo**:
```tsx
import { useState } from 'react'
import Calendar from '@/components/ui/Calendar'

const Basic = () => {
    const [value, setValue] = useState<Date | null>(null)
    return (
        <div className="max-w-[280px] mx-auto">
            <Calendar value={value} onChange={setValue} />
        </div>
    )
}

export default Basic
```

## Cards
- **Propósito**: Contenedor con cuerpo y header/footer opcionales, con borde o sombra.
- **Import**: `import Card from '@/components/ui/Card'`
- **Props clave**: `header?: { content, className?, bordered?, extra? }` — encabezado (con acción `extra`); `footer?: { content, className?, bordered? }`; `bordered?: boolean` (default según Config, normalmente true) — borde vs sombra; `clickable?: boolean` — cursor/estilo clickeable; `bodyClass?: string` — clase del cuerpo; `onClick?: (e) => void`.
- **Variantes/sub-componentes**: con/sin borde (`bordered`), con header/footer (bordeados o no), clickable, media. No usa compound (`Card.Body`); header/footer se pasan como props objeto.
- **Ejemplo**:
```tsx
import Card from '@/components/ui/Card'

const Basic = () => (
    <Card>
        <h5>Card title</h5>
        <p>Some quick example text to build on the card title.</p>
    </Card>
)

export default Basic
```

## Carousel
- **Propósito**: Carrusel deslizable (drag/teclado) horizontal o vertical con API controlable.
- **Import**: `import Carousel from '@/components/ui/Carousel'`
- **Props clave**: `orientation?: 'horizontal' | 'vertical'` (default `horizontal`); `opts?: { align?, loop?, dragFree?, skipSnaps?, startIndex? }` — opciones de scroll; `setApi?: (api) => void` — expone `CarouselApi` (`scrollPrev/scrollNext/scrollTo/selectedIndex/canScrollPrev/canScrollNext/scrollSnapCount`).
- **Variantes/sub-componentes**: compound — `Carousel.Content`, `Carousel.Item`, `Carousel.Previous`, `Carousel.Next`. Soporta loop, vertical, tamaños y control externo vía API.
- **Ejemplo**:
```tsx
import Carousel from '@/components/ui/Carousel'
import Card from '@/components/ui/Card'

const Basic = () => (
    <div className="w-full max-w-xs mx-auto relative">
        <Carousel>
            <Carousel.Content>
                {Array.from({ length: 5 }).map((_, i) => (
                    <Carousel.Item key={i}>
                        <Card className="p-1">{i + 1}</Card>
                    </Carousel.Item>
                ))}
            </Carousel.Content>
            <Carousel.Previous className="absolute -left-12 top-1/2" />
            <Carousel.Next className="absolute -right-12 top-1/2" />
        </Carousel>
    </div>
)

export default Basic
```

## Charts
- **Propósito**: Wrapper de ApexCharts con opciones por defecto del tema (line/bar/area/donut/radar).
- **Import**: `import Chart from '@/components/shared/Chart'`
- **Props clave**: `type?: 'line' | 'bar' | 'area' | 'donut' | 'radar'` (default `line`); `series?: ApexOptions['series']` — datos; `xAxis?: any` — categorías del eje X (line/bar/area); `customOptions?: ApexOptions` — merge sobre las opciones por defecto; `height?/width?: string | number` (default 300 / `'100%'`); `donutTitle?/donutText?: ReactNode` — etiqueta central del donut; `direction?: Direction` — soporte RTL.
- **Variantes/sub-componentes**: tipos line/area/bar/column/donut/pie/radar (grouped, stacked, dashed, spline). Sin compound components.
- **Ejemplo**:
```tsx
import Chart from '@/components/shared/Chart'

const BasicLine = () => (
    <Chart
        type="line"
        series={[{ name: 'Desktops', data: [10, 41, 35, 51, 49, 62] }]}
        xAxis={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
        height={300}
    />
)

export default BasicLine
```

## Checkbox
- **Propósito**: Casilla de verificación individual o agrupada, con estado indeterminado.
- **Import**: `import Checkbox from '@/components/ui/Checkbox'`
- **Props clave**: `checked?: boolean` (controlado) / `defaultChecked?: boolean` (no controlado); `onChange?: (value: boolean, e: ChangeEvent) => void`; `indeterminate?: boolean` — estado mixto; `disabled?: boolean`; `readOnly?: boolean`; `value?: CheckboxValue` — valor dentro de un grupo; `name?`, `checkboxClass?` — color/clase.
- **Variantes/sub-componentes**: `Checkbox.Group` con `value: CheckboxGroupValue`, `onChange(value, event)`, `vertical?`, `name`, `checkboxClass`. Estados: checked, disabled, indeterminate, controlado/no controlado.
- **Ejemplo**:
```tsx
import Checkbox from '@/components/ui/Checkbox'
import type { ChangeEvent } from 'react'

const Default = () => {
    const onCheck = (value: boolean, e: ChangeEvent<HTMLInputElement>) =>
        console.log(value, e)
    return <Checkbox defaultChecked onChange={onCheck}>Checkbox</Checkbox>
}

export default Default
```

## DatePicker
- **Propósito**: Input con dropdown de calendario para seleccionar una fecha (o fecha/hora).
- **Import**: `import DatePicker from '@/components/ui/DatePicker'`
- **Props clave**: `value?: Date | null` / `defaultValue?: Date | null`; `onChange?: (value: Date | null) => void`; `inputFormat?: string` (default `YYYY-MM-DD`); `inputtable?: boolean` — permite tipear la fecha; `clearable?: boolean` (default true) + `clearButton?`; `disabled?: boolean`; `size?`; `minDate?/maxDate?/disableDate?`; `inputPrefix?/inputSuffix?`; `dateViewCount?`, `firstDayOfWeek?`, `locale?`, `defaultOpen?`; acepta props de input (`placeholder`, etc.) vía `...rest`.
- **Variantes/sub-componentes**: relacionados `DatePickerRange` y `DateTimepicker`; soporta inputtable, clear button, affixes, localización, render custom, deshabilitar fechas.
- **Ejemplo**:
```tsx
import DatePicker from '@/components/ui/DatePicker'

const Basic = () => <DatePicker placeholder="Pick a date" />

export default Basic
```

## Dialog
- **Propósito**: Modal centrado (basado en `react-modal`) para mostrar contenido superpuesto con backdrop y animación de escala.
- **Import**: `import Dialog from '@/components/ui/Dialog'`
- **Props clave** (extiende `ReactModal.Props`): `isOpen: boolean` — controla visibilidad; `onClose?: (e) => void` — handler del botón cerrar; `closable?: boolean` (default `true`) — muestra/oculta la X; `width?: number` (default `520`) — ancho del contenido; `height?: string | number` — alto; `contentClassName?: string` — clase del contenedor interno; `closeTimeoutMS` (default `150`). Hereda `onRequestClose`, `overlayClassName`, etc. de react-modal.
- **Variantes/sub-componentes**: No es compound. Variantes vía props: tamaño (`width`/`height`), `closable`, backdrop estático (`shouldCloseOnOverlayClick`), scroll interno. El ancho se vuelve `auto` si la ventana es menor al `width`.
- **Ejemplo**:
```tsx
<Dialog
    isOpen={dialogIsOpen}
    onClose={onDialogClose}
    onRequestClose={onDialogClose}
>
    <h5 className="mb-4">Dialog Title</h5>
    <p>There are many variations of passages of Lorem Ipsum available...</p>
    <div className="text-right mt-6">
        <Button className="ltr:mr-2 rtl:ml-2" variant="plain" onClick={onDialogClose}>Cancel</Button>
        <Button variant="solid" onClick={onDialogOk}>Okay</Button>
    </div>
</Dialog>
```

## Drawer
- **Propósito**: Panel deslizante (basado en `react-modal`) que entra desde un borde de la pantalla, con header, body y footer opcionales.
- **Import**: `import Drawer from '@/components/ui/Drawer'`
- **Props clave** (extiende `ReactModal.Props`): `isOpen: boolean`; `onClose?: (e) => void`; `placement?: 'top' | 'right' | 'bottom' | 'left'` (default `'right'`); `title?: string | ReactNode`; `footer?: string | ReactNode`; `width?: string | number` (default `400`, aplica en left/right); `height?: string | number` (default `400`, aplica en top/bottom); `closable?: boolean` (default `true`); `showBackdrop?: boolean` (default `true`); `lockScroll?: boolean` (default `true`); clases `bodyClass`/`headerClass`/`footerClass`.
- **Variantes/sub-componentes**: No es compound. Variantes por `placement` (4 lados) y dimensiones (`width`/`height`).
- **Ejemplo**:
```tsx
<Drawer
    title="Drawer Title"
    isOpen={isOpen}
    onClose={onDrawerClose}
    onRequestClose={onDrawerClose}
>
    Drawer Content
</Drawer>
```

## Dropdown
- **Propósito**: Menú flotante (basado en `@floating-ui/react`) que despliega una lista de acciones al hacer click/hover sobre un toggle.
- **Import**: `import Dropdown from '@/components/ui/Dropdown'`
- **Props clave** (`DropdownProps` extiende `DropdownMenuProps`): `title?: string | ReactNode` — texto del toggle; `trigger?: 'click' | 'hover' | 'context'` (default `'click'`); `placement?: Placement` (floating-ui, default `'bottom-start'`); `activeKey?: string` — marca el item activo; `menuClass?: string`; `onOpen?: (bool) => void`; `eventKey?: string`. Items (`DropdownItemProps`): `eventKey?: string`, `active?: boolean`, `disabled?: boolean`, `onSelect?: (eventKey, e) => void`, `variant?: 'default' | 'header' | 'divider' | 'custom'`, `submenu?`.
- **Variantes/sub-componentes**: Compound — `Dropdown.Item` (entrada) y `Dropdown.Menu` (submenú anidado). `variant` en Item para header/divider/custom.
- **Ejemplo**:
```tsx
<Dropdown title="Click Me!" onClick={onDropdownClick}>
    {dropdownItems.map((item) => (
        <Dropdown.Item key={item.key} eventKey={item.key} onSelect={onDropdownItemClick}>
            {item.name}
        </Dropdown.Item>
    ))}
</Dropdown>
```

## FormControl
- **Propósito**: Sistema de formularios: `Form` (envuelve `<form>` + `FormContainer`) define layout/tamaño y `FormItem` renderiza label, control y mensaje de error; pensado para integrarse con `react-hook-form`.
- **Import**: `import { Form, FormItem } from '@/components/ui/Form'`
- **Props clave**: `Form` (`FormProps` = props nativos de `<form>` + `FormContainerProps`): `layout?: 'vertical' | 'horizontal' | 'inline'` (default `vertical`), `size?: ControlSize`, `labelWidth?: string | number` (default `100`), `containerClassName?`. `FormItem` (`FormItemProps`): `label?: string`, `invalid?: boolean`, `errorMessage?: string`, `asterisk?: boolean`, `extra?: ReactNode`, `htmlFor?`, `layout?`, `size?`, `labelWidth?`.
- **Variantes/sub-componentes**: Compound de hecho — `Form`, `FormItem`, `FormContainer`. Layouts vertical/horizontal/inline; tamaños de control; estado `invalid` con animación del mensaje.
- **Ejemplo**:
```tsx
<Form onSubmit={handleSubmit(onSubmit)}>
    <FormItem label="Email" invalid={Boolean(errors.email)} errorMessage={errors.email?.message}>
        <Controller name="email" control={control} render={({ field }) => (
            <Input type="email" placeholder="Email" {...field} />
        )} />
    </FormItem>
    <Button variant="solid" type="submit">Submit</Button>
</Form>
```

## Grid
- **Propósito**: Sistema de grilla basado en clases utilitarias de Tailwind CSS; no existe componente Ecme propio, se usa directamente sobre un `<div>`.
- **Import**: N/A — clases utilitarias Tailwind (`grid`, `grid-cols-*`, `gap-*`).
- **Props clave**: N/A — se controla por clases: `grid-cols-{n}` (columnas), `grid-rows-{n}` (filas), `gap-{n}`/`gap-x-*`/`gap-y-*` (separación), `col-span-*`/`row-span-*` (extensión), `grid-flow-*` (auto-flow), `auto-cols-*`/`auto-rows-*`.
- **Variantes/sub-componentes**: Columnas y gaps responsivos vía prefijos de breakpoint (`sm:`, `md:`, `lg:`, etc.); estados `hover:`/`focus:`.
- **Ejemplo**:
```tsx
<div className="grid grid-cols-4 gap-4">
    {[...Array(9).keys()].map((elm) => (
        <DemoBoxContent key={elm} className="shadow-lg bg-fuchsia-500">
            {'0' + (elm + 1)}
        </DemoBoxContent>
    ))}
</div>
```

## Input
- **Propósito**: Campo de entrada de texto estilizado, con soporte de tamaños, estados, prefijo/sufijo y modo textarea; se integra con Form e InputGroup.
- **Import**: `import Input from '@/components/ui/Input'`
- **Props clave** (`InputProps` extiende `CommonProps` y atributos nativos de input/textarea menos `size`/`prefix`): `size?: ControlSize` (lg/md/sm); `invalid?: boolean`; `disabled?: boolean`; `prefix?: string | ReactNode` y `suffix?: string | ReactNode` (afijos internos); `textArea?: boolean` + `rows?: number`; `type?: HTMLInputType` (default `'text'`); `asElement?: ElementType` (default `'input'`); `unstyle?: boolean`. Hereda tamaño/validez de Form/InputGroup vía contexto.
- **Variantes/sub-componentes**: No es compound. Variantes: tamaños, `invalid`, `disabled`, con afijos (`prefix`/`suffix`), textarea.
- **Ejemplo**:
```tsx
<Input placeholder="Basic usage" />
```

## InputGroup
- **Propósito**: Agrupa varios `Input`, `Addon` y botones en un solo control unificado, propagando un tamaño común.
- **Import**: `import InputGroup from '@/components/ui/InputGroup'`
- **Props clave**: `InputGroup` (`InputGroupProps`): `size?: ControlSize` — tamaño que se propaga por contexto a hijos (Input/Addon); `className?`. `Addon` (`AddonProps`): `size?: ControlSize`, `className?` — segmento estático (texto/ícono) adosado.
- **Variantes/sub-componentes**: Compound — `InputGroup.Addon` (también importable como `const { Addon } = InputGroup`). Combinables: Addon+Input, Input+Addon, Addon+Input+Addon, Input+Addon+Input, y con `Button`. Tamaños lg/md/sm.
- **Ejemplo**:
```tsx
const { Addon } = InputGroup

<InputGroup className="mb-4">
    <Addon>http://</Addon>
    <Input />
    <Addon>.com</Addon>
</InputGroup>
```

## Maps
- **Propósito**: Renderiza mapas geográficos (mundo/regiones) usando la librería `react-simple-maps`; no es un componente Ecme. El proyecto incluye el wrapper `components/shared/RegionMap.tsx` para mapas con datos/marcadores/tooltips.
- **Import**: `import { ComposableMap, Geographies, Geography } from 'react-simple-maps'` (o `import RegionMap from '@/components/shared/RegionMap'`).
- **Props clave**: `ComposableMap`: `height`, `projection`, `projectionConfig` (ej. `{ scale: 100 }`). `Geographies`: `geography` — URL/objeto del GeoJSON (mapas JSON en `@/assets/maps`, ej. `world-countries-sans-antarctica.json`). `Geography`: `geography={geo}`, `fill`, `stroke`. `RegionMap` (wrapper): `data: {name, value?, color?}[]`, `mapSource?`, `marker?`, `valuePrefix/Suffix?`, `hoverable?`.
- **Variantes/sub-componentes**: Marcadores (`Marker`), coropletas (quantile/quantize), graticule, zoom/pan, texturas (`@visx/pattern`) y tooltips (`react-tooltip`).
- **Ejemplo**:
```tsx
const geoUrl = '/data/features.json'

<ComposableMap height={200} projectionConfig={{ scale: 100 }}>
    <Geographies geography={geoUrl}>
        {({ geographies }) =>
            geographies.map((geo) => (
                <Geography key={geo.rsmKey} fill="#EAEAEC" stroke="#D6D6DA" geography={geo} />
            ))
        }
    </Geographies>
</ComposableMap>
```

## Menu
- **Propósito**: Menú de navegación vertical (sidebar) con items, grupos, secciones colapsables y estado activo/expandido por defecto.
- **Import**: `import Menu from '@/components/ui/Menu'`
- **Props clave**: `Menu` (`MenuProps`): `onSelect?: (eventKey, e) => void`; `defaultActiveKeys?: string[]`; `defaultExpandedKeys?: string[]`; `defaultCollapseActiveKeys?: string[]`; `menuItemHeight?: number` (default `48`); `sideCollapsed?: boolean`. `MenuItem`: `eventKey?`, `isActive?`, `disabled?`, `dotIndent?`, `asElement?`. `MenuCollapse`: `label`, `eventKey`, `expanded?`, `indent?`, `dotIndent?`, `onToggle?`. `MenuGroup`: `label: string | ReactNode`.
- **Variantes/sub-componentes**: Compound — `Menu.MenuItem`, `Menu.MenuCollapse`, `Menu.MenuGroup`. Soporta íconos, items deshabilitados, modo `sideCollapsed`.
- **Ejemplo**:
```tsx
<Menu onSelect={handleSelect}>
    <Menu.MenuItem eventKey="settings">Settings</Menu.MenuItem>
    <Menu.MenuItem eventKey="message">Message</Menu.MenuItem>
    <Menu.MenuItem eventKey="gallery">Gallery</Menu.MenuItem>
</Menu>
```

## Pagination
- **Propósito**: Control de paginación con botones prev/next, números de página y total opcional de registros.
- **Import**: `import Pagination from '@/components/ui/Pagination'`
- **Props clave** (`PaginationProps` extiende `CommonProps`): `total?: number` (default `5`) — total de registros; `pageSize?: number` (default `1`) — registros por página; `currentPage?: number` (default `1`) — página controlada; `onChange?: (pageNumber) => void` — callback al cambiar; `displayTotal?: boolean` (default `false`) — muestra el total.
- **Variantes/sub-componentes**: No es compound público (internamente Prev/Next/Pagers/Total). Variantes vía props: controlada (`currentPage`), `pageSize`, total visible.
- **Ejemplo**:
```tsx
<Pagination onChange={onPaginationChange} />
```

## Progress
- **Propósito**: Barra o círculo de progreso para mostrar el avance de una tarea en porcentaje.
- **Import**: `import Progress from '@/components/ui/Progress'` (default; también `{ Progress }`).
- **Props clave**: `percent: number` — porcentaje 0-100 (default 0); `variant: 'line' | 'circle'` — forma (default 'line'); `size: 'sm' | 'md'` — tamaño; `showInfo: boolean` — muestra el texto (default true); `customInfo: string | ReactNode` — texto/contenido en lugar del porcentaje; `customColorClass: string` — clase de color del trazo; `strokeWidth: number` y `width: string | number` — grosor/ancho (círculo); `gapDegree`/`gapPosition` — hueco del arco circular; `trailClass: string` — clase del riel.
- **Variantes/sub-componentes**: dos variantes internas (Line, Circle) seleccionadas vía `variant`.
- **Ejemplo**:
```tsx
import Progress from '@/components/ui/Progress'

const ProgressBar = () => {
    return (
        <div>
            <Progress percent={30} />
        </div>
    )
}

export default ProgressBar
```

## Radio
- **Propósito**: Botón de opción única; agrupable para selección exclusiva entre varias opciones.
- **Import**: `import Radio from '@/components/ui/Radio'` (default; también `{ Radio }`).
- **Props clave**: `value: any` — valor de la opción; `checked: boolean` / `defaultChecked: boolean` — estado (controlado/no controlado); `disabled: boolean`; `readOnly: boolean`; `name: string` — agrupa radios nativos; `onChange: (value, e) => void`; `radioClass: string` — clase de color; `vertical: boolean`. RadioGroupProps (`Radio.Group`): `value`, `onChange: (values, e) => void`, `disabled`, `name`, `vertical`, `radioClass`.
- **Variantes/sub-componentes**: `Radio.Group` (compound) — provee contexto y maneja el valor seleccionado de los `Radio` hijos.
- **Ejemplo**:
```tsx
import { useState } from 'react'
import Radio from '@/components/ui/Radio'

const Group = () => {
    const [value, setValue] = useState('Banana')
    const onChange = (val: string) => setValue(val)

    return (
        <Radio.Group value={value} onChange={onChange}>
            <Radio value={'Apple'}>Apple</Radio>
            <Radio value={'Banana'}>Banana</Radio>
            <Radio value={'Cherry'}>Cherry</Radio>
        </Radio.Group>
    )
}

export default Group
```

## Segment
- **Propósito**: Control segmentado (toggle de botones) para seleccionar una o varias opciones tipo pestañas compactas.
- **Import**: `import Segment from '@/components/ui/Segment'` (default; también `{ Segment }`).
- **Props clave**: `value: SegmentValue` / `defaultValue: SegmentValue` — selección (controlado/no controlado); `selectionType: 'single' | 'multiple'` — modo de selección (default 'single'); `size: Size` — tamaño (xs/sm/md/lg); `onChange: (segmentValue) => void`. SegmentItemProps (`Segment.Item`): `value: string`, `disabled: boolean`, `size`, y `children` puede ser función `({ active, disabled, value, onSegmentItemClick }) => ReactNode` para render custom.
- **Variantes/sub-componentes**: `Segment.Item` (compound). Estados: activo (`segment-item-active`), deshabilitado.
- **Ejemplo**:
```tsx
import Segment from '@/components/ui/Segment'

const Basic = () => {
    return (
        <Segment>
            <Segment.Item value="left">Left</Segment.Item>
            <Segment.Item value="center">Center</Segment.Item>
            <Segment.Item value="right">Right</Segment.Item>
        </Segment>
    )
}

export default Basic
```

## Select
- **Propósito**: Selector enriquecido (búsqueda, multi, creatable, async) construido sobre react-select con estilos del tema.
- **Import**: `import Select from '@/components/ui/Select'` (default; también `{ Select, Option }`).
- **Props clave**: hereda todas las props de react-select (`options`, `value`, `onChange`, `placeholder`, `isMulti`, `isDisabled`, `isClearable`, `isSearchable`, etc.) más: `size: ControlSize` — tamaño (cae a InputGroup/Form/Config si se omite); `invalid: boolean` — estado de error; `field: any` — integración con formularios; `componentAs` — usar `ReactSelect` (default), `CreatableSelect` o `AsyncSelect`; `components` — overrides de subcomponentes.
- **Variantes/sub-componentes**: variantes vía `componentAs` (Creatable, Async); `Option` exportado para personalizar opciones. Indicadores propios (Dropdown, Clear, Loading vía Spinner).
- **Ejemplo**:
```tsx
import Select from '@/components/ui/Select'

const options = [
    { value: 'ocean', label: 'Ocean' },
    { value: 'blue', label: 'Blue' },
    { value: 'red', label: 'Red' },
]

const Basic = () => <Select placeholder="Please Select" options={options} />

export default Basic
```

## Skeleton
- **Propósito**: Placeholder animado que simula el contenido mientras se carga (loading state).
- **Import**: `import Skeleton from '@/components/ui/Skeleton'` (default; también `{ Skeleton }`).
- **Props clave**: `variant: 'block' | 'circle'` — forma (default 'block'); `animation: boolean` — activa el pulso `animate-pulse` (default true); `width: string | number` y `height: string | number` — dimensiones (van al style inline); `asElement: ElementType` — etiqueta a renderizar (default 'span').
- **Variantes/sub-componentes**: sin compound; dos variantes (`block`, `circle`).
- **Ejemplo**:
```tsx
import Skeleton from '@/components/ui/Skeleton'

const Variant = () => {
    return (
        <div className="flex items-center gap-4">
            <div>
                <Skeleton variant="circle" />
            </div>
            <Skeleton />
        </div>
    )
}

export default Variant
```

## Slider
- **Propósito**: Control deslizante para elegir un valor numérico (o un rango) dentro de un mínimo y máximo.
- **Import**: `import Slider from '@/components/ui/Slider'` (default; también `{ Slider }`).
- **Props clave**: `value: number` / `defaultValue: number` — valor (controlado/no controlado); `min`/`max`/`step: number` — rango y paso; `marks: { value, label }[]` — marcas; `tooltip: ReactNode | (value) => ReactNode` — contenido del tooltip; `alwaysShowTooltip`/`showTooltipOnHover: boolean`; `stepOnMarks: boolean` — saltar entre marcas; `disabled: boolean`; `onChange`/`onDraggingStop: (value) => void`; `name`/`inputProps` — input oculto. RangeSlider añade `value/defaultValue: [number, number]`, `minRange`/`maxRange`.
- **Variantes/sub-componentes**: `Slider.Range` (RangeSlider, compound) para seleccionar un rango con dos thumbs.
- **Ejemplo**:
```tsx
import Slider from '@/components/ui/Slider'

const Range = () => {
    return <Slider.Range defaultValue={[20, 50]} />
}

export default Range
```

## Spinner
- **Propósito**: Indicador de carga giratorio.
- **Import**: `import Spinner from '@/components/ui/Spinner'` (default; también `{ Spinner }`).
- **Props clave**: `size: string | number` — tamaño en px (default 20); `isSpining: boolean` — activa la animación `animate-spin` (default true); `enableTheme: boolean` — aplica `text-primary` (default true); `customColorClass: string` — clase de color custom; `indicator: ElementType` — ícono a usar (default `CgSpinner` de react-icons).
- **Variantes/sub-componentes**: sin compound; personalizable vía `indicator` (indicador custom) y `isSpining` (estático).
- **Ejemplo**:
```tsx
import Spinner from '@/components/ui/Spinner'

const Basic = () => {
    return (
        <div>
            <Spinner />
        </div>
    )
}

export default Basic
```

## Steps
- **Propósito**: Indicador de pasos/wizard que muestra el progreso de un proceso multietapa.
- **Import**: `import Steps from '@/components/ui/Steps'` (default; también `{ Steps }`).
- **Props clave**: `current: number` — índice del paso activo (default 0); `status: StepStatus` — estado del paso actual ('complete' | 'pending' | 'in-progress' | 'error', default in-progress); `vertical: boolean` — orientación; `onChange: (index) => void` — hace clickeables los pasos. StepItemProps (`Steps.Item`): `title`, `description`, `customIcon: ReactNode`, `status`, `stepNumber` (se inyecta automáticamente por índice).
- **Variantes/sub-componentes**: `Steps.Item` (compound). El padre clona los hijos calculando `status`/`stepNumber` según `current`.
- **Ejemplo**:
```tsx
import Steps from '@/components/ui/Steps'

const Basic = () => {
    return (
        <Steps current={1}>
            <Steps.Item />
            <Steps.Item />
            <Steps.Item />
            <Steps.Item />
        </Steps>
    )
}

export default Basic
```

## Switcher
- **Propósito**: Interruptor on/off (toggle) booleano, con soporte de contenido y estado de carga.
- **Import**: `import Switcher from '@/components/ui/Switcher'` (default; también `{ Switcher }`).
- **Props clave**: `checked: boolean` / `defaultChecked: boolean` — estado (controlado/no controlado); `onChange: (checked, e) => void`; `disabled: boolean`; `readOnly: boolean`; `isLoading: boolean` — muestra Spinner en el toggle; `checkedContent`/`unCheckedContent: ReactNode` — contenido según estado; `switcherClass: string` — clase de color (default `bg-primary`); `name: string`.
- **Variantes/sub-componentes**: sin compound; estados: checked, disabled, loading.
- **Ejemplo**:
```tsx
import Switcher from '@/components/ui/Switcher'
import type { ChangeEvent } from 'react'

const Basic = () => {
    const onSwitcherToggle = (val: boolean, e: ChangeEvent) => {
        console.log(val, e)
    }

    return (
        <div>
            <Switcher defaultChecked onChange={onSwitcherToggle} />
        </div>
    )
}

export default Basic
```

## Table
- **Propósito**: Tabla estilizada compuesta por subcomponentes semánticos; base para tablas de datos.
- **Import**: `import Table from '@/components/ui/Table'` (default; también `{ Table }`).
- **Props clave** (Table): `hoverable: boolean` — resalta filas al pasar (default true); `compact: boolean` — densidad reducida; `cellBorder: boolean` — bordes de celda; `overflow: boolean` — wrapper con scroll horizontal (default true); `asElement: ElementType` — render como `table` (default) o flex. Subcomponentes aceptan props HTML nativas (`Tr`, `Th`, `Td`, etc.). `Sorter`: `sort: boolean | 'asc' | 'desc'` — ícono de orden.
- **Variantes/sub-componentes**: compound — `Table.THead`, `Table.TBody`, `Table.TFoot`, `Table.Tr`, `Table.Th`, `Table.Td`, `Table.Sorter`.
- **Ejemplo**:
```tsx
import Table from '@/components/ui/Table'

const { Tr, Th, Td, THead, TBody } = Table

const Simple = () => {
    return (
        <Table>
            <THead>
                <Tr>
                    <Th>Company</Th>
                    <Th>Contact</Th>
                    <Th>Country</Th>
                </Tr>
            </THead>
            <TBody>
                <Tr>
                    <Td>Alfreds Futterkiste</Td>
                    <Td>Maria Anders</Td>
                    <Td>Germany</Td>
                </Tr>
            </TBody>
        </Table>
    )
}

export default Simple
```

## Tabs
- **Propósito**: Conjunto de pestañas navegables con contenido conmutable, controlado o no controlado.
- **Import**: `import Tabs from '@/components/ui/Tabs'` y `const { TabList, TabNav, TabContent } = Tabs`
- **Props clave** (`Tabs`): `value?: TabsValue` / `defaultValue?: TabsValue` — pestaña activa (controlada/no controlada); `onChange?: (tabValue) => void` — callback al cambiar; `variant?: 'underline' | 'pill'` — estilo (default `underline`).
- **Variantes/sub-componentes**: compound — `Tabs.TabList`, `Tabs.TabNav` (props: `value` requerido, `disabled?`, `icon?: string | ReactNode`), `Tabs.TabContent` (prop `value` requerido; solo renderiza hijos si está activa). Variantes visuales `underline` y `pill`.
- **Ejemplo**:
```tsx
import Tabs from '@/components/ui/Tabs'

const { TabNav, TabList, TabContent } = Tabs

const Default = () => (
    <Tabs defaultValue="tab1">
        <TabList>
            <TabNav value="tab1">Home</TabNav>
            <TabNav value="tab2">Profile</TabNav>
        </TabList>
        <div className="p-4">
            <TabContent value="tab1"><p>Contenido Home</p></TabContent>
            <TabContent value="tab2"><p>Contenido Profile</p></TabContent>
        </div>
    </Tabs>
)
```

## Tag
- **Propósito**: Etiqueta/badge para mostrar estados, categorías o metadatos, con afijos opcionales.
- **Import**: `import Tag from '@/components/ui/Tag'`
- **Props clave**: `children: ReactNode` — contenido; `prefix?: boolean | ReactNode` — afijo inicial (si `true` pinta un punto, si es nodo lo renderiza); `suffix?: boolean | ReactNode` — afijo final; `prefixClass?: string` / `suffixClass?: string` — clases para colorear los puntos afijo; `className?: string` — color/estilo del tag (color por defecto gris claro/oscuro).
- **Variantes/sub-componentes**: sin sub-componentes; "variantes" vía `className` (colores) y `prefix`/`suffix` (punto booleano vs icono).
- **Ejemplo**:
```tsx
import Tag from '@/components/ui/Tag'
import { HiX } from 'react-icons/hi'

const Demo = () => (
    <div className="flex gap-2">
        <Tag>Basic Tag</Tag>
        <Tag prefix prefixClass="bg-emerald-500">Activo</Tag>
        <Tag suffix={<HiX className="ml-1 cursor-pointer" />}>Cerrable</Tag>
    </div>
)
```

## TimeInput
- **Propósito**: Campo de entrada de hora con segmentos (horas/minutos/segundos/am-pm) y navegación automática entre ellos.
- **Import**: `import TimeInput from '@/components/ui/TimeInput'`
- **Props clave**: `value?` / `defaultValue?: Date | null` — valor (controlado/no); `onChange?: (value: Date | null) => void`; `format?: '12' | '24'` (default `24`); `showSeconds?: boolean` — muestra segundos; `clearable?: boolean` (default `true`) — botón de limpiar; `disabled?`, `invalid?`, `size?: ControlSize`; `amLabel?`/`pmLabel?`/`amPmPlaceholder?` — etiquetas AM/PM; `prefix?`/`suffix?: ReactNode` — afijos (suffix default reloj).
- **Variantes/sub-componentes**: `TimeInput.TimeInputRange` — rango de dos horas; props extra: `defaultValue?: [Date|null, Date|null]`, `seperator?: string` (default `~`), `clearable?` (default `false`).
- **Ejemplo**:
```tsx
import TimeInput from '@/components/ui/TimeInput'

const Demo = () => <TimeInput format="12" showSeconds />
```

## Timeline
- **Propósito**: Línea de tiempo vertical para listar eventos en orden cronológico con conectores.
- **Import**: `import Timeline from '@/components/ui/Timeline'`
- **Props clave** (`Timeline`): hereda `CommonProps` (`className`, `children`). Calcula automáticamente cuál item es el último (`isLast`) y lo propaga a los hijos.
- **Variantes/sub-componentes**: `Timeline.Item` — props: `media?: string | ReactNode` (icono/avatar del punto; si falta usa un punto por defecto), `isLast?: boolean` (inyectado automáticamente, oculta el conector), `className?`.
- **Ejemplo**:
```tsx
import Timeline from '@/components/ui/Timeline'

const Demo = () => (
    <Timeline>
        <Timeline.Item>Breakfast - 09:00</Timeline.Item>
        <Timeline.Item>Lunch - 12:30</Timeline.Item>
        <Timeline.Item>Dinner - 19:00</Timeline.Item>
    </Timeline>
)
```

## Toast
- **Propósito**: API imperativa (`toast.push`) para mostrar notificaciones flotantes temporales, normalmente con el componente `Notification`.
- **Import**: `import { toast, Notification } from '@/components/ui'`
- **Props clave** (API `toast`): `toast.push(message: ReactNode, options?: ToastProps): string | undefined` — encola un toast y devuelve su key; `toast.remove(key: string)` — elimina uno; `toast.removeAll()` — elimina todos. `options` clave: `placement` (default `'top-end'`), `offsetX`/`offsetY` (default `30`), `transitionType` (`'scale'`), `block?: boolean`.
- **Props clave** (`Notification`): `title?: string`; `type?: 'success' | 'warning' | 'danger' | 'info'` — icono de estado; `customIcon?: ReactNode`; `duration?: number` (ms, default `3000`, `0` = persistente); `closable?: boolean` (default `false`); `width?: number | string` (default `350`); `onClose?`.
- **Variantes/sub-componentes**: el `message` puede ser texto o cualquier nodo; el patrón estándar es pasar un `<Notification />`.
- **Ejemplo**:
```tsx
import { toast, Notification } from '@/components/ui'

function openNotification() {
    toast.push(
        <Notification title="Mensaje" type="success">
            El gato se sentó sobre la alfombra.
        </Notification>,
        { placement: 'top-center' },
    )
}
```

## Tooltip
- **Propósito**: Globo informativo que aparece al pasar el cursor o enfocar el elemento envuelto.
- **Import**: `import Tooltip from '@/components/ui/Tooltip'`
- **Props clave**: `title: string | ReactNode` — contenido del tooltip (requerido); `placement?: ArrowPlacement` — posición (default `'top'`); `isOpen?: boolean` — abierto por defecto/controlado (default `false`); `disabled?: boolean` — desactiva la apertura; `wrapperClass?: string` — clase del span contenedor; `className?` — estilo del globo.
- **Variantes/sub-componentes**: sin sub-componentes; usa `@floating-ui/react` (auto-flip/shift) y flecha integrada. Variación por `placement` (top/bottom/left/right y derivados).
- **Ejemplo**:
```tsx
import Tooltip from '@/components/ui/Tooltip'

const Demo = () => (
    <Tooltip title="Mensaje del tooltip">
        <span className="cursor-pointer">Pasá el cursor</span>
    </Tooltip>
)
```

## Typography
- **Propósito**: Estilos tipográficos aplicados por clases utilitarias (no es un componente Ecme): encabezados, pesos, tamaños y listas.
- **Import**: N/A — clases utilitarias Tailwind (usar etiquetas HTML `h1`-`h6`, `p`, `ul`, `ol` y clases).
- **Props clave**: N/A.
- **Variantes/sub-componentes**: encabezados `h1`-`h6` (estilados globalmente); clase `heading-text`; pesos `font-light` / `font-normal` / `font-medium` / `font-semibold` / `font-bold`; tamaños `text-*` (`text-sm`, `text-base`, ...); listas `list-disc` / `list-decimal`; utilidades de overflow/prose.
- **Ejemplo**:
```tsx
const Demo = () => (
    <div className="flex flex-col gap-4">
        <h1>Heading 1</h1>
        <h4>Heading 4</h4>
        <p className="font-semibold heading-text">Texto en seminegrita</p>
        <ul className="list-disc ltr:pl-4">
            <li>Elemento de lista</li>
        </ul>
    </div>
)
```

## Upload
- **Propósito**: Selector/cargador de archivos con soporte de botón, arrastrar y soltar, y lista de archivos.
- **Import**: `import Upload from '@/components/ui/Upload'`
- **Props clave**: `accept?: string` — tipos MIME permitidos; `multiple?: boolean`; `draggable?: boolean` — modo arrastrar y soltar; `disabled?: boolean`; `uploadLimit?: number` — máximo de archivos; `showList?: boolean` (default `true`) — muestra la lista; `tip?: string | ReactNode` — texto de ayuda; `beforeUpload?: (files, fileList) => boolean | string` — validación (string = mensaje de error en toast); `onChange?: (files, fileList) => void`; `onFileRemove?: (files) => void`; `fileList?: File[]` — controlado; `fileListClass?`/`fileItemClass?`.
- **Variantes/sub-componentes**: sin botón propio cuando hay `children`; modo `draggable` muestra zona de arrastre; errores de validación se notifican vía `toast` + `Notification`.
- **Ejemplo**:
```tsx
import Upload from '@/components/ui/Upload'

const Demo = () => <Upload />
```
