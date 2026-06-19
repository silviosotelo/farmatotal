# Ecme — Shared Components

Catálogo de los componentes compartidos del template Ecme (admin), ubicados en
`src/components/shared/`. La fuente de verdad para las props es cada `.tsx`
(o la carpeta con su `index.tsx` para `GanttChart`, `Masonry`, `RichTextEditor`).
Los re-exports están en `src/components/shared/index.tsx`, por lo que también
funciona `import { X } from '@/components/shared'`.

## Índice

| Componente | Propósito |
|---|---|
| [AbbreviateNumber](#abbreviatenumber) | Formatea números grandes con sufijo K/M. |
| [ActionLink](#actionlink) | Enlace de texto con color de tema (Router o `<a>`). |
| [AdaptiveCard](#adaptivecard) | `Card` que se adapta al layout (quita borde/padding). |
| [Affix](#affix) | Fija (sticky) contenido al pasar un offset de scroll. |
| [AuthorityCheck](#authoritycheck) | Renderiza hijos solo si el usuario tiene el rol. |
| [CalendarView](#calendarview) | Calendario mes/semana/día con eventos (FullCalendar). |
| [Chart](#chart) | Wrapper de ApexCharts con defaults por tipo. |
| [ConfirmDialog](#confirmdialog) | Diálogo de confirmación con icono de estado. |
| [Container](#container) | Contenedor centrado polimórfico. |
| [CustomFormatInput](#customformatinput) | Input numérico con formato/máscara personalizada. |
| [DataTable](#datatable) | Tabla con paginación, orden, selección y estados. |
| [DebounceInput](#debounceinput) | Input con `onChange` debounced (búsquedas). |
| [DoubleSidedImage](#doublesidedimage) | Imagen que cambia según tema claro/oscuro. |
| [EllipsisButton](#ellipsisbutton) | Botón de "más opciones" (tres puntos). |
| [GanttChart](#ganttchart) | Diagrama de Gantt con columnas y colores. |
| [GrowShrinkValue](#growshrinkvalue) | Valor con flecha verde/rojo según signo. |
| [IconText](#icontext) | Icono + texto alineados horizontalmente. |
| [ImageGallery](#imagegallery) | Lightbox/galería de imágenes por índice. |
| [Loading](#loading) | Spinner mientras carga; luego los children. |
| [Masonry](#masonry) | Layout masonry de columnas balanceadas. |
| [MediaSkeleton](#mediaskeleton) | Skeleton de item media (avatar + texto). |
| [NavToggle](#navtoggle) | Icono hamburguesa según estado abierto/cerrado. |
| [NumericInput](#numericinput) | Input numérico con miles/decimales. |
| [OtpInput](#otpinput) | Campo OTP multi-celda. |
| [PasswordInput](#passwordinput) | Input de contraseña con mostrar/ocultar. |
| [PatternInput](#patterninput) | Input con formato por patrón fijo. |
| [PresetSegmentItemOption](#presetsegmentitemoption) | Tarjeta opción seleccionable con check. |
| [RegionMap](#regionmap) | Mapa mundial con regiones y tooltip por país. |
| [RichTextEditor](#richtexteditor) | Editor WYSIWYG (tiptap). |
| [StickyFooter](#stickyfooter) | Footer sticky al borde inferior del viewport. |
| [SyntaxHighlighter](#syntaxhighlighter) | Resalta bloques de código. |
| [UsersAvatarGroup](#usersavatargroup) | Grupo de avatares con tooltip de nombre. |

---

## AbbreviateNumber
- **Propósito**: Formatea un número grande añadiendo sufijo K (miles) o M (millones).
- **Import**: `import AbbreviateNumber from '@/components/shared/AbbreviateNumber'`
- **Props clave**: `value: number` — número a formatear; >=1.000.000 → "1.2M", >=1.000 → "1.5K", menores se muestran enteros.
- **Variantes/notas**: Sin dependencias externas; renderiza un fragmento de texto plano (un decimal con `toFixed(1)`).
- **Ejemplo**:
```tsx
<AbbreviateNumber value={1250000} /> // 1.3M
```

## ActionLink
- **Propósito**: Enlace de texto con color de tema y subrayado al hover; usa React Router o `<a>` nativo.
- **Import**: `import ActionLink from '@/components/shared/ActionLink'`
- **Props clave**: `to?: string` — ruta interna (renderiza `<Link>`); `href?: string` — URL externa (renderiza `<a>`); `themeColor?: boolean` — aplica `text-primary` (default true); `reloadDocument?: boolean` — fuerza recarga. Hereda atributos de `<a>`.
- **Variantes/notas**: Si hay `to` usa `Link` de `react-router`, si no usa ancla nativa.
- **Ejemplo**:
```tsx
<ActionLink to="/productos">Ver productos</ActionLink>
```

## AdaptiveCard
- **Propósito**: Wrapper de `Card` que se adapta al layout (quita borde/fondo y padding cuando el modo adaptativo está activo).
- **Import**: `import AdaptiveCard from '@/components/shared/AdaptiveCard'`
- **Props clave**: Hereda todas las `CardProps` (`className`, `bodyClass`, etc.). Lee `adaptiveCardActive` del hook `useLayout`.
- **Variantes/notas**: Cuando `adaptiveCardActive` es true añade `border-none dark:bg-transparent` y `p-0` al body.
- **Ejemplo**:
```tsx
<AdaptiveCard>Contenido</AdaptiveCard>
```

## Affix
- **Propósito**: Fija (sticky) su contenido al hacer scroll una vez superado un offset.
- **Import**: `import Affix from '@/components/shared/Affix'`
- **Props clave**: `offset?: number` — distancia en px desde el top a la que se vuelve `position: fixed` (default 0); más `className` y `children` de `CommonProps`.
- **Variantes/notas**: Usa `classnames`; escucha `scroll` con `requestAnimationFrame`; contenedor con `z-10`.
- **Ejemplo**:
```tsx
<Affix offset={60}><Toolbar /></Affix>
```

## AuthorityCheck
- **Propósito**: Renderiza sus hijos solo si el usuario tiene alguno de los roles requeridos.
- **Import**: `import AuthorityCheck from '@/components/shared/AuthorityCheck'`
- **Props clave**: `userAuthority: string[]` — roles del usuario; `authority: string[]` — roles permitidos; `children`. Usa el hook `useAuthority` para el match.
- **Variantes/notas**: Devuelve `children` o `null`; base del control de acceso por rol.
- **Ejemplo**:
```tsx
<AuthorityCheck userAuthority={user.authority} authority={['admin']}>
  <DeleteButton />
</AuthorityCheck>
```

## CalendarView
- **Propósito**: Calendario completo (mes/semana/día) con eventos coloreados.
- **Import**: `import CalendarView from '@/components/shared/CalendarView'`
- **Props clave**: Extiende `CalendarOptions` de FullCalendar (`events`, `editable`, `selectable`, callbacks…); `wrapperClass?: string`; `eventColors?: (colors) => EventColors` — personaliza el mapa de colores. El color de cada evento se toma de `extendedProps.eventColor`.
- **Variantes/notas**: Libs: `@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`. Vista inicial `dayGridMonth`; 6 colores predefinidos.
- **Ejemplo**:
```tsx
<CalendarView events={events} editable selectable />
```

## Chart
- **Propósito**: Wrapper de ApexCharts con opciones por defecto según tipo y soporte RTL/móvil.
- **Import**: `import Chart from '@/components/shared/Chart'`
- **Props clave**: `series?` — datos ApexCharts; `type?: 'line'|'bar'|'area'|'donut'|'radar'` (default 'line'); `xAxis?: any` — categorías; `customOptions?: ApexOptions` — merge sobre defaults; `width/height`; `donutTitle`/`donutText` — etiqueta central del donut; `direction?: Direction`.
- **Variantes/notas**: Libs: `react-apexcharts` + `apexcharts`. Toma defaults de `@/configs/chart.config`; ajusta la leyenda en RTL y móvil.
- **Ejemplo**:
```tsx
<Chart type="bar" series={data} xAxis={['Ene','Feb']} height={320} />
```

## ConfirmDialog
- **Propósito**: Diálogo de confirmación con icono de estado y botones Cancelar/Confirmar.
- **Import**: `import ConfirmDialog from '@/components/shared/ConfirmDialog'`
- **Props clave**: Extiende `DialogProps`; `type?: 'info'|'success'|'warning'|'danger'` (default 'info') — define el icono/avatar; `title?`; `confirmText?`/`cancelText?` (default 'Confirm'/'Cancel'); `onConfirm?`/`onCancel?`; `confirmButtonProps?`/`cancelButtonProps?: ButtonProps`.
- **Variantes/notas**: Iconos de `react-icons/hi`; usa `Dialog`, `Avatar` y `Button` del UI kit.
- **Ejemplo**:
```tsx
<ConfirmDialog isOpen={open} type="danger" title="Eliminar"
  onConfirm={remove} onCancel={close}>¿Seguro?</ConfirmDialog>
```

## Container
- **Propósito**: Contenedor centrado (`container mx-auto`) con elemento HTML configurable.
- **Import**: `import Container from '@/components/shared/Container'`
- **Props clave**: `asElement?: ElementType` — etiqueta a renderizar (default 'div'); `ref?: Ref<HTMLElement>`; más `className`/`children` de `CommonProps`.
- **Variantes/notas**: Usa `classnames`; simple wrapper de layout.
- **Ejemplo**:
```tsx
<Container asElement="section">…</Container>
```

## CustomFormatInput
- **Propósito**: Input numérico con formato personalizado (máscaras) y prefijo/sufijo.
- **Import**: `import CustomFormatInput from '@/components/shared/CustomFormatInput'`
- **Props clave**: Combina `InputProps` (sin `prefix`/`suffix`) + `NumberFormatBaseProps`; `inputPrefix?`/`inputSuffix?: ReactNode`; `format?: (value) => string`; `removeFormatting?: (value) => string`; `getCaretBoundary?`; `onValueChange`.
- **Variantes/notas**: Lib: `react-number-format` (`NumberFormatBase`) sobre el `Input` del UI kit; trae helpers de caret y de limpieza por defecto.
- **Ejemplo**:
```tsx
<CustomFormatInput value={val} format={maskCard} onValueChange={(v)=>set(v.value)} />
```

## DataTable
- **Propósito**: Tabla de datos con paginación, ordenamiento, selección y estados de carga/sin datos.
- **Import**: `import DataTable from '@/components/shared/DataTable'`
- **Props clave**: `columns: ColumnDef<T>[]`; `data?`; `loading?`; `noData?`; `selectable?: boolean`; `pagingData?: {total, pageIndex, pageSize}`; `pageSizes?: number[]` (default [10,25,50,100]); callbacks `onPaginationChange`, `onSelectChange`, `onSort(OnSortParam)`, `onCheckBoxChange`, `onIndeterminateCheckBoxChange`; `checkboxChecked?`/`indeterminateCheckboxChecked?`; `ref` expone `resetSorting`/`resetSelected`.
- **Variantes/notas**: Lib: `@tanstack/react-table` (manual pagination/sorting). Reexporta `ColumnDef, Row, CellContext`; skeleton de carga y `FileNotFound` para vacío.
- **Ejemplo**:
```tsx
<DataTable columns={cols} data={rows} loading={loading}
  pagingData={{total, pageIndex, pageSize}} onSort={handleSort}
  onPaginationChange={setPage} />
```

## DebounceInput
- **Propósito**: Input que dispara `onChange` con retardo (debounce), ideal para búsquedas.
- **Import**: `import DebounceInput from '@/components/shared/DebouceInput'` (archivo con typo `DebouceInput.tsx`)
- **Props clave**: Extiende `InputProps`; `wait?: number` — ms de espera (default 500); `ref?: Ref<HTMLInputElement>`. El `onChange` original se invoca debounced.
- **Variantes/notas**: Usa el hook `useDebounce` sobre el `Input` del UI kit.
- **Ejemplo**:
```tsx
<DebounceInput placeholder="Buscar" wait={400} onChange={(e)=>search(e.target.value)} />
```

## DoubleSidedImage
- **Propósito**: Imagen que cambia de fuente según el tema claro/oscuro.
- **Import**: `import DoubleSidedImage from '@/components/shared/DoubleSidedImage'`
- **Props clave**: `src` — imagen en modo claro; `darkModeSrc: string` — imagen en modo oscuro; `alt?` (default ''); hereda atributos de `<img>`.
- **Variantes/notas**: Lee `mode` de `useThemeStore` (Zustand) y compara con `THEME_ENUM.MODE_DARK`.
- **Ejemplo**:
```tsx
<DoubleSidedImage src="/light.png" darkModeSrc="/dark.png" alt="Logo" />
```

## EllipsisButton
- **Propósito**: Botón de "más opciones" con icono de tres puntos.
- **Import**: `import EllipsisButton from '@/components/shared/EllipsisButton'`
- **Props clave**: Es `ButtonProps`; por defecto `shape='circle'`, `variant='plain'`, `size='xs'`. Cualquier prop de `Button` (p.ej. `onClick`) lo sobreescribe.
- **Variantes/notas**: Icono `TbDots` de `react-icons/tb` sobre el `Button` del UI kit.
- **Ejemplo**:
```tsx
<EllipsisButton onClick={openMenu} />
```

## GanttChart
- **Propósito**: Diagrama de Gantt con columnas extra, colores por variante y tooltip/cabecera personalizados.
- **Import**: `import GanttChart, { ViewMode } from '@/components/shared/GanttChart'`
- **Props clave**: Extiende `GanttProps` de gantt-task-react; `tasks: ExtendedTask<T>[]` (Task + `barVariant?`); `viewMode?: ViewMode` (default `Day`); `extraColumns?: Array<{header, cell}>`; `colorsMap?: Record<string,string>`; `showArrow?: boolean`. Reexporta tipos `Task`, `ExtendedTask` y `ViewMode`.
- **Variantes/notas**: Libs: `gantt-task-react` (componente `Gantt`) y `@visx/pattern` (patrón "today"). Componentes locales `TaskListTable`/`TaskListHeader`/`TooltipContent` y `tasksPreProcess` para aplicar colores.
- **Ejemplo**:
```tsx
<GanttChart tasks={tasks} viewMode={ViewMode.Week} colorsMap={{ done:'#22c55e' }} />
```

## GrowShrinkValue
- **Propósito**: Muestra un valor con flecha en color verde/rojo según sea positivo o negativo.
- **Import**: `import GrowShrinkValue from '@/components/shared/GrowShrinkValue'`
- **Props clave**: `value?: number` (default 0) — define signo/estilo; `showIcon?: boolean` (default true); `prefix?`/`suffix?: ReactNode`; `positiveIcon?`/`negativeIcon?` — iconos custom; `positiveClass?`/`negativeClass?` — clases por signo; `className?`; `ref?`.
- **Variantes/notas**: Iconos por defecto `HiArrowUp`/`HiArrowDown` (react-icons/hi); aplica `text-success`/`text-error`. Si `value===0` no muestra icono.
- **Ejemplo**:
```tsx
<GrowShrinkValue value={12.5} suffix="%" />
```

## IconText
- **Propósito**: Renderiza un icono junto a un texto/children alineados horizontalmente.
- **Import**: `import IconText from '@/components/shared/IconText'`
- **Props clave**: `icon?: ReactNode | string` — icono a mostrar; `asElement?: ElementType` — etiqueta contenedora (por defecto `'span'`); hereda `className` y `children` de `CommonProps`.
- **Variantes/notas**: Wrapper simple con clases `flex items-center gap-2`; usa util `classNames`.
- **Ejemplo**:
```tsx
<IconText icon={<HiOutlineUser />}>Usuario</IconText>
```

## ImageGallery
- **Propósito**: Lightbox/galería de imágenes controlado por índice.
- **Import**: `import ImageGallery from '@/components/shared/ImageGallery'`
- **Props clave**: `index?: number` — slide activo; abierto cuando `index >= 0` (default `-1`); `slides` — array de slides (de `LightboxProps`); `onClose?: () => void` — cierre. Extiende `Partial<LightboxProps>`.
- **Variantes/notas**: Usa la lib `yet-another-react-lightbox` (importa sus estilos CSS).
- **Ejemplo**:
```tsx
<ImageGallery index={idx} onClose={() => setIdx(-1)} slides={[{ src: '/a.jpg' }]} />
```

## Loading
- **Propósito**: Muestra un spinner mientras `loading` es true; al terminar renderiza los children.
- **Import**: `import Loading from '@/components/shared/Loading'`
- **Props clave**: `loading: boolean` — estado de carga; `type?: 'default' | 'cover'` — cubre el contenido con overlay en `'cover'`; `asElement?: ElementType` (default `'div'`); `customLoader?: ReactNode` — loader alternativo; `spinnerClass?: string`.
- **Variantes/notas**: `cover` posiciona el spinner sobre los children con fondo semitransparente; usa `Spinner` de `ui`.
- **Ejemplo**:
```tsx
<Loading loading={isLoading}>{contenido}</Loading>
```

## Masonry
- **Propósito**: Layout tipo masonry (columnas balanceadas) polimórfico.
- **Import**: `import { Masonry } from '@/components/shared/Masonry'` (export nombrado, no default)
- **Props clave**: `columns?: number | BreakPointSpec` — nº de columnas (responsive vía record/array de breakpoints); `gap?: number` — separación; `asElement?: ElementType` (default `'div'`); `columnProps?` — props por columna; `ref?`.
- **Variantes/notas**: Hook interno `useMasonry` distribuye children; provee `MasonryItemContext` con `{ column, position }`.
- **Ejemplo**:
```tsx
<Masonry columns={3} gap={16}>{items.map(i => <Card key={i.id} />)}</Masonry>
```

## MediaSkeleton
- **Propósito**: Placeholder skeleton de un item tipo media (avatar + título + texto).
- **Import**: `import MediaSkeleton from '@/components/shared/loaders/MediaSkeleton'` (está en la subcarpeta `loaders/`)
- **Props clave**: `showAvatar?: boolean` (default `true`); `avatarProps?: SkeletonProps` — skeleton circular; `titleProps?: SkeletonProps` (default width 40%); `textProps?: SkeletonProps` (default width 20%).
- **Variantes/notas**: Compone el `Skeleton` de `@/components/ui/Skeleton`.
- **Ejemplo**:
```tsx
<MediaSkeleton showAvatar />
```

## NavToggle
- **Propósito**: Icono de menú hamburguesa que alterna según estado abierto/cerrado.
- **Import**: `import NavToggle from '@/components/shared/NavToggle'`
- **Props clave**: `toggled?: boolean` — muestra `HiOutlineMenu` si true, `HiOutlineMenuAlt2` si false; hereda `className` de `CommonProps`.
- **Variantes/notas**: Puramente presentacional (no maneja el click); iconos de `react-icons/hi`.
- **Ejemplo**:
```tsx
<NavToggle toggled={sideNavCollapse} />
```

## NumericInput
- **Propósito**: Input numérico con formato (miles, decimales) basado en el `Input` de UI.
- **Import**: `import NumericInput from '@/components/shared/NumericInput'`
- **Props clave**: Combina `InputProps` (sin `prefix`/`suffix`) + `NumericFormatProps`; `inputPrefix?`/`inputSuffix?: string | ReactNode` — afijos; `onValueChange?` — callback con valores formateados/numéricos (de react-number-format).
- **Variantes/notas**: Usa `NumericFormat` de la lib `react-number-format` con `customInput`.
- **Ejemplo**:
```tsx
<NumericInput thousandSeparator value={amount} onValueChange={(v) => setAmount(v.value)} />
```

## OtpInput
- **Propósito**: Campo de entrada OTP de múltiples celdas (un input por dígito).
- **Import**: `import OtpInput from '@/components/shared/OtpInput'`
- **Props clave**: `length?: number` (default `6`); `value?: string`; `onChange?: (value: string) => void`; `disabled?`, `autoFocus?`, `invalid?: boolean`, `placeholder?`, `inputClass?`, `className?`.
- **Variantes/notas**: Maneja teclado (Backspace/flechas), foco automático y pegado (solo dígitos); celdas de 58x58px.
- **Ejemplo**:
```tsx
<OtpInput length={6} value={otp} onChange={setOtp} />
```

## PasswordInput
- **Propósito**: Input de contraseña con botón para mostrar/ocultar el texto.
- **Import**: `import PasswordInput from '@/components/shared/PasswordInput'`
- **Props clave**: Extiende `InputProps`; `onVisibleChange?: (visible: boolean) => void` — notifica cambio de visibilidad; `ref?: Ref<HTMLInputElement>`.
- **Variantes/notas**: Alterna `type` password/text con iconos `HiOutlineEye`/`HiOutlineEyeOff` en el suffix.
- **Ejemplo**:
```tsx
<PasswordInput placeholder="Contraseña" {...field} />
```

## PatternInput
- **Propósito**: Input con formato por patrón fijo (teléfonos, tarjetas, fechas).
- **Import**: `import PatternInput from '@/components/shared/PatternInput'`
- **Props clave**: Combina `InputProps` (sin `prefix`/`suffix`) + `PatternFormatProps`; `format` (de la lib, ej. `'### ### ###'`); `inputPrefix?`/`inputSuffix?`; `onValueChange?`.
- **Variantes/notas**: Usa `PatternFormat` de `react-number-format` con `customInput`.
- **Ejemplo**:
```tsx
<PatternInput format="#### #### #### ####" value={card} onValueChange={(v) => setCard(v.value)} />
```

## PresetSegmentItemOption
- **Propósito**: Tarjeta seleccionable (opción de segmento) con estado activo y check.
- **Import**: `import PresetSegmentItemOption from '@/components/shared/PresetSegmentItemOption'`
- **Props clave**: `active: boolean` — resalta con ring/borde primario; `customCheck?: string | ReactNode` — indicador de selección personalizado; `defaultGutter?: boolean` (default `true`); `disabled?`, `hoverable?`; `onSegmentItemClick?: (event) => void`; `ref?`.
- **Variantes/notas**: Por defecto muestra `HiCheckCircle` cuando está activo; estilos con `classNames`.
- **Ejemplo**:
```tsx
<PresetSegmentItemOption active={sel} hoverable onSegmentItemClick={onSel}>Plan Pro</PresetSegmentItemOption>
```

## RegionMap
- **Propósito**: Mapa mundial con regiones resaltables, tooltip de valor por país y marcadores.
- **Import**: `import RegionMap from '@/components/shared/RegionMap'`
- **Props clave**: `data: { name: string; value?: string|number; color?: string }[]`; `mapSource?: string | Record<string,any> | string[]` (default mapa mundial incluido); `valuePrefix?`/`valueSuffix?: string`; `marker?: (Marker) => ReactNode`; `hoverable?: boolean` (default `true`).
- **Variantes/notas**: Libs `react-simple-maps` (ComposableMap/Geographies/Marker), `@visx/pattern` (PatternCircles) y `react-tooltip`; usa JSON `world-countries-sans-antarctica`.
- **Ejemplo**:
```tsx
<RegionMap data={[{ name: 'Paraguay', value: 120 }]} valueSuffix=" ventas" />
```

## RichTextEditor
- **Propósito**: Editor de texto enriquecido WYSIWYG con barra de herramientas.
- **Import**: `import RichTextEditor from '@/components/shared/RichTextEditor'`
- **Props clave**: `content?: string` — HTML inicial; `onChange?: ({ text, html, json }) => void`; `invalid?: boolean`; `customToolBar?: (editor, components) => ReactNode` — barra personalizada; `customEditor?: Editor | null` — instancia tiptap externa; `editorContentClass?`, `ref?`.
- **Variantes/notas**: Construido con **tiptap** (`@tiptap/react` + `@tiptap/starter-kit`); incluye ToolButtons (bold, italic, headings, listas, code, etc.).
- **Ejemplo**:
```tsx
<RichTextEditor content={html} onChange={({ html }) => setHtml(html)} />
```

## StickyFooter
- **Propósito**: Footer que se vuelve sticky cuando llega al borde inferior del viewport.
- **Import**: `import StickyFooter from '@/components/shared/StickyFooter'`
- **Props clave**: `stickyClass?: string` — clases al estar fijo; `defaultClass?: string` — clases en estado normal; `children?: ReactNode | ((isSticky: boolean) => ReactNode)` — render prop opcional. Extiende `HTMLAttributes<HTMLDivElement>` (sin `children`).
- **Variantes/notas**: Detecta el estado con `IntersectionObserver` (threshold 1) y `useDebounce`.
- **Ejemplo**:
```tsx
<StickyFooter stickyClass="shadow-md" className="p-4">{(s) => <Button>{s ? 'Fijo' : 'Guardar'}</Button>}</StickyFooter>
```

## SyntaxHighlighter
- **Propósito**: Resalta bloques de código con tema oscuro.
- **Import**: `import SyntaxHighlighter from '@/components/shared/SyntaxHighlighter'`
- **Props clave**: Hereda todas las props de `react-syntax-highlighter` (`language`, `showLineNumbers`, etc.); `children` — código como string.
- **Variantes/notas**: Usa `Prism` de `react-syntax-highlighter` con estilo `oneDark` predefinido; clase `not-prose text-sm`.
- **Ejemplo**:
```tsx
<SyntaxHighlighter language="tsx">{code}</SyntaxHighlighter>
```

## UsersAvatarGroup
- **Propósito**: Grupo de avatares de usuarios encadenados con tooltip de nombre.
- **Import**: `import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'`
- **Props clave**: `users?: User[]` (`Record<string,string>`); `imgKey?: string` (default `'img'`); `nameKey?: string` (default `'name'`); `onAvatarClick?: (avatar) => void`; `avatarProps?: AvatarProps`, `avatarGroupProps?: AvatarGroupProps`. Extiende `AvatarGroupProps`.
- **Variantes/notas**: Usa `Avatar.Group`/`Avatar`/`Tooltip` de UI; color de fondo aleatorio (`useRandomBgColor`) y acrónimo (`acronym`) cuando no hay imagen.
- **Ejemplo**:
```tsx
<UsersAvatarGroup users={users} nameKey="fullName" imgKey="avatar" onAvatarClick={open} />
```
